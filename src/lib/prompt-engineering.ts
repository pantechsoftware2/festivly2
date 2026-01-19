/**
 * Gemini-Powered Prompt Engineering System (The Brain)
 * Converts simple user input into detailed Imagen-4 prompts
 * Considers template selection and reserves negative space for text
 * Includes Tier detection system for dynamic request complexity
 */

export type TemplateType = 'full-image' | 'image-text' | 'two-column' | 'centered'

export type TierLevel = 1 | 2 | 3

export interface PromptEngineerOutput {
  imagen_prompt: string
  headline_suggestion: string
  subheadline_suggestion: string
  brand_vibe: string
  style_applied: string
  tier: TierLevel
  requirements: {
    image: boolean
    headline: boolean
    subtitle: boolean
    colors: boolean
  }
}

interface StyleChip {
  name: string
  prompt: string
}

// Style Chip Library - Creative prompt modifiers
const STYLE_CHIPS: StyleChip[] = [
  {
    name: 'Cinematic',
    prompt: 'cinematic lighting, depth of field, film noir, moody atmosphere, professional cinematography'
  },
  {
    name: 'Photorealistic',
    prompt: 'photorealistic, hyper-detailed, professional photography, 8K quality, studio lighting'
  },
  {
    name: 'Minimalist',
    prompt: 'minimalist design, clean composition, lots of white space, simple elegant lines'
  },
  {
    name: 'Vibrant',
    prompt: 'vibrant colors, high contrast, saturated palette, dynamic energy, bold composition'
  },
  {
    name: 'Moody',
    prompt: 'moody atmosphere, dark tones, dramatic shadows, mysterious lighting, atmospheric'
  },
  {
    name: 'Nature',
    prompt: 'natural lighting, organic elements, earth tones, botanical, garden aesthetic'
  },
  {
    name: 'Tech',
    prompt: 'futuristic, digital, neon accents, sci-fi elements, modern tech aesthetic, digital art'
  },
  {
    name: 'Luxury',
    prompt: 'luxury aesthetic, premium materials, gold accents, sophisticated, high-end styling'
  },
]

// Negative space constraints based on template
const TEMPLATE_NEGATIVE_SPACE: Record<TemplateType, string> = {
  'full-image': 'no text areas, fill entire canvas with image',
  'image-text': 'leave top 10% empty (50-100px height) for text overlay in solid color',
  'two-column': 'leave right 50% empty with solid background for text content',
  'centered': 'leave outer 8% margin as solid background color for spacing, center main content',
}

// Aspect ratio guidance per template
const TEMPLATE_ASPECT_RATIO: Record<TemplateType, string> = {
  'full-image': '9:11.25 aspect ratio (1080x1350px)',
  'image-text': 'image occupies 60% height, text area 40% height, 9:11.25 total aspect ratio',
  'two-column': 'left image 50% width, right text area 50% width, 9:11.25 total aspect ratio',
  'centered': 'centered composition with 8% margins on all sides, 9:11.25 total aspect ratio',
}

/**
 * Main prompt engineering function
 * Converts user input into detailed Imagen-4 prompt with brand context
 */
export function generateImagenPrompt(
  userInput: string,
  template: TemplateType = 'image-text',
  brandPrimaryColor?: string,
  styleChip?: StyleChip
): string {
  // Clean input
  const subject = userInput.trim()

  // Build the core prompt
  let prompt = `${subject}, `

  // Add style if provided
  if (styleChip) {
    prompt += `${styleChip.prompt}, `
  } else {
    // Default to photorealistic
    prompt += 'photorealistic, high quality, professional photography, '
  }

  // Add template-specific constraints
  prompt += `${TEMPLATE_NEGATIVE_SPACE[template]}, `

  // Add aspect ratio guidance
  prompt += `${TEMPLATE_ASPECT_RATIO[template]}, `

  // Add brand color context if provided
  if (brandPrimaryColor) {
    // Convert hex to color name if possible
    const colorName = hexToColorName(brandPrimaryColor)
    if (colorName) {
      prompt += `incorporate ${colorName} accent colors, `
    }
  }

  // Add quality improvements
  prompt += 'ultra high quality, 8K resolution, sharp focus, professional grade'

  return prompt
}

