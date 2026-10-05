import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateAIEmployeeResponse } from '@/src/ai/providers';

const TaskExecuteSchema = z.object({
  taskId: z.string().min(1).max(128),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  aiEmployeeName: z.string().min(1).max(100),
  aiRole: z.string().min(1).max(120),
  provider: z
    .enum(['NVIDIA', 'GEMINI', 'OPENAI', 'ANTHROPIC', 'OPENROUTER'])
    .optional(),
  modelName: z.string().max(120).optional(),
  systemPrompt: z.string().max(2000),
  restrictions: z.string().max(1000).optional(),
  knowledgeContext: z.string().max(8000).optional(),
  autonomyLevel: z.number().int().min(0).max(4),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TaskExecuteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid AI task payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const taskPrompt = `You have been assigned the following task by your Human Supervisor:
TASK TITLE: ${data.title}
TASK DESCRIPTION: ${data.description}

Produce a structured executive deliverable containing:
1. Executive Summary & Strategy
2. Step-by-Step Execution Plan & Tool Invocations
3. Risk & Compliance Assessment (LOW / MEDIUM / HIGH / CRITICAL)
4. Expected KPI Impact`;

    const result = await generateAIEmployeeResponse({
      provider: data.provider || 'NVIDIA',
      modelName: data.modelName || 'meta/llama-3.1-70b-instruct',
      systemPrompt: data.systemPrompt,
      userPrompt: taskPrompt,
      restrictions: data.restrictions,
      knowledgeContext: data.knowledgeContext,
      temperature: 0.5,
    });

    // Determine if Human-in-the-Loop approval is required based on autonomy level or risk
    const requiresApproval =
      data.autonomyLevel <= 2 || Boolean(result.toolSuggested?.requiresApproval);

    return NextResponse.json({
      taskId: data.taskId,
      outputReport: result.text,
      providerUsed: result.providerUsed,
      modelUsed: result.modelUsed,
      estimatedCostUsd: result.estimatedCostUsd,
      requiresApproval,
      riskLevel: result.toolSuggested?.riskLevel || 'LOW',
      recommendedStatus: requiresApproval ? 'REVIEW' : 'COMPLETED',
    });
  } catch (error) {
    console.error('AI Task Execution Error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to execute AI task. Check provider configuration.',
      },
      { status: 500 }
    );
  }
}
