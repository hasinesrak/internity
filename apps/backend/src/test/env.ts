const forced: Record<string, string> = {
  NODE_ENV: "test",
  JWT_SECRET: "test-secret-please-change-32chars",
  MONGODB_URI: "mongodb://127.0.0.1:27017/internity_test",
  BCRYPT_ROUNDS: "4",
  COOKIE_SECURE: "false",
  TRUST_PROXY: "false",
  STAFF_ALLOWED_IPS: "",
  API_SURFACE: "staff",
  AI_GATEWAY_API_KEY: "",
  RESEND_API_KEY: "",
}

const defaults: Record<string, string> = {
  CORS_ORIGIN: "http://localhost:3000",
  APP_URL: "http://localhost:3000",
  STAFF_APP_URL: "http://localhost:3001",
  JWT_EXPIRES_IN: "8h",
  AI_MODEL: "qwen/qwen3.8-27b",
}

for (const [key, value] of Object.entries(forced)) process.env[key] = value
for (const [key, value] of Object.entries(defaults)) {
  if (!process.env[key]) process.env[key] = value
}
