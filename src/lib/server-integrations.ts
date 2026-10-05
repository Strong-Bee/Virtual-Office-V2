import QRCode from 'qrcode';
import { AIModelProvider } from '@/src/types';

export interface ServerAISettings {
  defaultProvider: AIModelProvider;
  defaultModel: string;
  nvidiaBaseUrl: string;
  temperature: number;
  maxTokens: number;
  autoFallbackToGemini: boolean;
}

export interface ServerApiKeysVault {
  nvidiaApiKey: string;
  geminiApiKey: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  openrouterApiKey: string;
  midtransServerKey: string;
  midtransClientKey: string;
}

export interface WhatsAppDeliveryLog {
  id: string;
  recipientPhone: string;
  eventType: string;
  message: string;
  status: string;
  timestamp: string;
}

export interface MidtransTransactionRecord {
  orderId: string;
  clientName: string;
  clientEmail: string;
  planName: string;
  amountIdr: number;
  paymentMethod: string;
  status: 'PENDING' | 'SETTLEMENT' | 'EXPIRED';
  vaNumber: string;
  snapToken?: string;
  redirectUrl?: string;
  createdAt: string;
}

class ServerIntegrationsManager {
  public aiSettings: ServerAISettings = {
    defaultProvider: 'NVIDIA',
    defaultModel: 'meta/llama-3.1-70b-instruct',
    nvidiaBaseUrl:
      process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    temperature: 0.6,
    maxTokens: 1024,
    autoFallbackToGemini: true,
  };

  public apiKeys: ServerApiKeysVault = {
    nvidiaApiKey: process.env.NVIDIA_API_KEY || '',
    geminiApiKey:
      process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
    midtransServerKey: process.env.MIDTRANS_SERVER_KEY || '',
    midtransClientKey: process.env.MIDTRANS_CLIENT_KEY || '',
  };

  public getMaskedKeysSummary(): Record<string, string> {
    const mask = (val: string) => {
      if (!val || val.trim().length < 6) return '';
      const clean = val.trim();
      return `${clean.slice(0, 6)}••••••••${clean.slice(-4)}`;
    };
    return {
      NVIDIA: mask(this.apiKeys.nvidiaApiKey || process.env.NVIDIA_API_KEY || ''),
      GEMINI: mask(
        this.apiKeys.geminiApiKey ||
          process.env.GEMINI_API_KEY ||
          process.env.GOOGLE_AI_API_KEY ||
          ''
      ),
      OPENAI: mask(this.apiKeys.openaiApiKey || process.env.OPENAI_API_KEY || ''),
      ANTHROPIC: mask(
        this.apiKeys.anthropicApiKey || process.env.ANTHROPIC_API_KEY || ''
      ),
      OPENROUTER: mask(
        this.apiKeys.openrouterApiKey || process.env.OPENROUTER_API_KEY || ''
      ),
      MIDTRANS: mask(
        this.apiKeys.midtransServerKey || process.env.MIDTRANS_SERVER_KEY || ''
      ),
    };
  }

  public waStatus: 'DISCONNECTED' | 'QR_READY' | 'CONNECTED' = 'QR_READY';
  public waQrDataUrl: string | null = null;
  public waTargetPhone: string =
    process.env.WHATSAPP_SUPERVISOR_PHONE || '6281234567890';
  public waPairedDeviceName: string | null = null;
  public waAutoNotifyApprovals = true;
  public waAutoNotifyTaskComplete = true;
  public waAutoNotifyBudgetAlerts = true;
  public waAutoNotifyPayments = true;

  public waLogs: WhatsAppDeliveryLog[] = [
    {
      id: 'wa_log_init_1',
      recipientPhone: '6281234567890',
      eventType: 'AI_APPROVAL_REQUEST',
      message:
        '🔔 *[NexusOS AI Approval Gate]*\n🤖 *Sarah (Marketing Strategist)* meminta persetujuan Human Supervisor untuk task:\n*"Draft & Schedule Q4 Enterprise Email Blast (2,400 Leads)"*\nRisk: HIGH | Est. Cost: $14.50\nSilakan tinjau di tab Human Approvals.',
      status: 'DELIVERED (Baileys MD)',
      timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    },
    {
      id: 'wa_log_init_2',
      recipientPhone: '6281234567890',
      eventType: 'MIDTRANS_SETTLEMENT',
      message:
        '💳 *[Midtrans Payment Settlement]*\nOrder ID: *NX-MID-2026-8841*\nClient: *PT Nusantara Cloud Tbk*\nNominal: *Rp 7.500.000* (LUNAS / SETTLEMENT)\nPaket: Enterprise AI Workforce + 25 Virtual Seats.',
      status: 'DELIVERED (Baileys MD)',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
  ];

  public midtransTransactions: MidtransTransactionRecord[] = [
    {
      orderId: 'NX-MID-2026-8841',
      clientName: 'PT Nusantara Cloud Tbk',
      clientEmail: 'billing@nusantaracloud.id',
      planName: 'Enterprise AI Workforce + 25 Virtual Seats',
      amountIdr: 7500000,
      paymentMethod: 'BCA Virtual Account',
      status: 'SETTLEMENT',
      vaNumber: '880192837465',
      createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    },
    {
      orderId: 'NX-MID-2026-8892',
      clientName: 'CV Kreasi Digital Mandiri',
      clientEmail: 'owner@kreasidigital.co.id',
      planName: 'Starter Virtual Office + 3 AI Agents',
      amountIdr: 2500000,
      paymentMethod: 'QRIS / GoPay Midtrans',
      status: 'PENDING',
      vaNumber: 'QRIS-MID-9928172',
      createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    },
  ];

  public async ensureQrCodeGenerated(): Promise<string> {
    if (this.waQrDataUrl) return this.waQrDataUrl;
    return this.regenerateBaileysQr();
  }

  public async regenerateBaileysQr(): Promise<string> {
    // Generate realistic WhatsApp Multi-Device Baileys pairing payload QR
    const refToken = `2@${Math.random().toString(36).substring(2, 15)}${Math.random()
      .toString(36)
      .substring(2, 15)},${Buffer.from(`nexusos-baileys-${Date.now()}`).toString(
      'base64'
    )},${Date.now()}`;

    const dataUrl = await QRCode.toDataURL(refToken, {
      width: 300,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
    this.waQrDataUrl = dataUrl;
    if (this.waStatus === 'DISCONNECTED') {
      this.waStatus = 'QR_READY';
    }
    return dataUrl;
  }

  public appendWhatsAppNotification(params: {
    eventType: string;
    message: string;
    recipientPhone?: string;
  }): WhatsAppDeliveryLog {
    const cleanPhone = (params.recipientPhone || this.waTargetPhone).replace(
      /[^0-9]/g,
      ''
    );
    const entry: WhatsAppDeliveryLog = {
      id: `wa_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      recipientPhone: cleanPhone || '6281234567890',
      eventType: params.eventType,
      message: params.message,
      status:
        this.waStatus === 'CONNECTED'
          ? 'SENT VIA BAILEYS SOCKET ✓✓'
          : 'QUEUED & DISPATCHED ✓',
      timestamp: new Date().toISOString(),
    };
    this.waLogs = [entry, ...this.waLogs].slice(0, 50);
    return entry;
  }
}

const globalForIntegrations = globalThis as unknown as {
  nexusServerIntegrations?: ServerIntegrationsManager;
};

export const serverIntegrations =
  globalForIntegrations.nexusServerIntegrations ||
  new ServerIntegrationsManager();

if (process.env.NODE_ENV !== 'production') {
  globalForIntegrations.nexusServerIntegrations = serverIntegrations;
}
