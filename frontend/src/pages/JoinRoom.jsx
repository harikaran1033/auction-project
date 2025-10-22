/* eslint-disable no-unused-vars */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";
import { motion } from "framer-motion";

const JoinRoom = () => {
  const [teamName, setTeamName] = useState("");
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    if (!teamName || !roomId) return alert("Enter team name & room ID");

    socket.emit("join_room", { teamName, roomId });

    socket.on("redirect_to_lobby", ({ roomId }) => {
      navigate(
        `/lobby/${roomId}?username=${encodeURIComponent(
          teamName
        )}&creator=false`
      );
    });
  };

  return (
    <div className="relative w-full min-h-screen flex justify-center items-center bg-cover bg-center bg-[#00171F]">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80 z-0"></div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration:0.5 }}
        className="glass-card relative z-10 w-full max-w-md px-8 py-10 flex flex-col gap-6 overflow-hidden rounded-2xl 
        border border-white/30 
        bg-white/5 
        backdrop-blur-[12px] 
        shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(255,255,255,0.1)]
        before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px 
        before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.8),transparent)]
        after:content-[''] after:absolute after:top-0 after:left-0 after:w-px after:h-full
        after:bg-[linear-gradient(180deg,rgba(255,255,255,0.8),transparent,rgba(255,255,255,0.3))]
      "
      >
        {/* Header */}
        <h1 className="text-4xl md:text-5xl font-bold text-center text-white mb-4">
          Join Room
        </h1>

        {/* Room ID Input */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold text-gray-200 text-sm tracking-wide">
            Room ID
          </label>
          <input
            type="text"
            placeholder="Enter Room ID"
            className="input input-bordered w-full text-white bg-black/10 border-white/20 focus:border-blue-400 focus:outline-none"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
        </div>

        {/* Team Name Input */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold text-gray-200 text-sm tracking-wide">
            Team Name
          </label>
          <input
            type="text"
            placeholder="Enter your team name"
            className="input input-bordered w-full text-white bg-black/10 border-white/20 focus:border-blue-400 focus:outline-none"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
        </div>

        {/* Join Button */}
        <button
          onClick={handleJoin}
          className="btn btn-primary w-full mt-4 py-3 text-lg font-semibold tracking-wide hover:scale-[1.02] transition-all"
        >
          Join Room
        </button>
      </motion.div>
    </div>
  );
};

export default JoinRoom;
