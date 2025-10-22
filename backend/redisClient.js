/* eslint-disable no-undef */
// redisClient.js
import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

let redis;

if (process.env.REDIS_URL) {
  // 🌍 Connect to Upstash Redis in production
  redis = new Redis(process.env.REDIS_URL, {
    tls: {}, // secure connection
  });
  console.log("✅ Connected to Upstash Redis");
} else {
  // 💻 Connect to local Redis (for development)
  redis = new Redis({
    host: "127.0.0.1",
    port: 6379,
  });
  console.log("✅ Connected to Local Redis");
}

redis.on("error", (err) => console.error("❌ Redis error:", err));

export default redis;
