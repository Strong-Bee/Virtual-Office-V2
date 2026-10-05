import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateAIEmployeeResponse } from '@/src/ai/providers';

const ChatRequestSchema = z.object({
  provider: z
    .enum([
      'NVIDIA',
      'GEMINI',
      'OPENAI',
      'ANTHROPIC',
      'OPENROUTER',
      'OPENCLAW',
      'NINEROUTER',
    ])
    .optional(),
  modelName: z.string().max(120).optional(),
  systemPrompt: z.string().min(1).max(3000),
  userPrompt: z.string().min(1).max(4000),
  temperature: z.number().min(0).max(2).optional(),
  departmentContext: z.string().max(2000).optional(),
  knowledgeContext: z.string().max(8000).optional(),
  restrictions: z.string().max(2000).optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = ChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request payload for AI Employee chat.',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await generateAIEmployeeResponse(parsed.data);

    return NextResponse.json({
      aiEmployeeId: id,
      ...result,
    });
  } catch (error) {
    console.error('AI Employee Chat Error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'AI temporarily unavailable. The task has been paused.',
      },
      { status: 500 }
    );
  }
}