/**
 * Convert hex color to descriptive color name
 */
function hexToColorName(hex: string): string | null {
  const normalizedHex = hex.toLowerCase().replace('#', '')

  const colorMap: Record<string, string> = {
    '000000': 'black',
    'ffffff': 'white',
    'ff0000': 'red',
    '00ff00': 'green',
    '0000ff': 'blue',
    'ffff00': 'yellow',
    'ff00ff': 'magenta',
    '00ffff': 'cyan',
    'ff6600': 'orange',
    '800080': 'purple',
    '008000': 'dark green',
    '808080': 'gray',
    '4285f4': 'google blue',
    'ea4335': 'google red',
    '34a853': 'google green',
    'fbbc05': 'google yellow',
    'a2aaad': 'google gray',
    '555555': 'dark gray',
  }

  return colorMap[normalizedHex] || null
}

/**
 * System prompt for Gemini to enhance user prompts
 * This is used when you want AI to expand a simple prompt
 */
export function getGeminiSystemPrompt(): string {
  return `You are a world-class prompt engineer for image generation AI (Imagen-4). 
Your role is to transform simple user prompts into detailed, vivid, production-ready image generation prompts.

Guidelines:
1. Take user input like "coffee" and expand it into a rich, visual description
2. Always consider the design template being used (full-image, image-text, two-column, centered)
3. If using templates 2-4, ALWAYS reserve negative space for text content:
   - Image+Text: Leave top 10% empty for text
   - Two-Column: Leave right 50% empty for text
   - Centered: Leave 8% margins for spacing
4. Include specific visual details: lighting, composition, materials, mood, style
5. Specify technical quality: "8K resolution, ultra high quality, photorealistic"
6. Keep prompts under 300 words but highly descriptive
7. Avoid asking for text to be displayed in the image
8. Focus on visual elements that work well with the chosen template

Your output should be a single refined prompt ready for Imagen-4.`
}

/**
 * Generate a marketing headline using Gemini
 * This is called when user selects an image to create auto-text overlay
 */
export function generateHeadlinePrompt(subject: string): string {
  return `Generate a single, short marketing headline (5 words max) for a design image about "${subject}". Be creative and punchy. Return ONLY the headline text, nothing else.`
}

/**
 * Generate text rendering prompt for Imagen-4
 * Special mode: renders text directly in the image
 * Example: "SALE" -> "Render the word SALE in bold neon smoke effect, cinematic lighting"
 */
export function generateTextRenderingPrompt(text: string, style?: StyleChip): string {
  const stylePrompt = style ? style.prompt : 'cinematic, professional'
  
  return `Render the word "${text}" in ${stylePrompt}, bold typography, dramatic composition, high contrast, 8K resolution, professional design, centered, artistic effects`
}

/**
 * Build prompt with optional text baking/rendering
 * If useAIText is true, include instruction to render text in the image itself
 */
export function buildPromptWithTextRendering(
  subject: string,
  text: string,
  useAIText: boolean,
  template: TemplateType,
  style?: StyleChip
): string {
  if (useAIText && text) {
    // Text baking mode: render text IN the image itself
    const stylePrompt = style ? style.prompt : 'cinematic, professional'
    return `Background: ${subject}, with text "${text}" rendered ${stylePrompt}, bold typography, dramatic composition, high contrast, 8K resolution, professional design`
  }
  
  // Normal mode: generate image without text
  return buildCompletPrompt({
    subject,
    template,
    style,
  })
}

/**
 * Get available style chips for UI selection
 */
export function getStyleChips(): StyleChip[] {
  return STYLE_CHIPS
}

/**
 * Build a complete prompt with all context
 */
