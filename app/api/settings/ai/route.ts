import { NextRequest, NextResponse } from 'next/server';
import { serverIntegrations } from '@/src/lib/server-integrations';
import { generateAIEmployeeResponse } from '@/src/ai/providers';
import { AIModelProvider } from '@/src/types';

const MODEL_CATALOG: Record<string, string[]> = {
  NVIDIA: [
    'meta/llama-3.1-70b-instruct',
    'meta/llama-3.1-405b-instruct',
    'nvidia/llama-3.1-nemotron-70b-instruct',
    'deepseek-ai/deepseek-r1',
    'mistralai/mixtral-8x22b-instruct-v0.1',
    'qwen/qwen2.5-72b-instruct',
  ],
  GEMINI: [
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
  ],
  OPENAI: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
  ANTHROPIC: ['claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest'],
  OPENROUTER: [
    'meta-llama/llama-3.1-70b-instruct',
    'deepseek/deepseek-r1',
    'anthropic/claude-3.5-sonnet',
  ],
};

export async function GET() {
  return NextResponse.json({
    settings: serverIntegrations.aiSettings,
    catalog: MODEL_CATALOG,
    providersStatus: {
      NVIDIA: Boolean(process.env.NVIDIA_API_KEY),
      GEMINI: Boolean(
        process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
      ),
      OPENAI: Boolean(process.env.OPENAI_API_KEY),
      ANTHROPIC: Boolean(process.env.ANTHROPIC_API_KEY),
      MIDTRANS: Boolean(process.env.MIDTRANS_SERVER_KEY),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'TEST_CONNECTION') {
      const provider = (body.provider ||
        serverIntegrations.aiSettings.defaultProvider) as AIModelProvider;
      const model =
        body.model || serverIntegrations.aiSettings.defaultModel;

      if (body.nvidiaBaseUrl) {
        serverIntegrations.aiSettings.nvidiaBaseUrl = body.nvidiaBaseUrl;
      }

      const start = Date.now();
      const response = await generateAIEmployeeResponse({
        provider,
        modelName: model,
        systemPrompt:
          'You are a system diagnostics node for NexusOS AI Virtual Office. Reply in 1 short sentence confirming your model status.',
        userPrompt: 'Ping test connection and confirm operational readiness.',
        temperature: 0.3,
      });
      const latencyMs = Date.now() - start;

      return NextResponse.json({
        ok: true,
        provider: response.providerUsed,
        model: response.modelUsed,
        latencyMs,
        reply: response.text.slice(0, 180),
      });
    }

    // Update global AI settings
    if (body.defaultProvider) {
      serverIntegrations.aiSettings.defaultProvider = body.defaultProvider;
    }
    if (body.defaultModel) {
      serverIntegrations.aiSettings.defaultModel = body.defaultModel;
    }
    if (body.nvidiaBaseUrl) {
      serverIntegrations.aiSettings.nvidiaBaseUrl = body.nvidiaBaseUrl;
    }
    if (typeof body.temperature === 'number') {
      serverIntegrations.aiSettings.temperature = body.temperature;
    }
    if (typeof body.maxTokens === 'number') {
      serverIntegrations.aiSettings.maxTokens = body.maxTokens;
    }
    if (typeof body.autoFallbackToGemini === 'boolean') {
      serverIntegrations.aiSettings.autoFallbackToGemini =
        body.autoFallbackToGemini;
    }

    return NextResponse.json({
      ok: true,
      settings: serverIntegrations.aiSettings,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : 'Failed to update AI settings',
      },
      { status: 500 }
    );
  }
}
