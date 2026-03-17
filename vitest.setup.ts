import "@testing-library/jest-dom/vitest";

process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
process.env.DATABASE_URL ??= "postgresql://localhost/test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.AUTH_SECRET ??= "test-secret";
process.env.AUTH_URL ??= "http://localhost:3000";
