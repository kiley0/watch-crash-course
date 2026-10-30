// Quiet little discoveries for people who know what to look for.
const shelfSurprises: Record<string, { heading: string; message: string }> = {
  "french the llama": {
    heading: "French the llama!",
    message:
      "You found a little bit of awesome. No llama course on this shelf yet. Try “study” to find your way back.",
  },
  "except the mongols": {
    heading: "We’re the exception!",
    message:
      "A classic history detour. No Mongoltage here yet, but Study Skills is waiting on the shelf.",
  },
  "pizza john": {
    heading: "A little Pizzamas spirit, between the books.",
    message: "A fond nod to Pizza John. Try “study” for something to feed your curiosity.",
  },
  dftba: {
    heading: "Don’t forget to be awesome.",
    message:
      "And don’t forget that asking a question is an excellent place to start. The course shelf is one click below.",
  },
  "made of awesome": {
    heading: "You brought the awesome with you.",
    message:
      "Curiosity looks good on you. Clear this search whenever you’re ready to find your next idea.",
  },
  "giant squid of anger": {
    heading: "The giant squid of anger has taken a study break.",
    message:
      "A deep breath. A small stretch. The course shelf will still be here when you’re ready.",
  },
  "puff levels": {
    heading: "Puff levels: academically impressive.",
    message:
      "An excellent hair day for learning something. Your actual knowledge is not measured in hair volume.",
  },
  "puppy sized elephants": {
    heading: "A very small elephant. A very big idea.",
    message:
      "There might be a little friend hiding on the about page. For now, the course shelf awaits.",
  },
  "who the eff is hank": {
    heading: "Today? A quantity of yarn.",
    message: "Tomorrow’s answer may vary. Some questions are a tradition all their own.",
  },
  "dave green": {
    heading: "Dave’s keeping a low profile.",
    message:
      "The imaginary third Green brother is quietly auditing this imaginary university. Naturally.",
  },
  "pumpkins and penguins": {
    heading: "An excellent sign-off.",
    message:
      "Consider this a little letter from the course shelf: we’re glad you’re here. Pumpkins and penguins.",
  },
  "butt is legs": {
    heading: "A debate for the ages.",
    message:
      "The course shelf respectfully leaves this classification to the community. Keep asking wonderfully specific questions.",
  },
  "no edge": {
    heading: "Dude. No edge.",
    message: "Questions in every direction. That’s a pretty good reason to keep learning.",
  },
  "mars and afc wimbledon": {
    heading: "A small detour through space and football.",
    message:
      "Two very different rabbit holes. One very familiar podcast. Your next course is back on the shelf.",
  },
  "dr neversneezer scrooge": {
    heading: "A very specific podcast memory.",
    message:
      "Bless you, fellow listener. The course shelf has no opinion about your sneezing habits.",
  },
  "stuff on heads": {
    heading: "A perfectly respectable thinking cap.",
    message:
      "A small salute to the time-honored tradition of balancing something on your head. Curiosity is the only thing you need to bring here.",
  },
  "happy dance": {
    heading: "A small happy dance is in order.",
    message:
      "Finding a new idea is worth celebrating. Your dance moves are entirely your own business.",
  },
};

export function findShelfSurprise(query: string): { heading: string; message: string } | undefined {
  const key = query
    .toLowerCase()
    .replace(/[-–—]/g, " ")
    .replace(/[^a-z\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
  return Object.hasOwn(shelfSurprises, key) ? shelfSurprises[key] : undefined;
}
