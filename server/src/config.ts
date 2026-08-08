// Centralised environment configuration. Fails fast on missing critical secrets.
import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const isTest = process.env.NODE_ENV === "test";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  // In tests we allow a default secret so the suite runs without a .env file.
  jwtSecret: isTest
    ? process.env.JWT_SECRET ?? "test-secret"
    : required("JWT_SECRET"),
  jwtExpiresIn: "7d",
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  isTest,
};
