/**
 * Desi Prompt Engine
 * Generates contextual prompts based on industry + event + logo position
 */

export const industryKeywords = {
  "Education": "books, graduation caps, globe, bright blue and yellow colors, youthful, future, growth, pencils, notebooks, learning symbols",
  "Real Estate": "modern architecture, keys, open doors, blueprints, trust, family home, glass buildings, construction, property, investment",
  "Tech & Startup": "modern, minimal, geometric shapes, laptop, sleek, futuristic, gradient colors, circuits, innovation, code, digital",
  "Manufacturing": "industrial, gears, factories, metallic textures, orange and grey safety colors, precision, machinery, production, strength",
  "Retail & Fashion": "lifestyle, shopping bags, vibrant, trendy, elegant, fabrics, luxury, clothing, style, accessories, confidence",
  "Food & Cafe": "warm lighting, delicious food texture, smoke, steam, cozy, inviting, appetite appeal, freshness, aroma, hospitality"
}

export const eventKeywords = {
  "Lohri": "bonfire, popcorn, peanuts, punjabi folk culture, vibrant night celebration, warm fire glow, joy, harvest, rewari",
  "Makar Sankranti": "colorful kites in the sky, sun rays, yellow flowers, harvest festival, bright daylight, celebration, flying kites, tradition",
  "Republic Day": "Indian tricolor flag, ashoka chakra, saffron and green smoke, patriotic, India Gate silhouette, lions, national pride, honor"
}

export const eventMessages = {
  "Lohri": "warmth, celebration, togetherness, harvest joy",
  "Makar Sankranti": "freedom, hope, aspiration, new beginnings",
  "Republic Day": "patriotism, pride, unity, national spirit"
}

/**
 * Generate dynamic prompt for Imagen-4
 * @param event - Event name (e.g., "Republic Day")
 * @param industry - Industry type (e.g., "Education")
 */
export function generatePrompt(event: string, industry: string): string {
  const indKeywords = industryKeywords[industry as keyof typeof industryKeywords] || industryKeywords["Education"]
  const evtKeywords = eventKeywords[event as keyof typeof eventKeywords] || eventKeywords["Republic Day"]
  const evtMessage = eventMessages[event as keyof typeof eventMessages] || eventMessages["Republic Day"]

  // Generate 5-word event headlines
  const eventHeadlines: Record<string, string> = {
    "Lohri": "Celebrate Harvest Joy Together",
    "Makar Sankranti": "Fly High With Tradition",
    "Republic Day": "Unity Pride National Spirit"
  }
  const headline = eventHeadlines[event] || "Celebrate This Special Event"

  const prompt = `High-quality professional social media post for ${event}. Brand: ${industry} sector.

Visual elements: ${indKeywords} combined with ${evtKeywords}.

CRITICAL REQUIREMENTS:
- Photorealistic, professional business image quality
- SINGLE UNIFIED COMPOSITION - NOT a collage, split-screen, or multi-panel layout
- NO collage arrangements, NO multiple separate scenes, NO grid layouts, NO side-by-side comparisons
- Seamlessly blend industry + event concepts into ONE cohesive visual scene
- NO text overlays, NO watermarks, NO decorative elements
- Clean composition without external frames or borders
- Leave bottom-right corner clear for logo (150x150px space)
- Professional lighting, sharp focus, rich colors
- Suitable for corporate/business use

Style: Premium professional photography, 1080x1350 format`

  return prompt
}

/**
 * Get event info
 */
export const UPCOMING_EVENTS = [
  {
    id: "lohri",
    name: "Lohri",
    date: "Jan 13",
    description: "Festival of bonfire and harvest"
  },
  {
    id: "makar-sankranti",
    name: "Makar Sankranti",
    date: "Jan 14",
    description: "Kite flying and harvest festival"
  },
  {
    id: "republic-day",
    name: "Republic Day",
    date: "Jan 26",
    description: "Indian patriotic celebration"
  }
]

export function getEventName(eventId: string): string {
  const event = UPCOMING_EVENTS.find(e => e.id === eventId)
  return event?.name || "Republic Day"
}
