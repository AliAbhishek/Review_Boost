


































import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { IRestaurant, BUSINESS_CONFIG } from '../models/Restaurant';

export interface ReviewOption {
  style: 'casual' | 'detailed' | 'short';
  text: string;
}

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: env.CLAUDE_API_KEY });
  }
  return anthropicClient;
}

function buildPrompt(restaurant: IRestaurant, stars: number): string {
  const config = BUSINESS_CONFIG[restaurant.businessType] ?? BUSINESS_CONFIG.other;
  const serviceList = restaurant.services.slice(0, 3).join(', ');
  const lowRating = stars <= 3;

  return `You are helping a customer write a genuine review for a ${config.label}.

Business details:
- Name: ${restaurant.name}
- Type: ${config.label}
${serviceList ? `- Top ${config.serviceLabel}: ${serviceList}` : ''}
${restaurant.description ? `- About: ${restaurant.description}` : ''}
- Rating given: ${stars}/5 stars

Generate exactly 3 review options in the following JSON format. Return ONLY valid JSON, no markdown, no explanation:
[
  {
    "style": "casual",
    "text": "conversational review, 40-60 words"
  },
  {
    "style": "detailed",
    "text": "thorough review covering quality, atmosphere and staff, 80-100 words"
  },
  {
    "style": "short",
    "text": "punchy impactful review, 20-30 words"
  }
]

Rules:
- Each review must sound like a real human wrote it — vary sentence structure, avoid corporate language
${serviceList ? `- Mention at least one specific item from the ${config.serviceLabel} list above` : ''}
- ${lowRating ? `Since the rating is ${stars}/5, naturally weave in one genuine area for improvement without being harsh` : 'Keep the tone positive and enthusiastic'}
- Do NOT mention ReviewBoost, AI, or review generation
- Vary the vocabulary and tone across all three styles`;
}

export async function generateReviews(
  restaurant: IRestaurant,
  stars: number,
): Promise<ReviewOption[]> {
  const prompt = buildPrompt(restaurant, stars);
  const client = getClient();

  let message: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (err) {
    const e = err as { status?: number; message?: string; error?: unknown };
    logger.error(
      `Claude API call failed — status=${e.status ?? 'unknown'} message="${e.message ?? String(err)}" body=${JSON.stringify(e.error ?? null)}`,
    );
    throw err;
  }

  const block = message.content[0];
  if (block.type !== 'text') throw new Error('Unexpected non-text response from Claude');

  // Strip markdown code fences if Claude wraps the JSON despite instructions
  const raw = block.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  let reviews: ReviewOption[];
  try {
    reviews = JSON.parse(raw) as ReviewOption[];
  } catch {
    logger.error(`Failed to parse Claude response as JSON: ${raw}`);
    throw new Error('AI service returned invalid JSON');
  }

  if (!Array.isArray(reviews) || reviews.length !== 3) {
    throw new Error('AI service returned unexpected review count');
  }

  return reviews;
}
