import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_AI_EMPLOYEES } from '@/src/lib/seed-data';

export async function GET() {
  return NextResponse.json({
    employees: INITIAL_AI_EMPLOYEES,
    supportedProviders: [
      {
        id: 'NVIDIA',
        name: 'NVIDIA NIM (Llama 3.1 / Nemotron / DeepSeek)',
        defaultModel: 'meta/llama-3.1-70b-instruct',
      },
      {
        id: 'GEMINI',
        name: 'Google Gemini (gemini-3.8-flash)',
        defaultModel: 'gemini-3.8-flash',
      },
      {
        id: 'OPENAI',
        name: 'OpenAI Compatible API',
        defaultModel: 'gpt-4o',
      },
      {
        id: 'ANTHROPIC',
        name: 'Anthropic Claude',
        defaultModel: 'claude-3-5-sonnet',
      },
      {
        id: 'OPENROUTER',
        name: 'OpenRouter Unified API',
        defaultModel: 'meta-llama/llama-3.1-70b-instruct',
      },
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({
      status: 'validated',
      employee: body,
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid AI employee configuration' },
      { status: 400 }
    );
  }
}