export function buildCompletPrompt(options: {
  subject: string
  template: TemplateType
  style?: StyleChip
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
}): string {
  let prompt = options.subject

  // Add style context
  if (options.style) {
    prompt += `, ${options.style.prompt}`
  } else {
    prompt += ', photorealistic, high quality'
  }

  // Add template-specific requirements
  const negativeSpace = TEMPLATE_NEGATIVE_SPACE[options.template]
  prompt += `, ${negativeSpace}`

  // Add colors if available
  const colors = []
  if (options.primaryColor) colors.push(hexToColorName(options.primaryColor) || 'primary')
  if (options.secondaryColor) colors.push(hexToColorName(options.secondaryColor) || 'secondary')
  if (options.accentColor) colors.push(hexToColorName(options.accentColor) || 'accent')

  if (colors.length > 0) {
    prompt += `, color palette: ${colors.join(', ')}`
  }

  // Add final quality notes
  prompt += ', 8K resolution, ultra high quality, professional grade'

  return prompt
}

/**
 * Build a complete structured prompt output for Imagen-4
 * Returns JSON with prompt, headlines, and metadata
 */
export function buildStructuredPrompt(options: {
  subject: string
  template: TemplateType
  brandVibe?: string
  brandColors?: { primary?: string; secondary?: string; accent?: string }
  style?: StyleChip
}): PromptEngineerOutput {
  let prompt = options.subject

  // Add style context
  if (options.style) {
    prompt += `, ${options.style.prompt}`
  } else {
    prompt += ', photorealistic, high quality'
  }

  // Add template-specific requirements and negative space for text
  const negativeSpace = TEMPLATE_NEGATIVE_SPACE[options.template]
  prompt += `, ${negativeSpace}`

  // Add brand vibe if available
  if (options.brandVibe) {
    prompt += `, matching brand vibe: ${options.brandVibe}`
  }

  // Add colors if available
  const colors = []
  if (options.brandColors?.primary) {
    colors.push(hexToColorName(options.brandColors.primary) || 'primary')
  }
  if (options.brandColors?.secondary) {
    colors.push(hexToColorName(options.brandColors.secondary) || 'secondary')
  }
  if (options.brandColors?.accent) {
    colors.push(hexToColorName(options.brandColors.accent) || 'accent')
  }

  if (colors.length > 0) {
    prompt += `, color palette: ${colors.join(', ')}`
  }

  // Add final quality notes
  prompt += ', 8K resolution, ultra high quality, professional grade'

  // Generate headline and subheadline suggestions
  const headline = generateHeadlineFromSubject(options.subject)
  const subheadline = generateSubheadlineFromVibe(options.brandVibe || options.style?.name || 'Professional')

  return {
    imagen_prompt: prompt,
    headline_suggestion: headline,
    subheadline_suggestion: subheadline,
    brand_vibe: options.brandVibe || options.style?.name || 'Professional',
    style_applied: options.style?.name || 'Default',
    tier: 1,
    requirements: {
      image: true,
      headline: false,
      subtitle: false,
      colors: false,
    }
  }
}

/**
 * Generate headline from subject
 */
function generateHeadlineFromSubject(subject: string): string {
  // Extract key words and create punchy headline
  const keywords = subject.split(' ').filter(w => w.length > 3)
  if (keywords.length === 0) return subject.toUpperCase()
  
  // Capitalize and limit to 5 words
  const headline = keywords.slice(0, 5).join(' ').toUpperCase()
  return headline.substring(0, 50)
}

/**
 * Generate subheadline from brand vibe
 */
function generateSubheadlineFromVibe(vibe: string): string {
  const subheadlines: Record<string, string> = {
    'Cinematic': 'Bold visuals, unforgettable moments',
    'Photorealistic': 'Authentic, professional quality',
    'Minimalist': 'Simple. Clean. Elegant.',
    'Vibrant': 'Dynamic energy, vivid impact',
    'Moody': 'Atmospheric, sophisticated depth',
    'Nature': 'Organic, authentic, natural beauty',
    'Tech': 'Future-forward, innovative design',
    'Luxury': 'Premium craftsmanship, elevated elegance',
    'Professional': 'Polished, reliable, trustworthy'
  }
  return subheadlines[vibe] || 'Designed with excellence'
}

