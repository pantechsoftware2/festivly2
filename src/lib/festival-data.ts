// Static festival event data - can be safely imported in client components

export const UPCOMING_EVENTS = [
  { id: "lohri", name: "Lohri", date: "Jan 13", description: "Festival of bonfire and harvest" },
  { id: "makar-sankranti", name: "Makar Sankranti", date: "Jan 14", description: "Kite flying festival" },
  { id: "republic-day", name: "Republic Day", date: "Jan 26", description: "Indian patriotic celebration" }
];

export function getEventName(eventId: string): string {
  return UPCOMING_EVENTS.find(e => e.id === eventId)?.name || "Republic Day";
}

export const industryKeywords = {
  "Education": "books, graduation caps, globe, bright blue and yellow colors, youthful, future",
  "Real Estate": "modern architecture, keys, open doors, blueprints, trust, family home",
  "Tech & Startup": "modern, minimal, geometric shapes, laptop, sleek, futuristic, gradient colors",
  "Manufacturing": "industrial, gears, factories, metallic textures, orange and grey safety colors",
  "Retail & Fashion": "lifestyle, shopping bags, vibrant, trendy, elegant, fabrics, luxury",
  "Food & Cafe": "warm lighting, delicious food texture, smoke, steam, cozy, inviting"
};

export const eventKeywords = {
  "Lohri": "bonfire, popcorn, peanuts, punjabi folk culture, vibrant night celebration",
  "Makar Sankranti": "colorful kites in the sky, sun rays, yellow flowers, harvest festival",
  "Republic Day": "Indian tricolor flag, ashoka chakra, saffron and green smoke, patriotic"
};




// vklsnvkdfvds