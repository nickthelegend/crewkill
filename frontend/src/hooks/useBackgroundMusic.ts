"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Howl } from "howler";

// Music file paths (place your .mp3 files in /public/sounds/music/)
export const MUSIC_TRACKS = {
  menu: "/sounds/music/menu.mp3",
  lobby: "/sounds/music/lobby.mp3",
  gameplay: "/sounds/music/gameplay.mp3",
  voting: "/sounds/music/voting.mp3",
  victory: "/sounds/music/victory.mp3",
  defeat: "/sounds/music/defeat.mp3",
} as const;

export type MusicPhase = keyof typeof MUSIC_TRACKS;

export interface BackgroundMusic {
  currentTrack: MusicPhase | null;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  play: (track: MusicPhase) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  fadeToTrack: (track: MusicPhase, fadeDuration?: number) => void;
}

interface UseBackgroundMusicOptions {
  initialVolume?: number;
  initialMuted?: boolean;
  autoPlay?: boolean;
}

export function useBackgroundMusic(
  options: UseBackgroundMusicOptions = {}
): BackgroundMusic {
  const { initialVolume = 0.3, initialMuted = false, autoPlay = false } = options;

  const [currentTrack, setCurrentTrack] = useState<MusicPhase | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [volume, setVolumeState] = useState(initialVolume);

  const howlRef = useRef<Howl | null>(null);
  const volumeRef = useRef(initialVolume);
  const mutedRef = useRef(initialMuted);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (howlRef.current) {
        howlRef.current.unload();
      }
    };
  }, []);

  const createHowl = useCallback((track: MusicPhase, loop: boolean = true): Howl => {
    // Victory and defeat don't loop
    const shouldLoop = loop && track !== "victory" && track !== "defeat";

    return new Howl({
      src: [MUSIC_TRACKS[track]],
      loop: shouldLoop,
      volume: mutedRef.current ? 0 : volumeRef.current,
      html5: true, // Better for long audio files
      onend: () => {
        if (!shouldLoop) {
          setIsPlaying(false);
        }
      },
      onloaderror: (_id, error) => {
        console.warn(`Failed to load music track "${track}":`, error);
      },
    });
  }, []);

  const stop = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.stop();
      howlRef.current.unload();
      howlRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTrack(null);
  }, []);

  const play = useCallback((track: MusicPhase) => {
    // Stop current track if playing
    if (howlRef.current) {
      howlRef.current.stop();
      howlRef.current.unload();
    }

    // Create and play new track
    const howl = createHowl(track);
    howlRef.current = howl;
    howl.play();
    setCurrentTrack(track);
    setIsPlaying(true);
  }, [createHowl]);

  const pause = useCallback(() => {
    if (howlRef.current && isPlaying) {
      howlRef.current.pause();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  const resume = useCallback(() => {
    if (howlRef.current && !isPlaying) {
      howlRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    volumeRef.current = clampedVolume;
    setVolumeState(clampedVolume);

    if (howlRef.current && !mutedRef.current) {
      howlRef.current.volume(clampedVolume);
    }
  }, []);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setIsMuted(mutedRef.current);

    if (howlRef.current) {
      howlRef.current.volume(mutedRef.current ? 0 : volumeRef.current);
    }
  }, []);

  const fadeToTrack = useCallback((track: MusicPhase, fadeDuration: number = 1000) => {
    // If same track, do nothing
    if (currentTrack === track && isPlaying) {
      return;
    }

    // Fade out current track
    if (howlRef.current && isPlaying) {
      const oldHowl = howlRef.current;
      oldHowl.fade(volumeRef.current, 0, fadeDuration);

      setTimeout(() => {
        oldHowl.stop();
        oldHowl.unload();
      }, fadeDuration);
    }

    // Create and fade in new track
    const newHowl = createHowl(track);
    howlRef.current = newHowl;

    if (!mutedRef.current) {
      newHowl.volume(0);
      newHowl.play();
      newHowl.fade(0, volumeRef.current, fadeDuration);
    } else {
      newHowl.volume(0);
      newHowl.play();
    }

    setCurrentTrack(track);
    setIsPlaying(true);
  }, [currentTrack, isPlaying, createHowl]);

  // Auto-play menu music on mount if enabled
  useEffect(() => {
    if (autoPlay && !currentTrack) {
      play("menu");
    }
  }, [autoPlay, currentTrack, play]);

  return {
    currentTrack,
    isPlaying,
    isMuted,
    volume,
    play,
    stop,
    pause,
    resume,
    setVolume,
    toggleMute,
    fadeToTrack,
  };
}
