/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import socket from "../socket";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import lobby2 from "../assets/lobby2.jpg";
import { motion } from "framer-motion";
import ChatBox from "../components/ChatBox";
import AnimateBid from "../components/AnimateBid";
import { FaUsers, FaWallet, FaComments } from "react-icons/fa";
import { FaClock } from "react-icons/fa";
import { FaDollarSign, FaTimesCircle, FaCoins } from "react-icons/fa";

const AuctionRoom = () => {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const teamName = searchParams.get("username");

  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [teams, setTeams] = useState([]);
  const [highestBid, setHighestBid] = useState(0);
  const [highestBidder, setHighestBidder] = useState(null);
  const [lastBidder, setLastBidder] = useState(null);
  const [teamBudget, setTeamBudget] = useState(120);
  const [auctionStarted, setAuctionStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [hasMarkedNotInterested, setHasMarkedNotInterested] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [remainingPlayersCount, setRemainingPlayersCount] = useState(0);
  const [showUnsoldPrompt, setShowUnsoldPrompt] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);

  const isHost = teams?.[0]?.teamName === teamName; // first joined team is host
  const navigate = useNavigate();
  // --- SOCKET EVENTS ---
  useEffect(() => {
    if (!roomId || !teamName) return;

    // Join auction room
    socket.emit("join_auction_room", { roomId, teamName });

    const joinedKey = `joined_${roomId}_${teamName}`;
    if (!sessionStorage.getItem(joinedKey)) {
      socket.emit("join_auction_room", { roomId, teamName });
      sessionStorage.setItem(joinedKey, "true");
    }

    // Auction started
    socket.on("redirect_to_auction", ({ roomId }) => {
      setAuctionStarted(true);
    });

    // Current player
    socket.on("current_player", (player) => {
      setCurrentPlayer(player);
      setHighestBid(0);
      setHighestBidder(null);
      setLastBidder(null);
      setHasMarkedNotInterested(false);
      // ✅ Don't reset timer here
    });

    // Auction update
    socket.on("auction_update", (data) => {
      const {
        teams,
        currentPlayer,
        highestBid,
        highestBidder,
        lastBidder,
        auctionStarted,
        remainingPlayers,
      } = data;
      setTeams(teams);
      setCurrentPlayer(currentPlayer);
      setHighestBid(highestBid);
      setHighestBidder(highestBidder);
      setLastBidder(lastBidder);
      setAuctionStarted(auctionStarted);

      if (remainingPlayers) setRemainingPlayersCount(remainingPlayers.length);
      else setRemainingPlayersCount(0);

      const myTeam = teams.find((t) => t.teamName === teamName);
      if (myTeam) setTeamBudget(myTeam.budget);
    });

    // Bid update
    socket.on("bid_update", ({ highestBid, highestBidder, lastBidder }) => {
      setHighestBid(highestBid);
      setHighestBidder(highestBidder);
      setLastBidder(lastBidder);
    });

    // Timer update from server
    socket.on("time_update", (remaining) => {
      setTimeLeft(remaining); // always controlled by server
    });

    const handleReceiveMessage = (msg) => {
      setMessages((prev) => {
        if (
          prev.some(
            (m) => m.message === msg.message && m.playerName === msg.playerName
          )
        )
          return prev;
        return [...prev, msg];
      });
    };

    socket.on("receive_message", handleReceiveMessage);

    const handleUnsold = ({ message, remainingCount }) => {
      if (!showUnsoldPrompt) {
        setShowUnsoldPrompt(true);
        setRemainingPlayersCount(remainingCount || remainingPlayersCount);
        toast(message || `Decide for ${remainingCount} unsold players.`, {
          position: "top-center",
          autoClose: 4000,
          theme: "dark",
        });
      }
    };

    socket.on("ask_for_unsold", handleUnsold);

    socket.on("toast_message", (message) => {
      toast(message, {
        position: "top-center",
        autoClose: 3000,
        theme: "dark",
      });
    });

    // Auction finished
    socket.on("auction_finished", ({ teams }) => {
      const myTeam = teams.find((t) => t.teamName === teamName);
      navigate("/result", {
        state: { players: myTeam?.players || [], teamName },
      });
    });

    return () => {
      socket.off("current_player");
      socket.off("auction_update");
      socket.off("bid_update");
      socket.off("time_update");
      socket.off("room_updated");
      socket.off("toast_message");
      socket.off("auction_finished");
      socket.off("ask_for_unsold", handleUnsold);
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [roomId, teamName, showUnsoldPrompt, remainingPlayersCount]);

  // --- BID HANDLER ---
  const handleBid = () => {
    if (!currentPlayer) return;
    const increment = highestBid < 10 ? 0.5 : highestBid < 20 ? 1 : 2;
    if (highestBid + increment > teamBudget) return alert("Not enough budget");
    socket.emit("place_bid", { roomId, teamName });
  };

  // --- NOT INTERESTED HANDLER ---
  const handleNotInterested = () => {
    socket.emit("not_interested", { roomId, teamName });
    setHasMarkedNotInterested(true);
  };

  if (!auctionStarted) return <h2>Waiting for auction to start...</h2>;
  if (!currentPlayer) return <h2>Loading current player...</h2>;

  return (
    <div className="p-2 w-full flex justify-center items-center h-screen flex-col relative">
      <div className="absolute z-0 w-full min-h-screen">
        <img
          src={lobby2}
          alt=""
          className="w-full h-full absolute object-fit"
        />
        <div className="w-full h-screen absolute bg-black/80"></div>
      </div>

      <div className="drawer drawer-end flex justify-center items-center flex-col gap-2">
        <ToastContainer />

        {/* ChatBox for md+ screens */}
        <div className="hidden md:block absolute right-20 top-10 z-10">
          <ChatBox
            roomId={roomId}
            playerName={teamName}
            messages={messages || []}
            setMessages={setMessages}
            closeChat={() => setShowChat(false)}
          />
        </div>

        <input id="my-drawer-5" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content">
          <div>
            <h1>Auction Room</h1>
            <div className="flex justify-between p-2">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FaClock className="w-5 h-5" />

                <span className="countdown text-2xl font-mono text-warning">
                  <span style={{ "--value": timeLeft }}></span>
                </span>
              </h3>
              <p className="font-semibold flex items-center gap-2">
                <FaCoins className="w-5 h-5" />

                <label htmlFor="basePrice" className="text-warning">
                  {currentPlayer.basePrice} Cr
                </label>
              </p>
              <h3 className="font-semibold flex items-center gap-2">
                <FaWallet />
                <label htmlFor="budget" className="text-success">
                  {teamBudget} Cr
                </label>
              </h3>
            </div>

            {/* Current Player Card */}
            <div className="w-md">
              <div
                className={`w-full backdrop-blur-2xl flex items-center justify-end rounded-tl-lg rounded-tr-lg ${currentPlayer.teamColor}`}
              >
                <div className="flex-1  text-center">
                  <div>
                    <h2 className="text-3xl font-bold">
                      {currentPlayer.playerName}
                    </h2>
                    <p className="font-semibold">{currentPlayer.team}</p>
                    <p className="absolute bottom-1 left-2 font-semibold text-sm">
                      {currentPlayer.nation}
                    </p>
                  </div>
                </div>
                <div className="w-30 relative overflow-hidden">
                  <div
                    className="absolute w-full h-full 
                   bg-gradient-to-r from-transparent 
                   via-transparent
                   to-black/50 rounded-tr-md"
                  ></div>
                  <img
                    className="object-cover w-full h-full drop-shadow-lg drop-shadow-black/90 "
                    key={currentPlayer.playerName}
                    src={
                      currentPlayer.image || "https://via.placeholder.com/150"
                    }
                    loading="lazy"
                    alt={currentPlayer.playerName}
                    width={150}
                  />
                </div>
              </div>

              <div className="p-2 bg-gray-950 border-1 border-white/20">
                <div className="flex gap-2 justify-center">
                  <h3 className="flex items-center gap-4  font-semibold">
                    <span className="text-red-500">LIVE</span>

                    <AnimateBid
                      highestBid={highestBid}
                      highestBidder={highestBidder}
                    />
                  </h3>
                </div>
              </div>

              <div
                className={` text-white flex justify-between p-4 rounded-br-lg rounded-bl-lg font-semibold flex-col gap-4 ${currentPlayer.teamColor}`}
              >
                <div className="flex justify-between">
                  <div className="text-xs flex flex-col justify-center items-center gap-2">
                    <p>Batting</p>
                    <p>{currentPlayer.battingType}</p>
                  </div>
                  <p className="text-sm">
                    <span className="font-bold text-xl">
                      {currentPlayer.role}
                    </span>
                  </p>
                  <div className="text-xs flex flex-col justify-center items-center gap-2">
                    <p>Bowling</p>
                    <p> {currentPlayer.bowlingType}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bid Buttons */}
            <div className="flex flex-col gap-2 mt-2">
              <button
                className="btn flex  items-center btn-primary btn-soft w-full text-emerald-400"
                onClick={handleBid}
                disabled={lastBidder === teamName}
              >
                <FaDollarSign />
                Place Bid
              </button>
              <div className="flex justify-between items-center w-full">
                <button
                  className="btn btn-warning btn-soft w-full flex items-center"
                  onClick={handleNotInterested}
                  disabled={
                    hasMarkedNotInterested || highestBidder === teamName
                  }
                >
                  <FaTimesCircle />
                  {highestBidder === teamName
                    ? "You're the Highest Bidder"
                    : hasMarkedNotInterested
                    ? "Marked Not Interested"
                    : "Not Interested"}
                </button>
              </div>
            </div>

            {/* Show Players, Budget & Mobile Chat Buttons */}
            <div className="flex flex-wrap gap-2 mt-2">
              <label
                htmlFor="my-drawer-5"
                className="drawer-button btn btn-primary btn-soft"
              >
                <FaUsers />
                Show players
              </label>

              <label
                onClick={() => setShowBudget((prev) => !prev)}
                className="btn btn-neutral btn-soft text-white"
              >
                <FaWallet />
                {showBudget ? "close budget" : "show budget"}
              </label>

              {showBudget && (
                <div className="flex flex-col gap-1 mt-2 w-md absolute top-1/2 left-1/2  -translate-x-1/2 -translate-y-1/2 justify-center items-center bg-black backdrop-blur-2xl  rounded-xl p-5 border-white/30 border-1">
                  <p>Budgets Left: </p>
                  {teams
                    .filter((t) => t.teamName !== teamName) // exclude your team
                    .map((t) => (
                      <p key={t.teamName} className="text-white/80">
                        {t.teamName} Budget:{" "}
                        <span className="text-success">{t.budget} Cr</span>
                      </p>
                    ))}
                </div>
              )}

              {/* Mobile Chat Button */}
              <button
                className="md:hidden btn btn-primary ml-auto flex-1 btn-soft"
                onClick={() => setShowChat(true)}
              >
                <FaComments />
                Chat
              </button>
            </div>
          </div>
        </div>

        {/* Drawer side with team players */}
        <div className="drawer-side">
          <label
            htmlFor="my-drawer-5"
            className="drawer-overlay"
            aria-label="close sidebar"
          ></label>
          <ul className="menu bg-black/90 min-h-full w-80 p-4 text-white flex flex-col gap-2 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{teamName} Players</h2>

            {(() => {
              const teamPlayers =
                teams.find((t) => t.teamName === teamName)?.players || [];
              if (!teamPlayers.length) return <li>No players yet</li>;

              const roles = [
                "Batter",
                "Bowler",
                "All-Rounder",
                "Wicket Keeper",
              ];
              return roles.map((role) => {
                const playersByRole = teamPlayers.filter(
                  (p) => p.role === role
                );
                if (!playersByRole.length) return null;

                return (
                  <div key={role} className="mb-2">
                    <h3 className="font-semibold underline mb-1">{role}</h3>
                    {playersByRole.map((player, idx) => (
                      <li key={idx} className="rounded-lg flex justify-between">
                        <span>{player.playerName}</span>
                      </li>
                    ))}
                  </div>
                );
              });
            })()}
          </ul>
        </div>

        {showUnsoldPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-gray-900 text-white rounded-xl p-6 w-96 flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-center">Unsold Players</h2>
              <p className="text-center">
                Some players went unsold. What do you want to do?
              </p>

              <div className="flex justify-center gap-4 mt-4">
                {/* Continue auction with unsold players */}
                <button
                  className="btn btn-success btn-soft"
                  onClick={() => {
                    socket.emit("auction_unsold_decision", {
                      roomId,
                      continue: true,
                    });
                    setShowUnsoldPrompt(false);
                  }}
                >
                  Auction Unsold Players
                </button>

                <button
                  className="btn btn-warning btn-soft"
                  onClick={() => {
                    socket.emit("auction_unsold_decision", {
                      roomId,
                      continue: false,
                    });
                    setShowUnsoldPrompt(false);
                  }}
                >
                  Finish Auction
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Chat Modal */}
        {showChat && (
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/70 flex justify-center items-center"
            onClick={() => setShowChat(false)} // click outside closes chat
          >
            <div
              className="w-80 h-96 relative"
              onClick={(e) => e.stopPropagation()} // click inside doesn't close
            >
              <ChatBox
                roomId={roomId}
                playerName={teamName}
                messages={messages}
                setMessages={setMessages}
                closeChat={() => setShowChat(false)}
              />

              <button
                className="btn btn-sm btn-circle btn-ghost absolute top-2 right-2 text-white"
                onClick={() => setShowChat(false)}
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuctionRoom;
