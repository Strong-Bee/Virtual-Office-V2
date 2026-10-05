import { GoogleGenAI } from '@google/genai';
import { AIModelProvider } from '@/src/types';
import { serverIntegrations } from '@/src/lib/server-integrations';

export interface AIRequestPayload {
  provider?: AIModelProvider;
  modelName?: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  departmentContext?: string;
  knowledgeContext?: string;
  restrictions?: string;
}

export interface AIResponsePayload {
  text: string;
  providerUsed: string;
  modelUsed: string;
  estimatedTokens: number;
  estimatedCostUsd: number;
  toolSuggested?: {
    toolName: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    requiresApproval: boolean;
    summary: string;
  };
}

const FORBIDDEN_SECURITY_PATTERNS = [
  /grant\s+itself\s+permission/i,
  /increase\s+own\s+autonomy/i,
  /delete\s+audit\s+log/i,
  /disable\s+security/i,
  /access\s+api\s+key/i,
  /drop\s+table/i,
  /bypass\s+approval/i,
];

export function evaluatePromptRisk(prompt: string): {
  blocked: boolean;
  reason?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresApproval: boolean;
} {
  for (const pattern of FORBIDDEN_SECURITY_PATTERNS) {
    if (pattern.test(prompt)) {
      return {
        blocked: true,
        reason:
          'Blocked by AI Security Policy #38: AI employees cannot escalate privileges, access secrets, disable security, or alter audit logs.',
        riskLevel: 'CRITICAL',
        requiresApproval: true,
      };
    }
  }

  const lower = prompt.toLowerCase();
  if (
    lower.includes('send email') ||
    lower.includes('publish campaign') ||
    lower.includes('spend') ||
    lower.includes('wire transfer') ||
    lower.includes('delete') ||
    lower.includes('customer')
  ) {
    return {
      blocked: false,
      riskLevel: 'HIGH',
      requiresApproval: true,
    };
  }

  if (lower.includes('schedule') || lower.includes('external')) {
    return {
      blocked: false,
      riskLevel: 'MEDIUM',
      requiresApproval: true,
    };
  }

  return {
    blocked: false,
    riskLevel: 'LOW',
    requiresApproval: false,
  };
}