/**
 * Tier Detection System - "The Brain" analyzes request complexity
 * 
 * Tier 1 (Simple): Just an image
 * - Keywords: product, object, simple, minimal
 * - Requirements: Image only
 * 
 * Tier 2 (Standard): Image + text overlay
 * - Keywords: launch, announce, campaign, banner
 * - Requirements: Image + Headline
 * 
 * Tier 3 (Story): Complete scene with headline, subtitle, and composed shot
 * - Keywords: luxury, premium, exclusive, story, collection, presentation
 * - Requirements: Photorealistic image + Headline + Subtitle + Composition
 */
export function detectTier(userPrompt: string): TierLevel {
  const prompt = userPrompt.toLowerCase()
  
  // Keywords that indicate Tier 3 (Story/Presentation)
  const tier3Keywords = [
    'luxury', 'premium', 'exclusive', 'story', 'collection',
    'presentation', 'launch', 'premiere', 'unveil', 'reveal',
    'showcase', 'spectacular', 'gold', 'jewel', 'diamond',
    'elegant', 'sophisticated', 'high-end', 'upscale',
    'watch', 'jewelry', 'fragrance', 'couture', 'designer',
    'flagship', 'limited edition', 'artisan', 'heritage'
  ]
  
  // Keywords that indicate Tier 2 (Standard)
  const tier2Keywords = [
    'campaign', 'banner', 'announce', 'present', 'promote',
    'social', 'post', 'design', 'graphic', 'poster',
    'ad', 'advertisement', 'marketing', 'promotional'
  ]
  
  // Check for Tier 3 keywords
  if (tier3Keywords.some(keyword => prompt.includes(keyword))) {
    return 3
  }
  
  // Check for Tier 2 keywords
  if (tier2Keywords.some(keyword => prompt.includes(keyword))) {
    return 2
  }
  
  // Default to Tier 1
  return 1
}

/**
 * Get requirements based on tier level
 */
export function getTierRequirements(tier: TierLevel): {
  image: boolean
  headline: boolean
  subtitle: boolean
  colors: boolean
  template: TemplateType
  loadingMessages: string[]
} {
  const baseMessages = [
    'Analyzing Intent...',
    'Processing Requirements...',
  ]
  
  switch (tier) {
    case 1:
      return {
        image: true,
        headline: false,
        subtitle: false,
        colors: false,
        template: 'full-image',
        loadingMessages: [...baseMessages, 'Generating Image...'],
      }
    case 2:
      return {
        image: true,
        headline: true,
        subtitle: false,
        colors: false,
        template: 'image-text',
        loadingMessages: [...baseMessages, 'Drafting Copy...', 'Composing Shot...'],
      }
    case 3:
      return {
        image: true,
        headline: true,
        subtitle: true,
        colors: true,
        template: 'image-text',
        loadingMessages: [
          'Analyzing Intent...',
          'Understanding Brief...',
          'Selecting Style...',
          'Drafting Headline...',
          'Composing Shot...',
          'Rendering Premium Quality...',
        ],
      }
    default:
      return {
        image: true,
        headline: false,
        subtitle: false,
        colors: false,
        template: 'full-image',
        loadingMessages: baseMessages,
      }
  }
}

/**
 * Build structured output with tier detection
 */
export function buildEnhancedPrompt(userInput: string): PromptEngineerOutput {
  const tier = detectTier(userInput)
  const requirements = getTierRequirements(tier)
  
  const prompt = buildCompletPrompt({
    subject: userInput,
    template: requirements.template,
    style: STYLE_CHIPS[Math.floor(Math.random() * STYLE_CHIPS.length)],
  })
  
  const headline = tier >= 2 ? generateHeadlineFromSubject(userInput) : ''
  const subheadline = tier === 3 ? generateSubheadlineFromVibe('Professional') : ''
  
  return {
    imagen_prompt: prompt,
    headline_suggestion: headline,
    subheadline_suggestion: subheadline,
    brand_vibe: 'Professional',
    style_applied: 'Adaptive',
    tier,
    requirements: {
      image: requirements.image,
      headline: requirements.headline,
      subtitle: requirements.subtitle,
      colors: requirements.colors,
    },
  }
}


