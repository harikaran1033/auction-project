import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
  image: String,
  player: { type: String, required: true },
  role: String,
  team: String,
});

const BBL = mongoose.model("BBL", playerSchema);

export default BBL;
