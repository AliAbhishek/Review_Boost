import request from 'supertest';
import app from '../src/app';
import { signAdminToken } from '../src/middleware/auth';
import { Restaurant } from '../src/models/Restaurant';
import { Owner } from '../src/models/Owner';
import mongoose from 'mongoose';

const adminToken = signAdminToken();
const adminAuthHeader = { Authorization: `Bearer ${adminToken}` };

const baseRestaurant = {
  name: 'The Test Kitchen',
  cuisine: 'Multi-cuisine',
  topDishes: ['Pasta', 'Pizza'],
  vibe: 'Casual',
  city: 'Mumbai',
  state: 'Maharashtra',
  googleMapsUrl: 'https://maps.google.com/?cid=55555',
  ownerEmail: 'testowner@testkitchen.com',
  ownerPhone: '+919988776655',
};

async function seedRestaurantAndGetId(): Promise<string> {
  const res = await request(app)
    .post('/api/admin/restaurant')
    .set(adminAuthHeader)
    .send(baseRestaurant);
  return res.body.data.restaurant._id as string;
}

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('registers a new owner and returns a JWT', async () => {
      const restaurantId = await seedRestaurantAndGetId();

      const res = await request(app).post('/api/auth/register').send({
        name: 'Test Owner',
        email: 'testowner@testkitchen.com',
        password: 'securePassword123',
        restaurantId,
      });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.owner.email).toBe('testowner@testkitchen.com');
    });

    it('returns 409 for duplicate email', async () => {
      const restaurantId = await seedRestaurantAndGetId();

      await request(app).post('/api/auth/register').send({
        name: 'Test Owner',
        email: 'duplicate@test.com',
        password: 'securePassword123',
        restaurantId,
      });

      const res = await request(app).post('/api/auth/register').send({
        name: 'Test Owner 2',
        email: 'duplicate@test.com',
        password: 'securePassword123',
        restaurantId,
      });

      expect(res.status).toBe(409);
    });

    it('returns 404 when restaurantId does not exist', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Ghost Owner',
        email: 'ghost@test.com',
        password: 'securePassword123',
        restaurantId: new mongoose.Types.ObjectId().toString(),
      });

      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid email', async () => {
      const restaurantId = await seedRestaurantAndGetId();
      const res = await request(app).post('/api/auth/register').send({
        name: 'Bad Email',
        email: 'not-an-email',
        password: 'securePassword123',
        restaurantId,
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for short password', async () => {
      const restaurantId = await seedRestaurantAndGetId();
      const res = await request(app).post('/api/auth/register').send({
        name: 'Short Pass',
        email: 'shortpass@test.com',
        password: '123',
        restaurantId,
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    async function createOwner(): Promise<void> {
      const restaurantId = await seedRestaurantAndGetId();
      await request(app).post('/api/auth/register').send({
        name: 'Login Tester',
        email: 'login@test.com',
        password: 'correctPassword99',
        restaurantId,
      });
    }

    it('returns a JWT on valid credentials', async () => {
      await createOwner();
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@test.com',
        password: 'correctPassword99',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.owner.email).toBe('login@test.com');
    });

    it('returns 401 for wrong password', async () => {
      await createOwner();
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@test.com',
        password: 'wrongPassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('fail');
    });

    it('returns 401 for unknown email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@nowhere.com',
        password: 'anyPassword123',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    async function getOwnerToken(): Promise<string> {
      const restaurantId = await seedRestaurantAndGetId();
      await request(app).post('/api/auth/register').send({
        name: 'Me Tester',
        email: 'me@test.com',
        password: 'mePassword99',
        restaurantId,
      });
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'me@test.com', password: 'mePassword99' });
      return loginRes.body.data.token as string;
    }

    it('returns the current owner with a valid JWT', async () => {
      const token = await getOwnerToken();
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.owner.email).toBe('me@test.com');
      expect(res.body.data.owner.passwordHash).toBeUndefined();
    });

    it('returns 401 with no JWT', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 with a tampered JWT', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.fake.payload');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/admin-login', () => {
    it('returns an admin token with correct secret', async () => {
      const res = await request(app)
        .post('/api/auth/admin-login')
        .send({ secret: 'test-admin-secret-key' });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
    });

    it('returns 401 with wrong secret', async () => {
      const res = await request(app)
        .post('/api/auth/admin-login')
        .send({ secret: 'wrong-secret' });

      expect(res.status).toBe(401);
    });
  });
});
