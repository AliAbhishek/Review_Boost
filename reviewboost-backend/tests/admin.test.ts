import request from 'supertest';
import app from '../src/app';
import { signAdminToken } from '../src/middleware/auth';

const adminToken = signAdminToken();
const authHeader = { Authorization: `Bearer ${adminToken}` };

const baseRestaurant = {
  name: 'Spice Garden',
  cuisine: 'North Indian',
  topDishes: ['Butter Chicken', 'Dal Makhani', 'Naan'],
  vibe: 'Family',
  city: 'Chandigarh',
  state: 'Punjab',
  googleMapsUrl: 'https://maps.google.com/?cid=12345',
  ownerEmail: 'owner@spicegarden.com',
  ownerPhone: '+919876543210',
};

describe('Admin — Restaurant CRUD', () => {
  describe('POST /api/admin/restaurant', () => {
    it('creates a restaurant and auto-generates a slug', async () => {
      const res = await request(app)
        .post('/api/admin/restaurant')
        .set(authHeader)
        .send(baseRestaurant);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.restaurant.slug).toBe('spice-garden-chandigarh');
      expect(res.body.data.restaurant.name).toBe('Spice Garden');
      expect(res.body.data.restaurant.isActive).toBe(true);
    });

    it('appends -2 suffix when slug is already taken', async () => {
      await request(app)
        .post('/api/admin/restaurant')
        .set(authHeader)
        .send(baseRestaurant);

      const res = await request(app)
        .post('/api/admin/restaurant')
        .set(authHeader)
        .send({ ...baseRestaurant, ownerEmail: 'other@example.com' });

      expect(res.status).toBe(201);
      expect(res.body.data.restaurant.slug).toBe('spice-garden-chandigarh-2');
    });

    it('returns 401 without admin token', async () => {
      const res = await request(app).post('/api/admin/restaurant').send(baseRestaurant);
      expect(res.status).toBe(401);
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/admin/restaurant')
        .set(authHeader)
        .send({ name: 'Incomplete' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
    });
  });

  describe('GET /api/admin/restaurants', () => {
    it('returns an array of restaurants', async () => {
      await request(app).post('/api/admin/restaurant').set(authHeader).send(baseRestaurant);

      const res = await request(app).get('/api/admin/restaurants').set(authHeader);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.restaurants)).toBe(true);
      expect(res.body.data.restaurants.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    });

    it('returns 401 without admin token', async () => {
      const res = await request(app).get('/api/admin/restaurants');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/restaurant/:slug', () => {
    it('returns a single restaurant by slug', async () => {
      await request(app).post('/api/admin/restaurant').set(authHeader).send(baseRestaurant);

      const res = await request(app)
        .get('/api/admin/restaurant/spice-garden-chandigarh')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.restaurant.slug).toBe('spice-garden-chandigarh');
    });

    it('returns 404 for unknown slug', async () => {
      const res = await request(app)
        .get('/api/admin/restaurant/nonexistent-restaurant')
        .set(authHeader);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/admin/restaurant/:id', () => {
    it('updates restaurant fields', async () => {
      const created = await request(app)
        .post('/api/admin/restaurant')
        .set(authHeader)
        .send(baseRestaurant);

      const { _id } = created.body.data.restaurant;

      const res = await request(app)
        .put(`/api/admin/restaurant/${_id}`)
        .set(authHeader)
        .send({ cuisine: 'Mughlai', topDishes: ['Biryani', 'Kebabs'] });

      expect(res.status).toBe(200);
      expect(res.body.data.restaurant.cuisine).toBe('Mughlai');
      expect(res.body.data.restaurant.topDishes).toContain('Biryani');
    });

    it('returns 404 for unknown ID', async () => {
      const res = await request(app)
        .put('/api/admin/restaurant/6507f1f77bcf86cd799439aa')
        .set(authHeader)
        .send({ cuisine: 'Chinese' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/admin/restaurant/:id', () => {
    it('soft-deletes by setting isActive to false', async () => {
      const created = await request(app)
        .post('/api/admin/restaurant')
        .set(authHeader)
        .send(baseRestaurant);

      const { _id } = created.body.data.restaurant;

      const res = await request(app)
        .delete(`/api/admin/restaurant/${_id}`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.restaurant.isActive).toBe(false);
    });
  });

  describe('GET /api/admin/stats', () => {
    it('returns aggregate stats', async () => {
      const res = await request(app).get('/api/admin/stats').set(authHeader);

      expect(res.status).toBe(200);
      expect(typeof res.body.data.totalRestaurants).toBe('number');
      expect(typeof res.body.data.totalReviews).toBe('number');
    });
  });
});
