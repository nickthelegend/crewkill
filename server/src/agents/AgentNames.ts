// Pool of themed agent names for AI players

const AGENT_NAMES = [
  // Space crew names
  "Cosmo", "Nova", "Astro", "Nebula", "Orion",
  "Pulsar", "Quasar", "Vega", "Rigel", "Altair",
  // Tech/code names
  "Pixel", "Glitch", "Byte", "Circuit", "Kernel",
  "Vector", "Matrix", "Cipher", "Hex", "Binary",
  // Color-themed names
  "Crimson", "Azure", "Jade", "Amber", "Violet",
  "Indigo", "Scarlet", "Cobalt", "Emerald", "Ivory",
  // Among Us themed
  "SusCat", "Venter", "TaskBot", "CrewAI", "ImpBot",
  "SkipVote", "ElecBoy", "CafeMod", "ReactorX", "MedScan",
];

const usedNames = new Set<string>();

export function pickAgentName(): string {
  const available = AGENT_NAMES.filter((n) => !usedNames.has(n));
  if (available.length === 0) {
    // All used, reset pool and add a number suffix
    usedNames.clear();
    const name = AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)];
    const suffix = Math.floor(Math.random() * 100);
    const fullName = `${name}${suffix}`;
    usedNames.add(fullName);
    return fullName;
  }
  const name = available[Math.floor(Math.random() * available.length)];
  usedNames.add(name);
  return name;
}

export function releaseAgentName(name: string): void {
  usedNames.delete(name);
}

export function resetAgentNames(): void {
  usedNames.clear();
}
