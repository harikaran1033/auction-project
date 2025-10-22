/* eslint-disable no-undef */
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import Player from "./models/PlayerModel.js";
// import IplPlayer from "./models/IplPlayer.js"
// import BBL from "./models/BBL.js"

dotenv.config();

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => console.log("❌ MongoDB connection error:", err));

const filePath = path.resolve("data/players.json"); // path to your cleaned JSON

async function seedPlayers() {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // optional: clear existing players
    await Player.deleteMany();

    // insert all players
    await Player.insertMany(data);

    console.log(`✅ Successfully loaded ${data.length} players into MongoDB`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding players:", err);
    process.exit(1);
  }
}

seedPlayers();
