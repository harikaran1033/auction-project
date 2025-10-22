/* eslint-disable no-unused-vars */
import { useNavigate } from "react-router-dom";
import heroBG from "./assets/heroPageBG.jpg";
import { delay, motion } from "framer-motion";
const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div
        className="hero min-h-screen"
        style={{
          backgroundImage: `url(${heroBG})`,
        }}
      >
        <div className="hero-overlay"></div>
        <div className="hero-content text-neutral-content text-center">
          <div className="max-w-xl">
            <motion.h1
              className="mb-5 text-5xl font-bold"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Welcome to the Cricket Auction{" "}
            </motion.h1>
            <motion.p
              className="mb-5 "
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Join the ultimate cricket bidding experience! Build your dream
              team, compete with players worldwide, and feel the thrill of live
              auctions — all in one platform. Start bidding and own the game
              today.
            </motion.p>

            <motion.div
              className="flex items-center justify-center gap-2 flex-col md:flex-row sm:flex-row"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5,delay:.3 }}
            >
              <button
                onClick={() => navigate("/create")}
                className="btn btn-primary btn-soft btn-wide"
              >
                Create Room
              </button>
              <button
                className="btn btn-soft btn-success 
              btn-wide"
                onClick={() => navigate("/join")}
              >
                Join Room
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
