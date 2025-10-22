/* eslint-disable no-undef */
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { config } from "dotenv";
import cors from "cors";
import Room from "./models/RoomModel.js";
import Player from "./models/PlayerModel.js";
import IPLPlayer from "./models/IplPlayer.js";
// import BBL from "./models/BBL.js";
import redis from "./redisClient.js";

config();
const app = express();
app.use(express.json());
const server = createServer(app);

const allowedOrigins = [
  "http://localhost:5173",                
  "https://auction-project-chi.vercel.app"  
];

app.use(cors({
  origin: function(origin, callback){
    if(!origin) return callback(null, true); // allow Postman, etc.
    if(!allowedOrigins.includes(origin)){
      return callback(new Error("CORS not allowed"), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin:allowedOrigins,
    methods: ["GET", "POST"],
  },
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

const generateRoomID = (length = 6) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
};

const auctionTimers = {}; // roomId -> timeout

const TIMER_DURATION = 20000; // 20 seconds

async function setAuctionTimer(roomId) {
  const endTime = Date.now() + TIMER_DURATION;
  await redis.set(`auction:${roomId}:endTime`, endTime, "PX", TIMER_DURATION);
  return endTime;
}

async function getAuctionTimer(roomId) {
  const value = await redis.get(`auction:${roomId}:endTime`);
  return value ? parseInt(value) : null;
}

async function clearAuctionTimer(roomId) {
  await redis.del(`auction:${roomId}:endTime`);
}

function getActiveTeams(room) {
  return room.teamsJoined.filter((t) => t.players.length < 15 && t.budget > 0);
}

const leagueLocalNation = {
  IPL: "India",
  BBL: "Australia",
  Hundreds: "England",
  // add more leagues here
};

const normalizeNation = (nation) => (nation || "").toLowerCase().trim();

const countForeignPlayers = (team, localNation) => {
  const local = normalizeNation(localNation);
  return team.players.filter((p) => normalizeNation(p.nation) !== local).length;
};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // --- CREATE ROOM ---
  socket.on(
    "create_room",
    async ({
      noOfTeams,
      teamName,
      league,
      noOfPlayers,
      foreignPlayers,
      budget,
    }) => {
      if (!teamName || !noOfTeams || !league)
        return socket.emit(
          "error_message",
          "Team name, number of teams, and league are required"
        );

      try {
        let roomId;
        let roomExists = true;

        // Keep generating until a unique roomId is found
        while (roomExists) {
          roomId = generateRoomID(); // your random 6-char function
          roomExists = await Room.exists({ roomId });
        }

        let PlayerModel;
        if (league === "IPL") PlayerModel = IPLPlayer;
        else if (league === "Hundreds") PlayerModel = Player;
        else return socket.emit("error_message", "Invalid player type");

        const allPlayers = await PlayerModel.find({
          player: { $exists: true },
        });
        const roomPlayers = allPlayers.map((p) => ({
          playerName: p.player,
          team: p.team || "Unknown",
          basePrice: p.basePrice || 2,
          image: p.image || "",
          role: p.role || "",
          battingType: p.battingType || "",
          bowlingType: p.bowlingType || "",
          nation: p.nation || "",
          teamColor: p.teamColor || "bg-gray-500",
          sold: false,
          soldTo: null,
          soldPrice: 0,
        }));

        const room = new Room({
          roomId,
          noOfTeams,
          league,
          teamsJoined: [{ id: socket.id, teamName, budget, players: [] }],
          players: roomPlayers,
          remainingPlayers: [],
          auctionStarted: false,
          noOfPlayers,
          foreignPlayers: Number(foreignPlayers) || 1,
          currentPlayerIndex: 0,
          highestBid: 0,
          highestBidder: null,
          lastBidder: null,
          notInterestedTeams: [],
          hostTeamName: teamName,
          hostSocketId: socket.id,
        });

        await room.save();
        socket.join(roomId);

        io.to(roomId).emit("lobby_update", {
          teams: room.teamsJoined,
          noOfTeams: room.noOfTeams,
        });

        socket.emit("redirect_to_lobby", { roomId });
      } catch (err) {
        console.error(err);
        socket.emit("error_message", "Failed to create room");
      }
    }
  );

  // --- JOIN ROOM ---
  socket.on("join_room", async ({ roomId, teamName }) => {
    if (!roomId || !teamName)
      return socket.emit("error_message", "Room ID and team name required");

    try {
      const room = await Room.findOne({ roomId });
      if (!room) return socket.emit("error_message", "Room not found");

      // Use host's budget dynamically
      const hostBudget = room.teamsJoined[0]?.budget || 120;

      if (!room.teamsJoined.find((t) => t.id === socket.id)) {
        room.teamsJoined.push({
          id: socket.id,
          teamName,
          budget: hostBudget, // assign host-selected budget
          players: [],
        });
        await room.save();
      }

      socket.join(roomId);

      io.to(roomId).emit("lobby_update", {
        teams: room.teamsJoined,
        noOfTeams: room.noOfTeams,
      });

      socket.emit("redirect_to_lobby", { roomId });
      console.log(`${teamName} joined room ${roomId}`);
    } catch (err) {
      console.error(err);
      socket.emit("error_message", "Failed to join room");
    }
  });

  socket.on("start_auction_by_host", async ({ roomId }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return socket.emit("error_message", "Room not found");

      if (room.teamsJoined.length < room.noOfTeams)
        return socket.emit("error_message", "All teams have not joined yet!");

      room.auctionStarted = true;
      room.highestBid = 0;
      room.highestBidder = null;
      room.lastBidder = null;
      room.notInterestedTeams = [];

      // Pick first random player immediately
      const randomIndex = Math.floor(Math.random() * room.players.length);
      room.currentPlayerIndex = randomIndex;

      const firstPlayer = room.players[randomIndex];
      await room.save();

      // Redirect all clients to auction page
      io.to(roomId).emit("redirect_to_auction", { roomId });

      // Immediately send first player to all clients
      io.to(roomId).emit("current_player", firstPlayer);
      io.to(roomId).emit("auction_update", {
        teams: room.teamsJoined,
        currentPlayer: firstPlayer,
        highestBid: room.highestBid,
        highestBidder: room.highestBidder,
        lastBidder: room.lastBidder,
        auctionStarted: room.auctionStarted,
        remainingPlayers: room.remainingPlayers,
      });

      // Start the countdown for bidding
      startAuctionTimer(roomId);
    } catch (err) {
      console.error(err);
    }
  });

  // --- JOIN AUCTION ROOM ---
  socket.on("join_auction_room", async ({ roomId, teamName }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return;

      socket.join(roomId);

      let existingTeam = room.teamsJoined.find((t) => t.teamName === teamName);

      if (existingTeam) {
        // 🔄 Update socket ID (user reconnected)
        existingTeam.id = socket.id;

        await room.save();
      } else {
        // First time joining auction
        room.teamsJoined.push({
          id: socket.id,
          teamName,
          budget: 120,
          players: [],
        });
        await room.save();
      }

      // If auction started, send current player and remaining time
      if (room.auctionStarted && room.players.length > 0) {
        const currentPlayer =
          room.players[room.currentPlayerIndex] || room.players[0];
        const redisEndTime = await getAuctionTimer(roomId);

        socket.emit("current_player", currentPlayer);
        socket.emit("auction_update", {
          teams: room.teamsJoined,
          currentPlayer,
          highestBid: room.highestBid,
          highestBidder: room.highestBidder,
          lastBidder: room.lastBidder,
          auctionStarted: room.auctionStarted,
          remainingPlayers: room.remainingPlayers,
        });

        // Send remaining timer immediately to this client
        if (redisEndTime) {
          const remaining = Math.max(
            0,
            Math.ceil((redisEndTime - Date.now()) / 1000)
          );
          socket.emit("time_update", remaining);
        }
        io.to(roomId).emit("room_updated", room);
      }
    } catch (err) {
      console.error("join_auction_room error:", err);
    }
  });

  // --- NOT INTERESTED ---
  socket.on("not_interested", async ({ roomId, teamName }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return;

      const team = room.teamsJoined.find((t) => t.teamName === teamName);
      if (!team || team.players.length >= 15 || team.budget <= 0) return;

      const highestBidder = room.highestBidder;

      // A bidder can't click not interested on their own bid
      if (highestBidder && teamName === highestBidder) return;

      // Add to not interested list if not already
      if (!room.notInterestedTeams.includes(teamName)) {
        room.notInterestedTeams.push(teamName);
        await room.save();
      }

      const activeTeams = getActiveTeams(room);
      const stillInterested = activeTeams.filter(
        (t) => !room.notInterestedTeams.includes(t.teamName)
      );

      // ✅ CASE 1: All active teams clicked Not Interested → skip player
      if (stillInterested.length === 0) {
        clearTimeout(auctionTimers[roomId]?.timeoutId);
        clearInterval(auctionTimers[roomId]?.intervalId);
        await handleTurnEnd(roomId);
        return;
      }

      // ✅ CASE 2: Only one active team left and it's this team → move to next player
      if (activeTeams.length === 1 && activeTeams[0].teamName === teamName) {
        clearTimeout(auctionTimers[roomId]?.timeoutId);
        clearInterval(auctionTimers[roomId]?.intervalId);
        await handleTurnEnd(roomId);
        return;
      }

      // ✅ CASE 3: Only highest bidder remains interested → instantly sell to them
      if (
        stillInterested.length === 1 &&
        room.highestBidder &&
        stillInterested[0].teamName === room.highestBidder
      ) {
        clearTimeout(auctionTimers[roomId]?.timeoutId);
        clearInterval(auctionTimers[roomId]?.intervalId);
        await handleTurnEnd(roomId);
        return;
      }

      // ✅ CASE 4: Normal update
      io.to(roomId).emit("auction_update", {
        teams: room.teamsJoined,
        currentPlayer: room.players[room.currentPlayerIndex] || null,
        highestBid: room.highestBid,
        highestBidder: room.highestBidder,
        lastBidder: room.lastBidder,
        auctionStarted: room.auctionStarted,
        notInterestedTeams: room.notInterestedTeams,
      });
    } catch (err) {
      console.error("not_interested error:", err);
    }
  });

  socket.on("place_bid", async ({ roomId, teamName }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return;

      const team = room.teamsJoined.find((t) => t.teamName === teamName);
      if (!team) return;

      const currentPlayer = room.players[room.currentPlayerIndex];
      if (!currentPlayer) return;

      const localNation = leagueLocalNation[room.league] || "India";
      const maxForeign = Number(room.foreignPlayers) || 1;

      const isForeign =
        normalizeNation(currentPlayer.nation) !== normalizeNation(localNation);
      const foreignCount = countForeignPlayers(team, localNation);

      if (room.highestBidder === teamName) {
        io.to(socket.id).emit(
          "toast_message",
          "⚠️ You are already the highest bidder!"
        );
        return;
      }

      if (team.players.length >= room.noOfPlayers) {
        io.to(socket.id).emit("toast_message", "❌ Your team is full!");
        return;
      }

      if (isForeign && foreignCount >= maxForeign) {
        io.to(socket.id).emit(
          "toast_message",
          `❌ Cannot bid: ${teamName} already has ${maxForeign} foreign player(s)!`
        );
        return;
      }

      if (team.budget <= 0) {
        io.to(socket.id).emit("toast_message", "⚠️ Not enough budget!");
        return;
      }

      const increment =
        room.highestBid < 10 ? 0.5 : room.highestBid < 20 ? 1 : 2;
      const newBid =
        room.highestBid === 0
          ? Number(currentPlayer.basePrice)
          : room.highestBid + increment;

      if (newBid > team.budget) {
        io.to(socket.id).emit(
          "toast_message",
          `⚠️ You cannot bid ₹${newBid} crore`
        );
        return;
      }

      room.highestBid = newBid;
      room.highestBidder = teamName;
      room.lastBidder = teamName;
      room.notInterestedTeams = (room.notInterestedTeams || []).filter(
        (t) => t !== teamName
      );

      await room.save();

      io.to(roomId).emit("bid_update", {
        highestBid: room.highestBid,
        highestBidder: room.highestBidder,
        lastBidder: room.lastBidder,
      });

      io.to(roomId).emit("auction_update", {
        teams: room.teamsJoined,
        currentPlayer,
        highestBid: room.highestBid,
        highestBidder: room.highestBidder,
        lastBidder: room.lastBidder,
        auctionStarted: room.auctionStarted,
        notInterestedTeams: room.notInterestedTeams,
      });

      await resetAuctionTimer(roomId);

      const interestedTeams = getActiveTeams(room).filter(
        (t) => !room.notInterestedTeams.includes(t.teamName)
      );
      if (interestedTeams.length === 1) {
        clearTimeout(auctionTimers[roomId]?.timeoutId);
        clearInterval(auctionTimers[roomId]?.intervalId);
        await handleTurnEnd(roomId);
      }
    } catch (err) {
      console.error("place_bid error:", err);
    }
  });

  const handleTurnEnd = async (roomId) => {
    try {
      if (auctionTimers[roomId]) {
        clearTimeout(auctionTimers[roomId].timeoutId);
        clearInterval(auctionTimers[roomId].intervalId);
      }

      const room = await Room.findOne({ roomId });
      if (!room) return;

      const currentPlayer = room.players[room.currentPlayerIndex];
      if (!currentPlayer) return;

      const [playerToMove] = room.players.splice(room.currentPlayerIndex, 1);
      let toastMessage = "";

      if (room.highestBidder && room.highestBid > 0) {
        const team = room.teamsJoined.find(
          (t) => t.teamName === room.highestBidder
        );
        if (team) {
          const localNation = leagueLocalNation[room.league] || "India";
          const maxForeign = Number(room.foreignPlayers) || 1;

          const isForeign =
            normalizeNation(currentPlayer.nation) !==
            normalizeNation(localNation);
          const foreignCount = countForeignPlayers(team, localNation);

          if (team.players.length >= room.noOfPlayers) {
            playerToMove.sold = false;
            playerToMove.soldTo = null;
            playerToMove.soldPrice = 0;
            room.remainingPlayers.push(playerToMove);
            toastMessage = `⚠️ ${team.teamName} already has ${room.noOfPlayers} players! ${playerToMove.playerName} moved to Unsold list.`;
          } else if (isForeign && foreignCount >= maxForeign) {
            playerToMove.sold = false;
            playerToMove.soldTo = null;
            playerToMove.soldPrice = 0;
            room.remainingPlayers.push(playerToMove);
            toastMessage = `⚠️ ${team.teamName} already has ${maxForeign} foreign player(s)! ${playerToMove.playerName} moved to Unsold list.`;
          } else {
            playerToMove.sold = true;
            playerToMove.soldTo = room.highestBidder;
            playerToMove.soldPrice = room.highestBid;

            team.players.push({
              playerName: playerToMove.playerName,
              role: playerToMove.role,
              basePrice: playerToMove.basePrice,
              team: playerToMove.team,
              image: playerToMove.image,
              pricePaid: room.highestBid,
              nation: playerToMove.nation || localNation,
            });

            team.budget = Number((team.budget - room.highestBid).toFixed(2));
            toastMessage = `✅ ${playerToMove.playerName} sold to ${team.teamName} for ₹${room.highestBid} crores!`;
          }
        }
      } else {
        playerToMove.sold = false;
        playerToMove.soldTo = null;
        playerToMove.soldPrice = 0;
        room.remainingPlayers.push(playerToMove);
        toastMessage = `❌ ${playerToMove.playerName} went unsold!`;
      }

      room.highestBid = 0;
      room.highestBidder = null;
      room.lastBidder = null;
      room.notInterestedTeams = [];

      let nextPlayer = null;
      if (room.players.length > 0) {
        const randomIndex = Math.floor(Math.random() * room.players.length);
        room.currentPlayerIndex = randomIndex;
        nextPlayer = room.players[randomIndex];
      }

      await room.save();

      if (toastMessage) io.to(roomId).emit("toast_message", toastMessage);

      if (nextPlayer) {
        io.to(roomId).emit("current_player", nextPlayer);
        io.to(roomId).emit("auction_update", {
          teams: room.teamsJoined.map((team) => ({
            teamName: team.teamName,
            budget: team.budget,
            players: team.players,
            foreignCount: countForeignPlayers(
              team,
              leagueLocalNation[room.league] || "India"
            ),
          })),
          currentPlayer: nextPlayer,
          highestBid: room.highestBid,
          highestBidder: room.highestBidder,
          lastBidder: room.lastBidder,
          auctionStarted: room.auctionStarted,
          notInterestedTeams: room.notInterestedTeams,
        });

        startAuctionTimer(roomId);
      } else if (
        room.remainingPlayers.length > 0 &&
        !room.waitingForUnsoldDecision
      ) {
        room.waitingForUnsoldDecision = true;
        await room.save();
        const hostSocketId = room.hostSocketId || room.teamsJoined[0]?.id;
        if (hostSocketId) {
          io.to(hostSocketId).emit("ask_for_unsold", {
            message:
              "All players are done. Do you want to auction unsold players?",
            remainingCount: room.remainingPlayers.length,
          });
        }
      } else {
        io.to(roomId).emit("auction_finished", {
          teams: room.teamsJoined.map((team) => ({
            teamName: team.teamName,
            budget: team.budget,
            players: team.players,
          })),
        });
      }
    } catch (err) {
      console.error("handleTurnEnd error:", err);
    }
  };

  const startAuctionTimer = async (roomId) => {
    const room = await Room.findOne({ roomId });
    if (!room) return;

    // Clear old local timer
    if (auctionTimers[roomId]) {
      clearTimeout(auctionTimers[roomId].timeoutId);
      clearInterval(auctionTimers[roomId].intervalId);
    }

    const endTime = await setAuctionTimer(roomId);
    room.timerEnd = endTime;
    await room.save();

    // Update every 1 sec
    const intervalId = setInterval(async () => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      io.to(roomId).emit("time_update", remaining);

      if (remaining <= 0) {
        clearInterval(intervalId);
        await clearAuctionTimer(roomId);
      }
    }, 1000);

    const timeoutId = setTimeout(async () => {
      await handleTurnEnd(roomId);
      await clearAuctionTimer(roomId);
    }, TIMER_DURATION);

    auctionTimers[roomId] = { intervalId, timeoutId };
  };

  const resetAuctionTimer = async (roomId) => {
    if (auctionTimers[roomId]) {
      clearTimeout(auctionTimers[roomId].timeoutId);
      clearInterval(auctionTimers[roomId].intervalId);
    }

    const newEndTime = await setAuctionTimer(roomId);

    const intervalId = setInterval(async () => {
      const remaining = Math.max(
        0,
        Math.ceil((newEndTime - Date.now()) / 1000)
      );
      io.to(roomId).emit("time_update", remaining);
      if (remaining <= 0) clearInterval(intervalId);
    }, 1000);

    const timeoutId = setTimeout(async () => {
      await handleTurnEnd(roomId);
      await clearAuctionTimer(roomId);
    }, TIMER_DURATION);

    auctionTimers[roomId] = { intervalId, timeoutId };
    io.to(roomId).emit("time_update", TIMER_DURATION / 1000);
  };

  socket.on(
    "auction_unsold_decision",
    async ({ roomId, continue: shouldContinue }) => {
      const room = await Room.findOne({ roomId });
      if (!room) return;

      if (shouldContinue && room.remainingPlayers.length > 0) {
        // Push unsold players back to auction
        room.players = [...room.remainingPlayers];
        room.remainingPlayers = [];
        room.currentPlayerIndex = 0;
        room.waitingForUnsoldDecision = false; // ✅ reset
        room.highestBid = 0;
        room.highestBidder = null;
        room.lastBidder = null;
        room.notInterestedTeams = [];
        await room.save();

        const nextPlayer = room.players[room.currentPlayerIndex];
        io.to(roomId).emit("current_player", nextPlayer);
        io.to(roomId).emit("auction_update", {
          teams: room.teamsJoined,
          currentPlayer: nextPlayer,
          highestBid: room.highestBid,
          highestBidder: room.highestBidder,
          lastBidder: room.lastBidder,
          auctionStarted: room.auctionStarted,
          notInterestedTeams: room.notInterestedTeams,
        });

        startAuctionTimer(roomId);
      } else {
        io.to(roomId).emit("auction_finished", { teams: room.teamsJoined });
      }
    }
  );

  socket.on("send_message", async ({ roomId, playerName, message }) => {
    if (!roomId || !message) return;

    // Broadcast the message to everyone in the room
    io.to(roomId).emit("receive_message", {
      playerName,
      message,
      timestamp: new Date().toISOString(),
    });
  });

  // --- DISCONNECT ---
  socket.on("disconnect", async () => {
    try {
      const room = await Room.findOne({ "teamsJoined.id": socket.id });
      if (room) {
        room.teamsJoined = room.teamsJoined.map((t) =>
          t.id === socket.id ? { ...t, id: null, disconnected: true } : t
        );
        await room.save();
        io.to(room.roomId).emit("lobby_update", {
          teams: room.teamsJoined,
          noOfTeams: room.noOfTeams,
        });
      }
      console.log("User disconnected:", socket.id);
    } catch (err) {
      console.error("disconnect handler error:", err);
    }
  });
});

server.listen(5000, () => console.log("Server running on port 5000"));
