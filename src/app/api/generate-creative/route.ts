/**
 * API Route: /api/generate-creative
 * The "God Prompt" - Gemini 3 Chain-of-Thought Creative Direction
 * 
 * Implements the three phases:
 * Phase 1: Strategic Reasoning (Analyze intent, commercial angle)
 * Phase 2: Layout Selection (VISUAL_SOLO, HOOK_CENTER, STORY_SPLIT)
 * Phase 3: Asset Generation (Image prompt + Copy)
 */

import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';
import {
  getBestAvailableModels,
  getCreativeDirectorSystemPrompt,
  TEXT_GENERATION_CONFIG,
} from '@/lib/ai-config';

interface CreativeRequest {
  userPrompt: string;
  brandColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  userId?: string;
}

interface CreativeOutput {
  reasoning: string;
  layout_id: 'VISUAL_SOLO' | 'HOOK_CENTER' | 'STORY_SPLIT';
  image_prompt: string;
  headline: string;
  subtitle: string;
  suggested_font_color: string;
  model: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const body: CreativeRequest = await request.json();
    const { userPrompt, brandColors, userId } = body;

    if (!userPrompt || !userPrompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'User prompt is required' },
        { status: 400 }
      );
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('🧠 THE GOD PROMPT: Gemini 3 Creative Direction');
    console.log('='.repeat(60));
    console.log(`📝 User Brief: ${userPrompt}`);
    if (brandColors?.primary) {
      console.log(`🎨 Brand Colors:`, brandColors);
    }

    // Get the best available model
    const models = await getBestAvailableModels();
    const selectedModel = models.textModel;
    console.log(`🤖 Using Model: ${selectedModel}`);

    // Initialize Vertex AI
    const vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT_ID,
      location: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
    });

    // Get system prompt from ai-config
    const systemPrompt = getCreativeDirectorSystemPrompt();

    // Build user message with context
    const userMessage = `
Marketing Brief: "${userPrompt}"

${
  brandColors
    ? `Brand Colors:
- Primary: ${brandColors.primary || 'Not specified'}
- Secondary: ${brandColors.secondary || 'Not specified'}
- Accent: ${brandColors.accent || 'Not specified'}

Incorporate these brand colors into your visual recommendations.`
    : 'Choose colors that enhance the marketing message.'
}

Please analyze this brief using your strategic reasoning and return the complete JSON output.`;

    console.log(`\n💭 Phase 1: Analyzing Intent...`);
    console.log(`💭 Phase 2: Selecting Layout...`);
    console.log(`💭 Phase 3: Generating Assets...`);

    // Call Gemini with the creative director system prompt
    const generativeModel = vertexAI.getGenerativeModel({
      model: selectedModel,
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemPrompt }],
      },
    });

    const response = await generativeModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: userMessage }],
        },
      ],
      generationConfig: {
        temperature: TEXT_GENERATION_CONFIG.temperature,
        topK: TEXT_GENERATION_CONFIG.topK,
        topP: TEXT_GENERATION_CONFIG.topP,
        maxOutputTokens: TEXT_GENERATION_CONFIG.maxOutputTokens,
      },
    });

    const content = response.response.candidates?.[0]?.content;
    if (!content?.parts || content.parts.length === 0) {
      throw new Error('No response content');
    }

    const responseText = (content.parts[0] as any)?.text;
    if (!responseText) {
      throw new Error('No text in response');
    }

    // Parse JSON response
    let creative;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/) || responseText.match(/```json\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      creative = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse creative response:', parseError);
      throw new Error('Failed to parse creative direction');
    }

    // Validate response
    if (!creative.reasoning || !creative.layout_id || !creative.image_prompt || !creative.text_overlay) {
      throw new Error('Invalid creative response structure');
    }

    console.log(`\n✅ Creative Direction Complete:`);
    console.log(`   Layout: ${creative.layout_id}`);
    console.log(`   Headline: ${creative.text_overlay.headline}`);
    console.log(`   Subtitle: ${creative.text_overlay.subtitle}`);
    console.log('='.repeat(60));

    return NextResponse.json(
      {
        success: true,
        creative: {
          reasoning: creative.reasoning,
          layout_id: creative.layout_id,
          image_prompt: creative.image_prompt,
          headline: creative.text_overlay.headline,
          subtitle: creative.text_overlay.subtitle,
          suggested_font_color: creative.text_overlay.suggested_font_color,
          model: selectedModel,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error in /api/generate-creative:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to generate creative' },
      { status: 500 }
    );
  }
}
