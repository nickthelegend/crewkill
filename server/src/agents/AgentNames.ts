// Pool of themed agent names for AI players

const AGENT_NAMES = [
  // Space crew names (Serious/Human)
  "Commander Vance", "Dr. Aris", "Officer Reed", "Captain Solaris", "Pilot Jax",
  "Engineer Kai", "Navigator Lyra", "Medic Vale", "Specialist Thorne", "Sensor Op Elias",
  // Sci-fi inspired
  "Rick Deckard", "Ellen Ripley", "Sarah Connor", "James T. Kirk", "Dana Scully",
  "Fox Mulder", "Jean-Luc", "Kara Thrace", "Lee Adama", "Sharon Valerii",
  // Themed/Nicknames (More personality)
  "Blackbird", "Snapshot", "Deadshot", "Ghost", "Viper",
  "Wolf", "Falcon", "Raven", "Shadow", "Nightfall",
  // Subtle/Suspicious
  "Silas", "Victor", "Morgan", "Julian", "Damien",
  "Arthur", "Elena", "Clara", "Marcus", "Diana"
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
