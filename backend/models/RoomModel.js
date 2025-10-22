import mongoose from "mongoose";

const TeamSchema = new mongoose.Schema({
  id: String,
  teamName: String,
  budget: { type: Number, default: 120 },
  players: [
    {
      playerName: String,
      role: String,
      basePrice: Number,
      team: String,
      image: String,
      pricePaid: Number,
      nation: { type: String, default: "" },
    },
  ],
});

const PlayerSchema = new mongoose.Schema({
  playerName: { type: String, required: true },
  role: String,
  basePrice: Number,
  team: String,
  image: String,
  battingType: String,
  bowlingType: String,
  nation: String,
  teamColor:String,
  sold: { type: Boolean, default: false },
  soldTo: { type: String, default: null },
  soldPrice: { type: Number, default: 0 },
});

const RoomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true, required: true },
  noOfTeams: Number,
  host: String,
  league: { type: String, required: true },
  noOfPlayers: { type: Number, required: true },
  foreignPlayers: { type: Number, required: true },
  teamsJoined: [TeamSchema],
  players: [PlayerSchema],
  remainingPlayers: [PlayerSchema],
  currentPlayerIndex: { type: Number, default: 0 },
  highestBid: { type: Number, default: 0 },
  highestBidder: { type: String, default: null },
  lastBidder: { type: String, default: null },
  notInterestedTeams: { type: [String], default: [] },
  auctionStarted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Room = mongoose.model("Room", RoomSchema);
export default Room;