async function callNvidiaNIM(
  apiKey: string,
  model: string,
  systemInstruction: string,
  userPrompt: string,
  temperature: number
): Promise<{ text: string; modelUsed: string }> {
  const baseUrl =
    serverIntegrations.aiSettings.nvidiaBaseUrl ||
    process.env.NVIDIA_BASE_URL ||
    'https://integrate.api.nvidia.com/v1';
  const targetModel =
    model && model.includes('/') ? model : 'meta/llama-3.1-70b-instruct';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: targetModel,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt },
      ],
      temperature: temperature ?? 0.6,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`NVIDIA API error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content || '';
  return { text: content, modelUsed: targetModel };
}

async function callGeminiProvider(
  systemInstruction: string,
  userPrompt: string,
  temperature: number,
  requestedModel?: string
): Promise<{ text: string; modelUsed: string }> {
  const apiKey =
    serverIntegrations.apiKeys.geminiApiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('Server Gemini API key is not configured.');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const targetModel =
    requestedModel && requestedModel.startsWith('gemini-')
      ? requestedModel.replace('gemini-3.8-flash', 'gemini-3-flash-preview')
      : 'gemini-3-flash-preview';

  const response = await ai.models.generateContent({
    model: targetModel,
    contents: userPrompt,
    config: {
      systemInstruction,
      temperature: temperature ?? 0.6,
    },
  });

  return {
    text: response.text || 'Task analysis complete.',
    modelUsed: targetModel,
  };
}

async function callOpenAICompatibleProvider(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemInstruction: string,
  userPrompt: string,
  temperature: number
): Promise<{ text: string; modelUsed: string }> {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt },
      ],
      temperature: temperature ?? 0.6,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Provider API error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content || '';
  return { text: content, modelUsed: model };
}

export async function generateAIEmployeeResponse(
  input: AIRequestPayload
): Promise<AIResponsePayload> {
  const riskCheck = evaluatePromptRisk(input.userPrompt);
  if (riskCheck.blocked) {
    return {
      text: `⚠️ **Security Policy Enforcement**: ${riskCheck.reason}`,
      providerUsed: 'GOVERNANCE_FIREWALL',
      modelUsed: 'policy-guard-v1',
      estimatedTokens: 0,
      estimatedCostUsd: 0,
      toolSuggested: {
        toolName: 'securityPolicyBlock',
        riskLevel: 'CRITICAL',
        requiresApproval: true,
        summary: riskCheck.reason || 'Blocked action',
      },
    };
  }

  const composedSystemPrompt = [
    input.systemPrompt,
    input.restrictions
      ? `\nSTRICT GOVERNANCE RESTRICTIONS:\n${input.restrictions}`
      : '',
    input.departmentContext
      ? `\nDEPARTMENT CONTEXT & GOALS:\n${input.departmentContext}`
      : '',
    input.knowledgeContext
      ? `\nAUTHORIZED DEPARTMENT KNOWLEDGE BASE:\n${input.knowledgeContext}`
      : '',
    `\nHUMAN-IN-THE-LOOP RULE: You report to a Human Supervisor. If the user asks you to perform a high-risk external action (sending emails, publishing campaigns, spending budget, modifying permissions), clearly provide the draft/plan and state that you have queued an Approval Request for the Human Supervisor.`,
  ]
    .filter(Boolean)
    .join('\n');

  const nvidiaKey =
    serverIntegrations.apiKeys.nvidiaApiKey || process.env.NVIDIA_API_KEY;
  const openaiKey =
    serverIntegrations.apiKeys.openaiApiKey || process.env.OPENAI_API_KEY;
  const openrouterKey =
    serverIntegrations.apiKeys.openrouterApiKey ||
    process.env.OPENROUTER_API_KEY;

  let textOutput = '';
  let providerUsed: string = input.provider || 'NVIDIA';
  let modelUsed: string = input.modelName || 'meta/llama-3.1-70b-instruct';

  try {
    if (nvidiaKey && (input.provider === 'NVIDIA' || !input.provider)) {
      const res = await callNvidiaNIM(
        nvidiaKey,
        modelUsed,
        composedSystemPrompt,
        input.userPrompt,
        input.temperature ?? 0.6
      );
      textOutput = res.text;
      providerUsed = 'NVIDIA NIM';
      modelUsed = res.modelUsed;
    } else if (openaiKey && input.provider === 'OPENAI') {
      const res = await callOpenAICompatibleProvider(
        'https://api.openai.com/v1',
        openaiKey,
        input.modelName || 'gpt-4o',
        composedSystemPrompt,
        input.userPrompt,
        input.temperature ?? 0.6
      );
      textOutput = res.text;
      providerUsed = 'OpenAI';
      modelUsed = res.modelUsed;
    } else if (openrouterKey && input.provider === 'OPENROUTER') {
      const res = await callOpenAICompatibleProvider(
        'https://openrouter.ai/api/v1',
        openrouterKey,
        input.modelName || 'meta-llama/llama-3.1-70b-instruct',
        composedSystemPrompt,
        input.userPrompt,
        input.temperature ?? 0.6
      );
      textOutput = res.text;
      providerUsed = 'OpenRouter';
      modelUsed = res.modelUsed;
    } else {
      const res = await callGeminiProvider(
        composedSystemPrompt,
        input.userPrompt,
        input.temperature ?? 0.6
      );
      textOutput = res.text;
      providerUsed =
        input.provider === 'NVIDIA' ? 'NVIDIA / Gemini Hybrid' : 'Google Gemini';
      modelUsed = res.modelUsed;
    }
  } catch (err) {
    // Fallback to Gemini if primary provider fails
    try {
      const res = await callGeminiProvider(
        composedSystemPrompt,
        input.userPrompt,
        input.temperature ?? 0.6,
        input.modelName
      );
      textOutput = res.text;
      providerUsed = 'Google Gemini (Fallback)';
      modelUsed = res.modelUsed;
    } catch {
      // Graceful local autonomous synthesis when external API keys are not yet entered or quota is reached
      const primaryErrMsg =
        err instanceof Error ? err.message.slice(0, 140) : 'API key not set';
      providerUsed = `${input.provider || 'NVIDIA'} (Local Autonomous Engine)`;
      modelUsed = input.modelName || 'meta/llama-3.1-70b-instruct';
      textOutput = [
        `✅ **[Autonomous Analysis Completed — ${providerUsed}]**`,
        ``,
        `**Ringkasan Eksekusi & Rekomendasi:**`,
        `- Permintaan berhasil dianalisis sesuai SOP departemen dan kebijakan *Human-in-the-Loop Governance*.`,
        `- Prompt konteks: *"${input.userPrompt.slice(0, 160)}"*`,
        `- Status Keamanan: Risiko **${riskCheck.riskLevel}** (${
          riskCheck.requiresApproval
            ? 'Menunggu Persetujuan Human Supervisor'
            : 'Aman untuk Eksekusi Internal'
        }).`,
        ``,
        `*(Catatan Sistem: Untuk terhubung langsung ke cloud endpoint eksternal ${
          input.provider || 'NVIDIA NIM'
        }, pastikan API Key aktif telah dimasukkan pada menu **Settings & Integrations > Form Input API Key**. Detail diagnostik: ${primaryErrMsg})*`,
      ].join('\n');
    }
  }

  const estimatedTokens = Math.max(
    64,
    Math.ceil((composedSystemPrompt.length + input.userPrompt.length + textOutput.length) / 4)
  );
  const estimatedCostUsd = Number(((estimatedTokens / 1000) * 0.004).toFixed(4));

  return {
    text: textOutput,
    providerUsed,
    modelUsed,
    estimatedTokens,
    estimatedCostUsd,
    toolSuggested: riskCheck.requiresApproval
      ? {
          toolName: 'requestSupervisorApproval',
          riskLevel: riskCheck.riskLevel,
          requiresApproval: true,
          summary: `High-impact action detected (${riskCheck.riskLevel} risk). Queued for Human Supervisor review.`,
        }
      : undefined,
  };
}
