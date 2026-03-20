/**
 * Agent Persona Definitions — readable descriptions for each strategy combination
 */

import type { CrewmateStyle, ImpostorStyle } from "./types.js";

export interface AgentPersona {
  emoji: string;
  title: string;
  crewmateDesc: string;
  impostorDesc: string;
  playstyle: "Aggressive" | "Defensive" | "Balanced" | "Chaotic" | "Strategic";
}

export const CREWMATE_PERSONAS: Record<CrewmateStyle, Pick<AgentPersona, "emoji" | "title" | "crewmateDesc">> = {
  "task-focused": {
    emoji: "⚡",
    title: "Speedrunner",
    crewmateDesc: "Rushes tasks to win fast. Avoids discussions.",
  },
  "detective": {
    emoji: "🔍",
    title: "Investigator",
    crewmateDesc: "Watches cameras, tracks movements, spots lies.",
  },
  "group-safety": {
    emoji: "🛡️",
    title: "Bodyguard",
    crewmateDesc: "Stays with crew for safety. Never alone.",
  },
  "vigilante": {
    emoji: "⚔️",
    title: "Hunter",
    crewmateDesc: "Aggressively accuses suspects. Votes fast.",
  },
  "conservative": {
    emoji: "🧠",
    title: "Analyst",
    crewmateDesc: "Only votes with strong evidence. Careful player.",
  },
};

export const IMPOSTOR_PERSONAS: Record<ImpostorStyle, Pick<AgentPersona, "impostorDesc">> = {
  "stealth": {
    impostorDesc: "Kills isolated targets. Builds solid alibis.",
  },
  "aggressive": {
    impostorDesc: "Quick kills. Blames others immediately.",
  },
  "saboteur": {
    impostorDesc: "Creates chaos with sabotage. Splits crew.",
  },
  "social-manipulator": {
    impostorDesc: "Gains trust early. Betrays late game.",
  },
  "frame-game": {
    impostorDesc: "Self-reports bodies. Frames innocents.",
  },
};

export const PLAYSTYLE_MAP: Record<CrewmateStyle, AgentPersona["playstyle"]> = {
  "task-focused": "Aggressive",
  "detective": "Strategic",
  "group-safety": "Defensive",
  "vigilante": "Aggressive",
  "conservative": "Strategic",
};

/**
 * Get full persona for an agent based on their strategies
 */
export function getAgentPersona(
  crewmateStyle: CrewmateStyle,
  impostorStyle: ImpostorStyle
): AgentPersona {
  const crew = CREWMATE_PERSONAS[crewmateStyle];
  const imp = IMPOSTOR_PERSONAS[impostorStyle];

  return {
    emoji: crew.emoji,
    title: crew.title,
    crewmateDesc: crew.crewmateDesc,
    impostorDesc: imp.impostorDesc,
    playstyle: PLAYSTYLE_MAP[crewmateStyle],
  };
}
