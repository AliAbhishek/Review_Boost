// Runs before any module loads (jest setupFiles).
// Sets all test environment variables inline — no .env.test file needed.
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.MONGODB_URI = 'mongodb://localhost:27017/reviewboost_test'; // overridden by setup.ts
process.env.JWT_SECRET = 'test-jwt-secret-must-be-at-least-32-characters-long';
process.env.JWT_EXPIRES_IN = '7d';
process.env.CLAUDE_API_KEY = 'test-claude-api-key';
process.env.ADMIN_SECRET = 'test-admin-secret-key';
process.env.ADMIN_EMAIL = 'admin@test.com';
process.env.ADMIN_PASSWORD = 'test-admin-password123';
process.env.LOG_LEVEL = 'error';
process.env.CORS_ORIGIN = '*';
