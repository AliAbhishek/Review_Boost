import request from 'supertest';
import app from '../src/app';
import { signAdminToken } from '../src/middleware/auth';
import { Restaurant } from '../src/models/Restaurant';
import { ReviewLog } from '../src/models/ReviewLog';

jest.mock('../src/services/aiService', () => ({
  generateReviews: jest.fn().mockResolvedValue([
    { style: 'casual', text: 'Really loved the Butter Chicken here, super cozy vibe!' },
    { style: 'detailed', text: 'The Butter Chicken was rich and perfectly spiced. Family-friendly atmosphere with attentive staff. The Dal Makhani is a must-try. Highly recommend for a weekend dinner.' },
    { style: 'short', text: 'Best Butter Chicken in town. Will be back!' },
  ]),
}));

const adminToken = signAdminToken();
const authHeader = { Authorization: `Bearer ${adminToken}` };

const baseRestaurant = {
  name: 'Taste of India',
  cuisine: 'North Indian',
  topDishes: ['Butter Chicken', 'Dal Makhani'],
  vibe: 'Family',
  city: 'Delhi',
  state: 'Delhi',
  googleMapsUrl: 'https://maps.google.com/?cid=99999',
  zomatoUrl: 'https://zomato.com/delhi/taste-of-india',
  ownerEmail: 'owner@tasteofindia.com',
  ownerPhone: '+919876543210',
};

async function seedRestaurant(): Promise<{ slug: string; id: string }> {
  const res = await request(app).post('/api/admin/restaurant').set(authHeader).send(baseRestaurant);
  return {
    slug: res.body.data.restaurant.slug as string,
    id: res.body.data.restaurant._id as string,
  };
}

describe('Review — Public Routes', () => {
  describe('GET /api/review/:slug', () => {
    it('returns public restaurant data', async () => {
      const { slug } = await seedRestaurant();

      const res = await request(app).get(`/api/review/${slug}`);

      expect(res.status).toBe(200);
      expect(res.body.data.restaurant.slug).toBe(slug);
      expect(res.body.data.restaurant.ownerEmail).toBeUndefined();
      expect(res.body.data.restaurant.ownerPhone).toBeUndefined();
    });

    it('returns 404 for nonexistent slug', async () => {
      const res = await request(app).get('/api/review/nonexistent-restaurant-xyz');
      expect(res.status).toBe(404);
      expect(res.body.status).toBe('fail');
    });
  });

  describe('POST /api/review/generate', () => {
    it('returns 3 review options for 5-star rating', async () => {
      const { slug } = await seedRestaurant();

      const res = await request(app)
        .post('/api/review/generate')
        .send({ slug, stars: 5 });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.reviews)).toBe(true);
      expect(res.body.data.reviews).toHaveLength(3);
      expect(res.body.data.reviews[0]).toHaveProperty('style');
      expect(res.body.data.reviews[0]).toHaveProperty('text');
    });

    it('returns 3 review options for 2-star rating (stored as private)', async () => {
      const { slug } = await seedRestaurant();

      const res = await request(app)
        .post('/api/review/generate')
        .send({ slug, stars: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.reviews).toHaveLength(3);
    });

    it('returns 400 for invalid stars', async () => {
      const { slug } = await seedRestaurant();
      const res = await request(app)
        .post('/api/review/generate')
        .send({ slug, stars: 6 });

      expect(res.status).toBe(400);
    });

    it('returns 404 for unknown restaurant', async () => {
      const res = await request(app)
        .post('/api/review/generate')
        .send({ slug: 'no-such-place', stars: 4 });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/review/log', () => {
    it('logs a 5-star review as google or zomato', async () => {
      const { slug } = await seedRestaurant();

      const res = await request(app)
        .post('/api/review/log')
        .send({ slug, stars: 5, reviewText: 'Absolutely fantastic!', wasEdited: false });

      expect(res.status).toBe(201);
      expect(['google', 'zomato']).toContain(res.body.data.reviewLog.submittedTo);
    });

    it('logs a 3-star review as private', async () => {
      const { slug } = await seedRestaurant();

      const res = await request(app)
        .post('/api/review/log')
        .send({ slug, stars: 3, reviewText: 'It was okay, food could be better.', wasEdited: true });

      expect(res.status).toBe(201);
      expect(res.body.data.reviewLog.submittedTo).toBe('private');
    });

    it('logs a 1-star review as private', async () => {
      const { slug } = await seedRestaurant();

      const res = await request(app)
        .post('/api/review/log')
        .send({ slug, stars: 1, reviewText: 'Very disappointed.', wasEdited: false });

      expect(res.status).toBe(201);
      expect(res.body.data.reviewLog.submittedTo).toBe('private');
    });

    it('stores the review log in the database', async () => {
      const { slug, id } = await seedRestaurant();

      await request(app)
        .post('/api/review/log')
        .send({ slug, stars: 4, reviewText: 'Great experience!', wasEdited: false });

      const count = await ReviewLog.countDocuments({ restaurantId: id });
      expect(count).toBe(1);
    });

    it('returns 400 for missing reviewText', async () => {
      const { slug } = await seedRestaurant();
      const res = await request(app)
        .post('/api/review/log')
        .send({ slug, stars: 4 });

      expect(res.status).toBe(400);
    });
  });
});
