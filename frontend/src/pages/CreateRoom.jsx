/* eslint-disable no-unused-vars */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";
import { motion } from "framer-motion";


const CreateRoom = () => {
  const [teamName, setTeamName] = useState("");
  const [noOfTeams, setNoOfTeams] = useState(2);
  const [league, setLeague] = useState("");
  const [noOfPlayers, setNoOfPlayers] = useState(11);
  const [foreignPlayers, setForeignPlayers] = useState(2);
  const [budget, setBudget] = useState(100);
  const navigate = useNavigate();


     

  const handleCreate = () => {
    if (!teamName || noOfTeams < 2) {
      return alert("Enter a team name & a valid number of teams");
    }

    socket.emit("create_room", { 
      teamName, 
      noOfTeams, 
      league, 
      noOfPlayers, 
      foreignPlayers, 
      budget 
    });

    socket.once("redirect_to_lobby", ({ roomId }) => {
      navigate(
        `/lobby/${roomId}?username=${encodeURIComponent(
          teamName
        )}&creator=true&noOfTeams=${noOfTeams}`
      );
    });
  };

  return (
    <div
      className="relative w-full min-h-screen flex justify-center items-center bg-cover bg-center
      bg-[#00171F] flex-col gap-2
      "
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80 z-0"></div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className=" relative z-10 w-full max-w-md px-8 py-10 flex flex-col gap-4 overflow-hidden rounded-2xl 
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
          Create Room
        </h1>

        <div>
          <label className="text-sm">Leagues</label>
          <select
            value={league}
            onChange={(e) => setLeague(e.target.value)}
            className="select 
            w-full text-gray-200 bg-black border-white/20 focus:border-blue-400 focus:outline-none text-xs
            "
          >
            <option value="">Select League</option>
            {["IPL", "Hundreds"].map((l, i) => (
              <option value={l} key={i}>
                {l}
              </option>
            ))}
          </select>
        </div>

        {/* Team Name Input */}
        <div className="flex flex-col ">
          <label className=" text-gray-200 text-sm tracking-wide">
            Team Name
          </label>
          <input
            type="text"
            placeholder="Enter your team name"
            className="input input-bordered w-full text-xs text-white bg-black border-white/20 focus:border-blue-400 focus:outline-none"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">Number of players / Team</label>
           <select 
           value={noOfPlayers}
           onChange={(e) => setNoOfPlayers(Number(e.target.value))}
           className="select 
            w-full text-gray-200 bg-black border-white/20 focus:border-blue-400 focus:outline-none text-xs">
            <option disabled={true}>No of players</option>
            {[11,15,18,22,25].map((num) => (
               <option value={num} key={num}>{num}</option>
            ))}
           </select>
        </div>

        <div>
          <label className="text-sm">Foreign players</label>
           <select 
           value={foreignPlayers}
           onChange={(e) => setForeignPlayers(Number(e.target.value))}
           className="select 
            w-full text-gray-200 bg-black border-white/20 focus:border-blue-400 focus:outline-none text-xs">
            <option disabled={true}>Select foreign players</option>
            {[2,3,4,5,6,7,8].map((num) => (
               <option value={num} key={num}>{num}</option>
            ))}
           </select>
        </div>

         <div>
          <label className="text-sm">Budget (in crores)</label>
           <select 
           value={budget}
           onChange={(e) => setBudget(Number(e.target.value))}
           className="select 
            w-full text-gray-200 bg-black border-white/20 focus:border-blue-400 focus:outline-none text-xs">
            <option disabled={true}>Select budget</option>
            {[100,110,120,130,150].map((num) => (
               <option value={num} key={num}>{num}</option>
            ))}
           </select>
        </div>

        {/* Number of Teams Input */}
        <div className="flex flex-col gap-2">
          <label className=" text-gray-200 text-sm tracking-wide">
            Number of Teams
          </label>
          <input
            type="number"
            min={2}
            max={10}
            className="input text-xs input-bordered w-full text-white bg-black border-white/20 focus:border-blue-400 focus:outline-none"
            value={noOfTeams}
            onChange={(e) => setNoOfTeams(Number(e.target.value))}
          />
        </div>

        {/* Button */}
        <button
          onClick={handleCreate}
          className="btn btn-primary w-full mt-4 py-3 text-lg font-semibold tracking-wide hover:scale-[1.02] transition-all"
        >
          Create Room
        </button>
      </motion.div>
    </div>
  );
};

export default CreateRoom;