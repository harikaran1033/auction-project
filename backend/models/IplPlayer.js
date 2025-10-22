import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
  image: String,
  player: { type: String, required: true },
  role: String,
  team: String,
  battingType:String,
  bowlingType:String,
  teamColor:String,
  nation:{type : String,required : true},
  basePrice:{ type: Number, required: true },
});

const IplPlayer = mongoose.model("IPL", playerSchema);

export default IplPlayer;
