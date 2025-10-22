import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
  player: { type: String, required: true },
  shortName: String,
  team: String,
  battingType:String,
  bowlingType:String,
  image: String,
  nation:String,
  teamColor:String,
  basePrice:{type:Number,required: true},
  role:String,
});

const Player = mongoose.model("Player", playerSchema);

export default Player;
