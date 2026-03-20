"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AmongUsSprite } from "./AmongUsSprite";
import { RedGradientBackground } from "./SpaceBackground";

// Dead Body Reported Screen
export function DeadBodyReportedScreen({
  isVisible,
  onDismiss,
}: {
  isVisible: boolean;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
          onClick={onDismiss}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Background with red tint */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, #1a0505 0%, #2d0a0a 50%, #1a0505 100%)",
            }}
          />

          {/* Red slash effect */}
          <motion.div
            className="absolute inset-0 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Diagonal red streaks */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-40 bg-gradient-to-r from-transparent via-red-600/60 to-transparent"
                style={{
                  width: "200%",
                  left: "-50%",
                  top: `${10 + i * 10}%`,
                  transform: `rotate(${-15 + Math.random() * 30}deg)`,
                }}
                initial={{ x: "-100%", opacity: 0 }}
                animate={{ x: "0%", opacity: 0.8 }}
                transition={{
                  delay: 0.1 * i,
                  duration: 0.3,
                  ease: "easeOut",
                }}
              />
            ))}
          </motion.div>

          {/* Main content */}
          <div className="relative text-center z-10">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", damping: 10 }}
            >
              <h1
                className="text-6xl md:text-8xl font-bold text-red-500 mb-2"
                style={{
                  fontFamily: "'Comic Sans MS', cursive",
                  textShadow: `
                    0 0 20px rgba(255,0,0,0.8),
                    0 0 40px rgba(255,0,0,0.6),
                    4px 4px 0 #8b0000
                  `,
                  letterSpacing: "0.1em",
                }}
              >
                DEAD BODY
              </h1>
              <h1
                className="text-6xl md:text-8xl font-bold text-red-500"
                style={{
                  fontFamily: "'Comic Sans MS', cursive",
                  textShadow: `
                    0 0 20px rgba(255,0,0,0.8),
                    0 0 40px rgba(255,0,0,0.6),
                    4px 4px 0 #8b0000
                  `,
                  letterSpacing: "0.1em",
                }}
              >
                REPORTED
              </h1>
            </motion.div>

            <motion.p
              className="text-white/60 text-lg mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Click anywhere to continue
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Victory/Defeat Screen
export function GameEndScreen({
  isVisible,
  crewmatesWon,
  playerColorId,
  wasImpostor,
  onContinue,
}: {
  isVisible: boolean;
  crewmatesWon: boolean;
  playerColorId: number;
  wasImpostor: boolean;
  onContinue: () => void;
}) {
  const playerWon = crewmatesWon !== wasImpostor;
  const title = playerWon ? "Victory" : "Defeat";
  const subtitle = crewmatesWon
    ? wasImpostor
      ? "LOST BECAUSE OF VOTE OUT"
      : "ALL IMPOSTORS ELIMINATED"
    : wasImpostor
      ? "CREWMATES ELIMINATED"
      : "IMPOSTORS WIN";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Background */}
          <div
            className="absolute inset-0"
            style={{
              background: playerWon
                ? "linear-gradient(180deg, #0a1a0a 0%, #0a2d0a 30%, #0f4a0f 60%, #051a05 100%)"
                : "linear-gradient(180deg, #000000 0%, #2d0a0a 30%, #4a0f0f 60%, #1a0505 100%)",
            }}
          />

          {/* Content */}
          <div className="relative z-10 text-center">
            {/* Subtitle */}
            <motion.p
              className="text-white text-xl tracking-widest mb-4"
              style={{
                fontFamily: "'Comic Sans MS', cursive",
                textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
              }}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {subtitle}
            </motion.p>

            {/* Main title */}
            <motion.h1
              className={`text-8xl md:text-9xl font-bold ${playerWon ? "text-green-500" : "text-red-500"}`}
              style={{
                fontFamily: "'Comic Sans MS', cursive",
                textShadow: playerWon
                  ? "0 0 30px rgba(0,255,0,0.6), 4px 4px 0 #0a5a0a"
                  : "0 0 30px rgba(255,0,0,0.6), 4px 4px 0 #5a0a0a",
                letterSpacing: "0.05em",
              }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring", damping: 10 }}
            >
              {title}
            </motion.h1>

            {/* Continue button */}
            <motion.button
              className="mt-8 px-12 py-4 text-xl font-bold text-white border-2 border-white hover:bg-white hover:text-black transition-colors"
              style={{
                fontFamily: "'Comic Sans MS', cursive",
              }}
              onClick={onContinue}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              CONTINUE
            </motion.button>

            {/* Character */}
            <motion.div
              className="mt-8"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <AmongUsSprite
                colorId={playerColorId}
                isAlive={true}
                size={120}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Emergency Meeting Screen
export function EmergencyMeetingScreen({
  isVisible,
  callerColorId,
  callerName,
  onDismiss,
}: {
  isVisible: boolean;
  callerColorId: number;
  callerName: string;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer bg-black"
          onClick={onDismiss}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Flashing red effect */}
          <motion.div
            className="absolute inset-0 bg-red-900"
            animate={{
              opacity: [0, 0.5, 0, 0.5, 0],
            }}
            transition={{
              duration: 0.5,
              times: [0, 0.25, 0.5, 0.75, 1],
            }}
          />

          {/* Content */}
          <div className="relative text-center z-10">
            <motion.div
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 8 }}
            >
              <h1
                className="text-6xl md:text-8xl font-bold text-white mb-4"
                style={{
                  fontFamily: "'Comic Sans MS', cursive",
                  textShadow: "4px 4px 0 #333",
                }}
              >
                EMERGENCY
              </h1>
              <h1
                className="text-6xl md:text-8xl font-bold text-white"
                style={{
                  fontFamily: "'Comic Sans MS', cursive",
                  textShadow: "4px 4px 0 #333",
                }}
              >
                MEETING
              </h1>
            </motion.div>

            <motion.div
              className="mt-8 flex flex-col items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <AmongUsSprite colorId={callerColorId} size={100} />
              <p className="text-white text-xl">{callerName} called the meeting</p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Ejection Screen
