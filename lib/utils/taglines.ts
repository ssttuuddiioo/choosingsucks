const taglines = [
  "Telepathy isn't on the menu.",
  "Mind-reading is above our pay grade.",
  "Guess less.",
  '"Up to you" is not a plan.',
  "Turn off your brain. We've got this.",
  "We kill indecision for sport.",
  "Consensus without casualties.",
  "Democracy, but faster.",
  "This is how democracy should feel."
];

/**
 * Returns a random tagline from the predefined list
 */
export function getRandomTagline(): string {
  const randomIndex = Math.floor(Math.random() * taglines.length);
  return taglines[randomIndex];
}

