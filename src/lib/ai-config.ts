/**
 * AI Config: Dynamic Model Selection & Creative Direction
 * 
 * This module implements:
 * 1. "Model Hunter" - Dynamic model selection from Google Cloud
 * 2. "God Prompt" - Gemini 3 optimized creative direction system
 * 
 * Model Priority (Higher index = Better/Newer):
 * TEXT: gemini-3.0-pro > gemini-2.0-flash > gemini-1.5-pro
 * IMAGE: imagen-4 > imagen-3.0 > imagen-3.0-fast
 */

// ============================================================
// 1. MODEL PRIORITY HIERARCHY
// ============================================================

const TEXT_MODEL_PRIORITY = [
  /gemini-1\.5-flash/i,
  /gemini-1\.5-pro/i,
  /gemini-2\.0-flash/i,
  /gemini-2\.0-pro/i,
  /gemini-3\.0-flash/i,
  /gemini-3\.0-pro/i, // The Heavyweight (Jan 2026)
];

const IMAGE_MODEL_PRIORITY = [
  /imagen-3\.0-fast/i,
  /imagen-3\.0-generate-001/i,
  /imagen-4\.0-generate-001/i,
  /imagen-4/i, // The Holy Grail
];

// ============================================================
// 2. CONFIGURATION TYPES & CACHE
// ============================================================

interface ModelConfig {
  textModel: string;
  imageModel: string;
  selectedAt: number;
}

interface CreativeOutput {
  reasoning: string;
  layout_id: 'VISUAL_SOLO' | 'HOOK_CENTER' | 'STORY_SPLIT';
  image_prompt: string;
  text_overlay: {
    headline: string;
    subtitle: string;
    suggested_font_color: string;
  };
}

let cachedConfig: ModelConfig | null = null;
const CONFIG_CACHE_TTL = 3600000; // 1 hour

// ============================================================
// 3. HELPER - Find the best model from available options
// ============================================================

function findBestModel(patterns: RegExp[], availableModels: string[]): string | null {
  let bestModel: string | null = null;
  let bestRank = -1;

  for (const model of availableModels) {
    for (let rank = 0; rank < patterns.length; rank++) {
      if (patterns[rank].test(model) && rank > bestRank) {
        bestRank = rank;
        bestModel = model;
      }
    }
  }

  return bestModel;
}

// ============================================================
// 5. MAIN EXPORT - Get best available models
// ============================================================

export async function getBestAvailableModels(forceRefresh = false) {
  // Return cached if fresh
  if (
    cachedConfig &&
    !forceRefresh &&
    Date.now() - cachedConfig.selectedAt < CONFIG_CACHE_TTL
  ) {
    console.log('📦 Using cached model config:', {
      textModel: cachedConfig.textModel,
      imageModel: cachedConfig.imageModel,
    });
    return {
      textModel: cachedConfig.textModel,
      imageModel: cachedConfig.imageModel,
    };
  }

  try {
    console.log('🔍 Selecting best available models...');

    // For production, you'd query the Vertex AI Model Garden API
    // For now, we use known available models
    const availableModels = [
      'gemini-3.0-pro',
      'gemini-3.0-flash',
      'gemini-2.0-flash-001',
      'gemini-2.0-pro-001',
      'gemini-1.5-pro-002',
      'gemini-1.5-flash-002',
      'imagen-4.0-generate-001',
      'imagen-3.0-generate-001',
    ];

    const textModel = findBestModel(TEXT_MODEL_PRIORITY, availableModels);
    const imageModel = findBestModel(IMAGE_MODEL_PRIORITY, availableModels);

    const config: ModelConfig = {
      textModel: textModel || 'gemini-2.0-flash-001',
      imageModel: imageModel || 'imagen-3.0-generate-001',
      selectedAt: Date.now(),
    };

    cachedConfig = config;

    console.log('✅ Selected models:', {
      textModel: config.textModel,
      imageModel: config.imageModel,
    });

    return {
      textModel: config.textModel,
      imageModel: config.imageModel,
    };
  } catch (error: any) {
    console.error('❌ Error selecting models, using fallback:', error?.message);

    const config: ModelConfig = {
      textModel: 'gemini-2.0-flash-001',
      imageModel: 'imagen-3.0-generate-001',
      selectedAt: Date.now(),
    };

    cachedConfig = config;

    return {
      textModel: config.textModel,
      imageModel: config.imageModel,
    };
  }
}

// ============================================================
// 6. THE "GOD PROMPT" - Creative Director System Prompt
// Uses Gemini 3's chain-of-thought reasoning for optimal layouts
// ============================================================

export function getCreativeDirectorSystemPrompt(): string {
  return `You are the Lead Creative Director at a high-end ad agency. Your goal is to translate a vague user request into a commercially viable visual asset using strategic reasoning.

### PHASE 1: STRATEGIC REASONING (Internal Monologue)
Analyze the User Request for:
1. **Commercial Intent:** Is this B2B (needs trust, authority) or B2C (needs emotion, vibrancy)?
2. **Visual Hierarchy:** Where must text sit for 100% legibility? (Dark images→white text, light images→dark text)
3. **The 'Click' Factor:** What visual element stops the scroll? What's the hero element?
4. **Brand Fit:** How does this align with the user's described brand/colors?

### PHASE 2: LAYOUT SELECTION
Choose exactly ONE layout:
- **VISUAL_SOLO**: Pure photography/mood board. No text. For atmosphere or hero images.
- **HOOK_CENTER**: Single punchy message. Text center or bottom-center. For ads with one key message.
- **STORY_SPLIT**: Image top 70%, solid text block bottom 30%. For detailed product stories.

### PHASE 3: ASSET GENERATION
Generate the JSON output below.

**Image Prompt Rules (CRITICAL):**
- You are prompting Imagen-4. It understands professional photography terms.
- ALWAYS specify: Lighting (Volumetric, Studio strobe, Golden hour, Rim light), Quality (8k, Octane render, Cinema 4D, Sony A7R IV, professional color grade)
- **NEGATIVE SPACE RULE:** If layout is NOT 'VISUAL_SOLO', APPEND: "Compose image with clean, low-detail area at [position] for text overlay. Avoid busy objects or high-contrast elements there."
- Avoid: Watermarks, logos (unless specified), low-quality renders, artificial backgrounds

**Copy Rules:**
- Headline: Max 5 words. Active voice. Benefit-driven.
- Subtitle: Max 12 words. Supporting message or call-to-action.

**Font Color Logic:**
- Light/bright images → Dark text (#000000, #333333)
- Dark/moody images → Light text (#FFFFFF, #F0F0F0)
- Always test high contrast for readability

### REQUIRED JSON OUTPUT:
{
  "reasoning": "Your strategic decision and rationale",
  "layout_id": "VISUAL_SOLO" | "HOOK_CENTER" | "STORY_SPLIT",
  "image_prompt": "Detailed Imagen-4 prompt with lighting, camera, composition",
  "text_overlay": {
    "headline": "Max 5 words",
    "subtitle": "Max 12 words",
    "suggested_font_color": "#FFFFFF" | "#000000"
  }
}

Create assets that stop scrolls, communicate instantly, and meet professional ad standards.`;
}

// ============================================================
// 7. GENERATION CONFIGURATIONS
// ============================================================

export const TEXT_GENERATION_CONFIG = {
  temperature: 0.4, // Lower for precision
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 2048,
};

export const IMAGE_GENERATION_CONFIG = {
  sampleCount: 1,
  aspectRatio: '16:9', // Wide format for web
};
