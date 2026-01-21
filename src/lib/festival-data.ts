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
  // --- EXISTING CATEGORIES (UPGRADED) ---
  "Education": "cinematic photography, soft morning light streaming through classroom window, candid students studying, bokeh background, authentic indian university atmosphere, smart board, uniforms, 35mm lens, depth of field, studious vibe",
  "Real Estate": "architectural photography, luxury indian apartment interior, golden hour sunlight hitting the balcony, wide angle shot, marble flooring, modern furniture, airy and bright, 8k resolution, vaastu compliant layout, high-end living",
  "Tech & Startup": "modern open-plan office in bangalore, macbook pro on wooden desk, glass walls, authentic indian startup team blurred in background, soft studio lighting, editorial photography, coding screen, coffee mug, professional workspace",
  "Manufacturing": "industrial photography, macro shot of precision machinery, dramatic factory lighting, steel textures, sparks flying, engineering workshop, high contrast, safety gear, professional depth, heavy industry",
  "Retail & Fashion": "street style photography, high fashion editorial, vibrant indian textiles, silk saree texture, soft focus, trendy boutique interior, natural lighting, candid lifestyle shot, mannequins, colorful fabrics",
  "Food & Cafe": "food photography, steam rising from masala chai, rustic wooden table, overhead flat lay, warm cozy atmosphere, window light, artisan plating, spices scattered, 85mm lens, delicious texture",

  // --- NEW INDIAN-SPECIFIC CATEGORIES ---
  "Jewelry & Gold": "macro photography of gold jewelry, diamond sparkle, velvet background, intricate kundun design, softbox lighting, luxury showcase, bridal necklace, reflection, high-end catalogue style, sharp focus",
  "Weddings & Events": "candid wedding photography, marigold flower decoration, golden festive lights, blur background, vibrant indian wedding mandap, shenai vibes, joyful celebration, rich reds and golds, cinematic event capture",
  "Ayurveda & Wellness": "minimalist product photography, herbal ingredients, mortar and pestle, green leaves, soft natural daylight, zen atmosphere, wooden texture, spa vibes, organic wellness, glass bottles, clean composition",
  "Handicrafts & Decor": "artisan workshop, clay pottery texture, hand-painted details, earthy tones, close-up of craftsmanship, blur background, cultural heritage, authentic indian art, warm lighting, rustic aesthetic",
  "Gym & Fitness": "high energy gym photography, sweat texture, neon lighting, weights and dumbbells, determination, athletic indian model, motion blur, modern fitness center, bold contrast, workout gear"
};

export const eventKeywords = {
  "Lohri": "bonfire, popcorn, peanuts, punjabi folk culture, vibrant night celebration",
  "Makar Sankranti": "colorful kites in the sky, sun rays, yellow flowers, harvest festival",
  "Republic Day": "Indian tricolor flag, ashoka chakra, saffron and green smoke, patriotic"
};




// vklsnvkdfvds