export function EjectionScreen({
  isVisible,
  ejectedColorId,
  ejectedName,
  wasImpostor,
  impostorsRemaining,
  onDismiss,
}: {
  isVisible: boolean;
  ejectedColorId: number;
  ejectedName: string;
  wasImpostor: boolean;
  impostorsRemaining: number;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer overflow-hidden"
          onClick={onDismiss}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Space background */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at center, #1a1a3e 0%, #0d0d1a 50%, #000000 100%)",
            }}
          />

          {/* Stars */}
          {[...Array(100)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.3,
              }}
            />
          ))}

          {/* Ejected character floating away */}
          <motion.div
            className="absolute"
            initial={{ x: "-50%", y: "50%", rotate: 0, scale: 1 }}
            animate={{
              x: "150%",
              y: "-50%",
              rotate: 720,
              scale: 0.3,
            }}
            transition={{ duration: 4, ease: "easeIn" }}
          >
            <AmongUsSprite colorId={ejectedColorId} size={100} />
          </motion.div>

          {/* Text */}
          <motion.div
            className="relative z-10 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <h1
              className="text-4xl md:text-6xl font-bold text-white"
              style={{
                fontFamily: "'Comic Sans MS', cursive",
                textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
              }}
            >
              {ejectedName} was {wasImpostor ? "" : "not "}an Impostor.
            </h1>
            <p
              className="text-2xl text-white/80 mt-4"
              style={{
                fontFamily: "'Comic Sans MS', cursive",
              }}
            >
              {impostorsRemaining} Impostor{impostorsRemaining !== 1 ? "s" : ""} remain{impostorsRemaining === 1 ? "s" : ""}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
