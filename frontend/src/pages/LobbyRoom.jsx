/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import socket from "../socket";
import { ClipboardIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import lobby3 from "../assets/lobby3.jpg";

const Lobby = () => {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const teamName = searchParams.get("username");
  const creator = searchParams.get("creator") === "true";
  const noOfTeams = Number(searchParams.get("noOfTeams") || 2);
  const navigate = useNavigate();

  const [teams, setTeams] = useState([]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!roomId) return;

    socket.emit("join_room", { roomId, teamName });

    socket.on("lobby_update", ({ teams }) => {
      const uniqueTeams = teams.filter(
        (t, i, arr) => arr.findIndex((x) => x.teamName === t.teamName) === i
      );
      setTeams(uniqueTeams);
    });

    socket.on("redirect_to_auction", () => {
      navigate(`/auction/${roomId}?username=${encodeURIComponent(teamName)}`);
    });

    return () => {
      socket.off("lobby_update");
      socket.off("redirect_to_auction");
    };
  }, [roomId, teamName, navigate]);

  const startAuction = () => {
    socket.emit("start_auction_by_host", { roomId });
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center overflow-hidden bg-[#0f0f15] text-gray-100 font-inter">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        <img
          src={lobby3}
          alt="Lobby Background"
          className="w-full h-full object-cover brightness-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-[#0f0f15]/80 to-black/90"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-6xl px-6 py-14 flex flex-col items-center gap-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center w-full gap-4">
          <h1 className="text-4xl md:text-3xl font-bold tracking-tight text-yellow-400">
            Auction Lobby
          </h1>

          <div className="flex items-center gap-3">
            <div
              className="tooltip tooltip-primary"
              data-tip={copied ? "Copied!" : "Copy Room Code"}
            >
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 btn btn-outline btn-sm border-gray-700 bg-gray-900/60 text-gray-200 hover:bg-gray-800/80 transition rounded-lg px-4 py-2"
              >
                <ClipboardIcon className="w-5 h-5 text-yellow-400" />
                <span className="font-mono">{roomId}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Teams Joined */}
        <div className="text-center">
          <h3 className="text-xl md:text-2xl text-gray-300 font-semibold tracking-wide">
            Teams Joined ({teams.length}/{noOfTeams})
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Waiting for all teams to join before the auction begins
          </p>
        </div>

        {/* Teams Grid */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 mt-6">
          {teams.map((t, index) => (
            <motion.div
              key={t.teamName + index}
              whileHover={{ scale: 1.05 }}
              className="bg-gray-900/70 p-5 rounded-xl flex flex-col items-center justify-center border border-gray-700 shadow-md backdrop-blur-sm transition hover:border-yellow-500/50"
            >
              <span className="text-xs text-gray-500 mb-1">{`Team ${
                index + 1
              }`}</span>
              <span className="text-gray-100 font-semibold text-center truncate">
                {t.teamName}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Start Auction Button or Waiting Message */}
        {creator && teams.length === noOfTeams ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            onClick={startAuction}
            className="mt-8 px-10 py-3 rounded-full bg-yellow-500 text-gray-900 font-bold hover:bg-yellow-400 transition shadow-lg shadow-yellow-500/20"
          >
            Start Auction
          </motion.button>
        ) : (
          <p className="text-gray-400 italic text-lg md:text-xl mt-6 text-center">
            Waiting for host to start the auction...
          </p>
        )}

        {/* Auction Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full mt-12 bg-gray-900/70 border border-gray-700 rounded-2xl p-6 shadow-lg backdrop-blur-sm"
        >
          <h2 className="text-2xl font-semibold text-yellow-400 mb-3">
            📜 Auction Rules
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-300 text-sm leading-relaxed">
            <li>
              Each team starts with a budget of{" "}
              <span className="text-yellow-400 font-semibold">₹120 Cr</span>.
            </li>
            <li>Bidding begins from the base price of each player.</li>
            <li>
              Teams can bid in increments until 10 Cr — increase by 0.5 Cr.
            </li>
            <li>From 10 Cr to 20 Cr — increase by 1 Cr.</li>
            <li>After 20 Cr — increase by 2 Cr.</li>
            <li>Once a player is sold, they cannot be bid on again.</li>
            <li>
              If all teams mark "Not Interested", the player remains unsold.
            </li>
            <li>
              The auction continues until all players have been processed.
            </li>
          </ul>
        </motion.div>

        {/* Tips / Footer Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="w-full mt-6 text-center text-gray-400 text-sm"
        >
          <p className="italic">
            💡 Tip: Keep your internet stable. Once the auction starts, bids
            happen in real-time.
          </p>
          <p className="text-xs mt-2 text-gray-500">
            Powered by{" "}
            <span className="text-yellow-400 font-semibold">
              RealTime Cricket Auction Engine
            </span>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Lobby;
