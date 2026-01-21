import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import { industryKeywords, eventKeywords, UPCOMING_EVENTS, getEventName } from './festival-data';

// --- CONFIGURATION ---
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const LOCATION = process.env.GOOGLE_CLOUD_REGION || 'us-central1';

// Initialize Vertex AI
const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
const model = vertexAI.getGenerativeModel({ 
  model: 'gemini-2.0-flash-001', // Using 2.0-flash (faster, latest available model)
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
- **NEGATIVE SPACE:** If text is needed, specify a clean, low-detail area for text overlay.
- NEVER describe the brief, event name, or industry keywords as visible text in the image.
- NO: Watermarks, logos, split screens, borders, collages, annotations, captions, labels, visible text metadata.
- COMPOSITION: Main subject centered or third-rule.

### REQUIRED JSON OUTPUT:
{
  "reasoning": "Brief strategy explanation",
  "image_prompt": "Detailed Imagen-4 prompt with lighting, camera, composition. Max 80 words. MUST NOT include any brief text, event descriptions, or metadata that should appear in image.",
  "headline_suggestion": "Max 3 words - something creative and brandable, NOT the event name",
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

    // 1. Construct the Brief for the Creative Director (SIMPLIFIED TO AVOID TEXT BLEED)
    const brief = `
EVENT: ${event}
INDUSTRY: ${industry}
STYLE: ${brandStyleContext || "professional"}

TASK: Generate a visual prompt for a ${event} social media background in the ${industry} industry.
Return ONLY the JSON with image_prompt, headline_suggestion, reasoning, and color_palette_hex.
`;

    // 2. Ask Gemini Flash
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: brief }] }],
      systemInstruction: CREATIVE_DIRECTOR_SYSTEM_PROMPT,
      generationConfig: { responseMimeType: "application/json" }
    });

    const response = result.response.candidates?.[0].content.parts[0].text;
    
    if (!response) throw new Error("No response from Creative Director");

    // 3. Parse and validate JSON response
    let data;
    try {
      data = JSON.parse(response);
    } catch (parseError) {
      console.error("❌ Failed to parse Gemini JSON response:", parseError);
      console.error("   Raw response:", response.substring(0, 200));
      throw new Error("Gemini returned invalid JSON");
    }

    // Validate required fields
    if (!data.image_prompt || !data.headline_suggestion) {
      console.error("❌ Gemini response missing required fields");
      console.error("   Response:", JSON.stringify(data));
      throw new Error("Gemini response missing image_prompt or headline_suggestion");
    }

    console.log(`✨ Strategy: ${data.reasoning}`);
    console.log(`📄 Generated Image Prompt: ${data.image_prompt.substring(0, 100)}...`);
    console.log(`✍️  Generated Headline: "${data.headline_suggestion}"`);
    
    // CRITICAL: Enforce max 3-word headline (Imagen struggles with longer text)
    if (data.headline_suggestion) {
      const words = data.headline_suggestion.trim().split(/\s+/);
      if (words.length > 3) {
        const originalHeadline = data.headline_suggestion;
        data.headline_suggestion = words.slice(0, 3).join(' ');
        console.log(`⚠️ HEADLINE TRUNCATED: "${originalHeadline}" → "${data.headline_suggestion}" (max 3 words for Imagen stability)`);
      }
    }
    
    // Build base prompt
    let finalPrompt = `${data.image_prompt}
    
    TECHNICAL SPECS:
    - High quality, 8k, photorealistic, professional photography
    - Seamless, cinematic lighting, wide angle
    - Style: ${brandStyleContext ? brandStyleContext : 'Modern, clean, corporate'}`;

    // --- THE TEXT INJECTION (HYBRID BATCH) ---
    if (includeText && data.headline_suggestion) {
      // Imagen 4 Specific Text Trigger - Poster Style
      // ENFORCE: Max 3 words
      const words = data.headline_suggestion.trim().split(/\s+/);
      const textToRender = words.slice(0, 3).join(' ').toUpperCase();
      
      console.log(`📝 Adding text overlay: "${textToRender}"`);
      finalPrompt += `
    
    TEXT RENDER INSTRUCTIONS (CRITICAL - POSTER STYLE):
    - ONLY render this headline text: "${textToRender}"
    - Typography ONLY: Bold, elegant, 3D Gold/Metallic/Neon/Stone with drop shadow
    - Placement: TOP CENTER of image (above the main subject), integrated naturally into scene
    - Vertical position: Upper third of image, prominent and readable
    - NO other text, NO captions, NO labels, NO metadata, NO descriptions
    - Spelling must be exact: "${textToRender}"
    - Do NOT add event name, industry keywords, or any other text
    - Text appearance: gold foil effect OR neon glow OR engraved stone (pick one naturally)
    - Ensure text has realistic depth and shadow (NOT flat or pasted)
    - NO collage, NO overlays, NO watermarks, NO frames
    - Single cohesive composition with text integrated in upper area${brandStyleContext ? `\n    - Brand style guide: ${brandStyleContext}` : ''}`;
    } else {
      // Explicitly forbid text for the clean version
      finalPrompt += `
    
    CLEAN COMPOSITION (NO TEXT):
    - ABSOLUTELY NO text, NO writing, NO typography, NO letters, NO numbers
    - NO watermarks, NO borders, NO frames, NO annotations, NO labels
    - NO collage elements, NO overlays, NO stickers, NO graphics
    - Pure visual storytelling - clean background perfect for copy placement
    - Single focused subject with professional composition${brandStyleContext ? `\n    - Brand style guide: ${brandStyleContext}` : ''}`;
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