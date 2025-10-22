/* eslint-disable no-unused-vars */
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TrophyIcon, HomeIcon, ClipboardIcon, CheckIcon } from "@heroicons/react/24/solid";
import { useState } from "react";

const ResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { players, teamName } = location.state || { players: [], teamName: "" };

  const [copied, setCopied] = useState(false);

  if (!players.length)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base-200 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold text-gray-400"
        >
          No players were bought.
        </motion.h2>
      </div>
    );

  // ✅ Group players by role
  const groupedPlayers = players.reduce((acc, player) => {
    const role = player.role || "Unknown";
    if (!acc[role]) acc[role] = [];
    acc[role].push(player);
    return acc;
  }, {});

  const roleOrder = ["Batsman", "Bowler", "All-Rounder", "Wicket-Keeper", "Unknown"];

  // ✅ Copy formatted team list
  const handleCopyTeam = () => {
    let text = `🏏 ${teamName} - Auction Team\n\n`;

    let count = 1;
    for (const role of roleOrder) {
      if (groupedPlayers[role]) {
        text += `\n${role}:\n`;
        groupedPlayers[role].forEach((p) => {
          text += `${count}. ${p.playerName} - ${p.role} - ₹${p.pricePaid} Cr\n`;
          count++;
        });
      }
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#121826] to-[#1a1f2e] text-white flex flex-col items-center p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <div className="flex justify-center items-center gap-3">
          <h1 className="text-3xl md:text-4xl font-extrabold text-yellow-300">
            {teamName} – Auction Results
          </h1>
        </div>
        <p className="text-gray-400 mt-2">Final squad breakdown by role</p>

        {/* Copy button */}
       
      </motion.div>

      {/* Players grouped by role */}
      <div className="w-full max-w-5xl space-y-10">
        {roleOrder.map(
          (role) =>
            groupedPlayers[role] && (
              <motion.div
                key={role}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="text-2xl font-semibold mb-3 border-l-4 border-primary pl-3">
                  {role}
                </h2>
                <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {groupedPlayers[role].map((p, i) => (
                      <motion.div
                        key={`${role}-${i}`}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: i * 0.05 }}
                        className="card bg-base-200 border border-white/10 hover:border-primary/40 transition-all"
                      >
                        <div className="card-body p-4">
                          <div className="flex justify-between items-center">
                            <h2 className="text-lg font-medium">{p.playerName}</h2>
                            <span className="badge badge-primary font-semibold">
                              ₹{p.pricePaid} Cr
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
        )}
      </div>

      {/* Go Home button */}
  {/* Bottom buttons */}
<div className="flex flex-col gap-4 mt-12 items-center">
  {/* Copy Team Button */}
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={handleCopyTeam}
    className="btn btn-outline btn-accent flex items-center gap-2"
  >
    {copied ? (
      <>
        <CheckIcon className="w-5 h-5 text-green-400" />
        Copied!
      </>
    ) : (
      <>
        <ClipboardIcon className="w-5 h-5" />
        Copy Team
      </>
    )}
  </motion.button>

  {/* Go Home Button */}
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => navigate("/")}
    className="btn btn-outline btn-secondary flex items-center gap-2"
  >
    <HomeIcon className="w-5 h-5" />
    Go to Home
  </motion.button>
</div>

    </div>
  );
};

export default ResultPage;
