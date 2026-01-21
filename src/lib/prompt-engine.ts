import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import { industryKeywords, eventKeywords, UPCOMING_EVENTS, getEventName } from './festival-data';

// --- CONFIGURATION ---
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const LOCATION = process.env.GOOGLE_CLOUD_REGION || 'us-central1';

// Initialize Vertex AI
const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
const model = vertexAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash-001', // Flash is fast & perfect for prompt engineering
  safetySettings: [{ category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }]
});

// --- THE CREATIVE DIRECTOR BRAIN ---
const CREATIVE_DIRECTOR_SYSTEM_PROMPT = `
You are the Lead Creative Director at a high-end ad agency. Your goal is to translate a vague user request into a commercially viable visual asset using strategic reasoning.

### PHASE 1: STRATEGIC REASONING
Analyze the Input:
1. **Commercial Intent:** Is this B2B (trust) or B2C (emotion)?
2. **Visual Hierarchy:** Where must text sit? (Dark images→white text)
3. **The 'Click' Factor:** What visual element stops the scroll?
4. **Brand Fit:** How does this align with the brand style?

### PHASE 2: ASSET GENERATION
Generate the JSON output below.

**Image Prompt Rules (CRITICAL for Imagen-4):**
- ALWAYS specify: Lighting (Volumetric, Studio strobe, Golden hour), Quality (8k, Octane render, Sony A7R IV)
- **NEGATIVE SPACE:** If text is needed, specify a clean, low-detail area.
- NO: Watermarks, logos, split screens, borders, collages.
- COMPOSITION: Main subject centered or third-rule.

### REQUIRED JSON OUTPUT:
{
  "reasoning": "Brief strategy explanation",
  "image_prompt": "Detailed Imagen-4 prompt with lighting, camera, composition. Max 80 words.",
  "headline_suggestion": "Max 5 words catchy headline",
  "color_palette_hex": ["#hex1", "#hex2"]
}
`;

/**
 * The "Smart" Prompt Generator
 * Uses Gemini Flash to architect the perfect prompt based on Brand + Event + Industry
 */
export async function generateSmartPrompt(
  event: string, 
  industry: string, 
  brandStyleContext: string | null = null,
  includeText: boolean = false
): Promise<string> {
  try {
    console.log(`🧠 Creative Director: Analyzing strategy for ${event} in ${industry}...`);

    // 1. Construct the Brief for the Creative Director
    const brief = `
    CLIENT BRIEF:
    - Event: ${event} (Context: ${getEventContext(event)})
    - Industry: ${industry}
    - Brand Style Guide: ${brandStyleContext || "No specific guide. Aim for high-end, clean, professional."}
    
    TASK:
    Write a photorealistic image generation prompt for a social media post background. 
    It must visually represent the *feeling* of the event mixed with the *aesthetics* of the industry.
    `;

    // 2. Ask Gemini Flash
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: brief }] }],
      systemInstruction: CREATIVE_DIRECTOR_SYSTEM_PROMPT,
      generationConfig: { responseMimeType: "application/json" }
    });

    const response = result.response.candidates?.[0].content.parts[0].text;
    
    if (!response) throw new Error("No response from Creative Director");

    // 3. Parse and Return the Optimized Prompt
    const data = JSON.parse(response);
    console.log(`✨ Strategy: ${data.reasoning}`);
    
    // Build base prompt
    let finalPrompt = `${data.image_prompt}
    
    TECHNICAL SPECS:
    - High quality, 8k, photorealistic, professional photography
    - Seamless, cinematic lighting, wide angle
    - Style: ${brandStyleContext ? brandStyleContext : 'Modern, clean, corporate'}`;

    // --- THE TEXT INJECTION (HYBRID BATCH) ---
    if (includeText && data.headline_suggestion) {
      // Imagen 4 Specific Text Trigger - Poster Style
      console.log(`📝 Adding text overlay: "${data.headline_suggestion}"`);
      finalPrompt += `
    
    TEXT RENDER INSTRUCTIONS:
    - The text "${data.headline_suggestion.toUpperCase()}" must be clearly visible in the center or strategic location.
    - Typography style: Elegant, Bold, 3D Gold or Metallic finish with subtle drop shadow.
    - The text should be integrated into the scene naturally (e.g., neon sign, gold embossed letters, elegant overlay on negative space).
    - Spelling must be exact: "${data.headline_suggestion.toUpperCase()}".
    - Ensure text doesn't overlap with important image details, place in negative space.
    - NO watermarks, NO logos besides the text itself.`;
    } else {
      // Explicitly forbid text for the clean version
      finalPrompt += `
    - NO text, NO writing, NO watermarks, NO borders, NO frames
    - Clean background perfect for adding copy/captions later`;
    }

    return finalPrompt;

  } catch (error) {
    console.error("⚠️ Creative Director unavailable, falling back to keywords:", error);
    // Fallback to the old method if AI fails
    return generateStaticPrompt(event, industry, brandStyleContext, includeText);
  }
}

// --- FALLBACK SYSTEM (The old "dumb" logic, kept for safety) ---

function getEventContext(event: string): string {
  const map: Record<string, string> = {
    "Lohri": "North Indian harvest festival, bonfires, winter night",
    "Makar Sankranti": "Day festival, kite flying, sun, harvest",
    "Republic Day": "National pride, military parade, flag colors"
  };
  return map[event] || "Celebration";
}

export function generateStaticPrompt(event: string, industry: string, brandStyleContext?: string | null, includeText: boolean = false): string {
  const indKeywords = industryKeywords[industry as keyof typeof industryKeywords] || industryKeywords["Education"];
  const evtKeywords = eventKeywords[event as keyof typeof eventKeywords] || eventKeywords["Republic Day"];

  let prompt = `${event} social media background, ${industry} style. 
  Visuals: ${indKeywords}, ${evtKeywords}. 
  High quality, photorealistic, 8k.`;

  if (includeText) {
    // Poster style with text
    const eventName = event.toUpperCase();
    prompt += ` WITH BOLD TEXT: "${eventName}" in elegant, 3D gold or metallic finish centered in the image.`;
  } else {
    // Clean style without text
    prompt += ` NO TEXT, clean background for copy.`;
  }

  if (brandStyleContext) prompt += ` Style: ${brandStyleContext}`;
  
  return prompt;
}