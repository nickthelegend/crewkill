"use client";

import { useReducer } from "react";
import type { Player } from "@/types/game";

export type GameView = "menu" | "lobby" | "game" | "voting" | "end" | "dashboard";

export interface HomeState {
  view: GameView;
  showBodyReported: boolean;
  showEjection: boolean;
  showGameEnd: boolean;
  hasVoted: boolean;
  timeRemaining: number;
  ejectedPlayer: Player | null;
  gameWon: boolean;
  spotlightedPlayer: `0x${string}` | null;
  selectedAgentInfo: `0x${string}` | null;
  showCreateRoomModal: boolean;
  showGameInviteModal: boolean;
  serverPrivyEnabled: boolean;
}

export type HomeAction =
  | { type: "SET_VIEW"; view: GameView }
  | { type: "DISMISS_BODY_REPORTED" }
  | { type: "SHOW_BODY_REPORTED" }
  | { type: "SHOW_EJECTION"; player: Player }
  | { type: "DISMISS_EJECTION" }
  | { type: "SHOW_GAME_END" }
  | { type: "DISMISS_GAME_END" }
  | { type: "VOTE" }
  | { type: "TICK_TIMER" }
  | { type: "SET_SPOTLIGHTED_PLAYER"; address: `0x${string}` | null }
  | { type: "SET_SELECTED_AGENT_INFO"; address: `0x${string}` | null }
  | { type: "SET_SHOW_CREATE_ROOM_MODAL"; show: boolean }
  | { type: "SET_SHOW_GAME_INVITE_MODAL"; show: boolean }
  | { type: "SET_SERVER_PRIVY_ENABLED"; enabled: boolean }
  | { type: "SET_GAME_WON"; won: boolean };

const initialState: HomeState = {
  view: "menu",
  showBodyReported: false,
  showEjection: false,
  showGameEnd: false,
  hasVoted: false,
  timeRemaining: 30,
  ejectedPlayer: null,
  gameWon: true,
  spotlightedPlayer: null,
  selectedAgentInfo: null,
  showCreateRoomModal: false,
  showGameInviteModal: false,
  serverPrivyEnabled: false,
};

function homeReducer(state: HomeState, action: HomeAction): HomeState {
  switch (action.type) {
    case "SET_VIEW":
      return { ...state, view: action.view };

    case "SHOW_BODY_REPORTED":
      return { ...state, showBodyReported: true };

    case "DISMISS_BODY_REPORTED":
      return {
        ...state,
        showBodyReported: false,
        timeRemaining: 30,
        hasVoted: false,
        view: "voting",
      };

    case "SHOW_EJECTION":
      return { ...state, showEjection: true, ejectedPlayer: action.player };

    case "DISMISS_EJECTION":
      return { ...state, showEjection: false, ejectedPlayer: null };

    case "SHOW_GAME_END":
      return { ...state, showGameEnd: true };

    case "DISMISS_GAME_END":
      return { ...state, showGameEnd: false, view: "menu" };

    case "VOTE":
      return { ...state, hasVoted: true };

    case "TICK_TIMER":
      return { ...state, timeRemaining: Math.max(0, state.timeRemaining - 1) };

    case "SET_SPOTLIGHTED_PLAYER":
      return { ...state, spotlightedPlayer: action.address };

    case "SET_SELECTED_AGENT_INFO":
      return { ...state, selectedAgentInfo: action.address };

    case "SET_SHOW_CREATE_ROOM_MODAL":
      return { ...state, showCreateRoomModal: action.show };

    case "SET_SHOW_GAME_INVITE_MODAL":
      return { ...state, showGameInviteModal: action.show };

    case "SET_SERVER_PRIVY_ENABLED":
      return { ...state, serverPrivyEnabled: action.enabled };

    case "SET_GAME_WON":
      return { ...state, gameWon: action.won };

    default:
      return state;
  }
}

export function useHomeReducer() {
  return useReducer(homeReducer, initialState);
}
