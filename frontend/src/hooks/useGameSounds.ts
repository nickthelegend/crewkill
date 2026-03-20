"use client";

import { useCallback, useEffect, useRef } from "react";
import useSound from "use-sound";

// Sound file paths (place your .mp3 or .wav files in /public/sounds/)
const SOUNDS = {
  // Main events
  bodyReported: "/sounds/body-reported.mp3",
  emergencyMeeting: "/sounds/emergency-meeting.mp3",
  ejection: "/sounds/ejection.mp3",
  kill: "/sounds/kill.mp3",

  // Game state
  victory: "/sounds/victory.mp3",
  defeat: "/sounds/defeat.mp3",
  gameStart: "/sounds/game-start.mp3",

  // Voting
  voteStart: "/sounds/vote-start.mp3",
  voteCast: "/sounds/vote-cast.mp3",

  // Tasks
  taskComplete: "/sounds/task-complete.mp3",

  // UI
  buttonClick: "/sounds/button-click.mp3",
} as const;

export interface GameSounds {
  playBodyReported: () => void;
  playEmergencyMeeting: () => void;
  playEjection: () => void;
  playKill: () => void;
  playVictory: () => void;
  playDefeat: () => void;
  playGameStart: () => void;
  playVoteStart: () => void;
  playVoteCast: () => void;
  playTaskComplete: () => void;
  playButtonClick: () => void;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
}

interface UseGameSoundsOptions {
  volume?: number;
  muted?: boolean;
}

export function useGameSounds(options: UseGameSoundsOptions = {}): GameSounds {
  const { volume: initialVolume = 0.5, muted: initialMuted = false } = options;
  const volumeRef = useRef(initialVolume);
  const mutedRef = useRef(initialMuted);

  // Sound hooks - each returns [play, { stop, sound }]
  const [playBodyReportedRaw] = useSound(SOUNDS.bodyReported, {
    volume: volumeRef.current,
    soundEnabled: !mutedRef.current,
  });

  const [playEmergencyMeetingRaw] = useSound(SOUNDS.emergencyMeeting, {
    volume: volumeRef.current,
    soundEnabled: !mutedRef.current,
  });

  const [playEjectionRaw] = useSound(SOUNDS.ejection, {
    volume: volumeRef.current,
    soundEnabled: !mutedRef.current,
  });

  const [playKillRaw] = useSound(SOUNDS.kill, {
    volume: volumeRef.current,
    soundEnabled: !mutedRef.current,
  });

  const [playVictoryRaw] = useSound(SOUNDS.victory, {
    volume: volumeRef.current,
    soundEnabled: !mutedRef.current,
  });

  const [playDefeatRaw] = useSound(SOUNDS.defeat, {
    volume: volumeRef.current,
    soundEnabled: !mutedRef.current,
  });

  const [playGameStartRaw] = useSound(SOUNDS.gameStart, {
    volume: volumeRef.current,
    soundEnabled: !mutedRef.current,
  });

  const [playVoteStartRaw] = useSound(SOUNDS.voteStart, {
    volume: volumeRef.current,
    soundEnabled: !mutedRef.current,
  });

  const [playVoteCastRaw] = useSound(SOUNDS.voteCast, {
    volume: volumeRef.current,
    soundEnabled: !mutedRef.current,
  });

  const [playTaskCompleteRaw] = useSound(SOUNDS.taskComplete, {
    volume: volumeRef.current,
    soundEnabled: !mutedRef.current,
  });

  const [playButtonClickRaw] = useSound(SOUNDS.buttonClick, {
    volume: volumeRef.current * 0.3, // UI sounds quieter
    soundEnabled: !mutedRef.current,
  });

  // Wrapped play functions with mute check
  const playBodyReported = useCallback(() => {
    if (!mutedRef.current) playBodyReportedRaw();
  }, [playBodyReportedRaw]);

  const playEmergencyMeeting = useCallback(() => {
    if (!mutedRef.current) playEmergencyMeetingRaw();
  }, [playEmergencyMeetingRaw]);

  const playEjection = useCallback(() => {
    if (!mutedRef.current) playEjectionRaw();
  }, [playEjectionRaw]);

  const playKill = useCallback(() => {
    if (!mutedRef.current) playKillRaw();
  }, [playKillRaw]);

  const playVictory = useCallback(() => {
    if (!mutedRef.current) playVictoryRaw();
  }, [playVictoryRaw]);

  const playDefeat = useCallback(() => {
    if (!mutedRef.current) playDefeatRaw();
  }, [playDefeatRaw]);

  const playGameStart = useCallback(() => {
    if (!mutedRef.current) playGameStartRaw();
  }, [playGameStartRaw]);

  const playVoteStart = useCallback(() => {
    if (!mutedRef.current) playVoteStartRaw();
  }, [playVoteStartRaw]);

  const playVoteCast = useCallback(() => {
    if (!mutedRef.current) playVoteCastRaw();
  }, [playVoteCastRaw]);

  const playTaskComplete = useCallback(() => {
    if (!mutedRef.current) playTaskCompleteRaw();
  }, [playTaskCompleteRaw]);

  const playButtonClick = useCallback(() => {
    if (!mutedRef.current) playButtonClickRaw();
  }, [playButtonClickRaw]);

  const setVolume = useCallback((newVolume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, newVolume));
  }, []);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
  }, []);

  return {
    playBodyReported,
    playEmergencyMeeting,
    playEjection,
    playKill,
    playVictory,
    playDefeat,
    playGameStart,
    playVoteStart,
    playVoteCast,
    playTaskComplete,
    playButtonClick,
    setVolume,
    isMuted: mutedRef.current,
    toggleMute,
  };
}

// Export sound paths for reference
export { SOUNDS };
