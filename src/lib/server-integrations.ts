import QRCode from 'qrcode';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WASocket,
} from '@whiskeysockets/baileys';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { AIModelProvider } from '@/src/types';

export interface ServerAISettings {
  defaultProvider: AIModelProvider;
  defaultModel: string;
  nvidiaBaseUrl: string;
  nineRouterBaseUrl: string;
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
  openclawApiKey: string;
  nineRouterApiKey: string;
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
    defaultProvider: 'NINEROUTER',
    defaultModel: process.env.NINEROUTER_MODEL || '',
    nvidiaBaseUrl:
      process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    nineRouterBaseUrl:
      process.env.NINEROUTER_BASE_URL || 'http://localhost:20128/v1',
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
    openclawApiKey: process.env.OPENCLAW_API_KEY || '',
    nineRouterApiKey: process.env.NINEROUTER_API_KEY || '',
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
      OPENCLAW: mask(
        this.apiKeys.openclawApiKey || process.env.OPENCLAW_API_KEY || ''
      ),
      NINEROUTER: mask(
        this.apiKeys.nineRouterApiKey || process.env.NINEROUTER_API_KEY || ''
      ),
      MIDTRANS: mask(
        this.apiKeys.midtransServerKey || process.env.MIDTRANS_SERVER_KEY || ''
      ),
    };
  }

  public waStatus: 'DISCONNECTED' | 'QR_READY' | 'CONNECTED' =
    'DISCONNECTED';
  public waQrDataUrl: string | null = null;
  public waError: string | null = null;
  public waTargetPhone: string = process.env.WHATSAPP_SUPERVISOR_PHONE || '';
  public waPairedDeviceName: string | null = null;
  public waAutoNotifyApprovals = true;
  public waAutoNotifyTaskComplete = true;
  public waAutoNotifyBudgetAlerts = true;
  public waAutoNotifyPayments = true;
  public waLogs: WhatsAppDeliveryLog[] = [];
  private waSocket: WASocket | null = null;
  private waStartPromise: Promise<void> | null = null;
  private waReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private waQrPayload: string | null = null;
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

  private getWhatsAppAuthDir(): string {
    return (
      process.env.WHATSAPP_AUTH_DIR ||
      path.join(process.cwd(), '.baileys-auth')
    );
  }

  public async ensureWhatsAppConnection(): Promise<void> {
    if (this.waSocket) return;
    if (this.waStartPromise) return this.waStartPromise;
    if (this.waReconnectTimer) {
      clearTimeout(this.waReconnectTimer);
      this.waReconnectTimer = null;
    }

    const startPromise = (async () => {
      const { state, saveCreds } = await useMultiFileAuthState(
        this.getWhatsAppAuthDir()
      );
      const socket = makeWASocket({
        auth: state,
        markOnlineOnConnect: false,
        qrTimeout: 20_000,
      });
      this.waSocket = socket;
      this.waError = null;

      socket.ev.on('creds.update', () => {
        void saveCreds().catch((error: unknown) => {
          this.waError =
            error instanceof Error ? error.message : 'Failed to save WhatsApp session';
        });
      });

      socket.ev.on('connection.update', ({ connection, qr, lastDisconnect }) => {
        if (qr) {
          this.waQrPayload = qr;
          this.waStatus = 'QR_READY';
          this.waError = null;
          void QRCode.toDataURL(qr, {
            width: 300,
            margin: 2,
            color: { dark: '#0f172a', light: '#ffffff' },
          })
            .then((dataUrl) => {
              if (this.waSocket === socket && this.waQrPayload === qr) {
                this.waQrDataUrl = dataUrl;
              }
            })
            .catch((error: unknown) => {
              this.waError =
                error instanceof Error
                  ? error.message
                  : 'Failed to generate WhatsApp QR code';
            });
        }

        if (connection === 'open') {
          this.waStatus = 'CONNECTED';
          this.waQrDataUrl = null;
          this.waQrPayload = null;
          this.waError = null;
          this.waPairedDeviceName =
            socket.user?.name || socket.user?.id.split(':')[0] || 'WhatsApp';
        }

        if (connection === 'close' && this.waSocket === socket) {
          this.waSocket = null;
          this.waStatus = 'DISCONNECTED';
          this.waQrDataUrl = null;
          this.waQrPayload = null;
          this.waPairedDeviceName = null;

          const error = lastDisconnect?.error;
          const output =
            error && 'output' in error ? error.output : undefined;
          const statusCode =
            output && typeof output === 'object' && 'statusCode' in output
              ? output.statusCode
              : undefined;

          if (statusCode === DisconnectReason.loggedOut) {
            this.waError = 'WhatsApp session ended. Generate a new QR code to reconnect.';
            void rm(this.getWhatsAppAuthDir(), {
              recursive: true,
              force: true,
            }).catch((removeError: unknown) => {
              this.waError =
                removeError instanceof Error
                  ? removeError.message
                  : 'Failed to clear logged-out WhatsApp session';
            });
          } else {
            this.waError =
              error instanceof Error
                ? error.message
                : 'WhatsApp connection closed; reconnecting';
            this.waReconnectTimer = setTimeout(() => {
              this.waReconnectTimer = null;
              void this.ensureWhatsAppConnection().catch((connectError: unknown) => {
                this.waError =
                  connectError instanceof Error
                    ? connectError.message
                    : 'Failed to reconnect WhatsApp';
              });
            }, 1000);
          }
        }
      });
    })();

    this.waStartPromise = startPromise;
    try {
      await startPromise;
    } catch (error) {
      this.waSocket = null;
      this.waStatus = 'DISCONNECTED';
      this.waError =
        error instanceof Error ? error.message : 'Failed to start WhatsApp';
      throw error;
    } finally {
      if (this.waStartPromise === startPromise) this.waStartPromise = null;
    }
  }

  public async sendWhatsAppNotification(params: {
    eventType: string;
    message: string;
    recipientPhone?: string;
  }): Promise<WhatsAppDeliveryLog> {
    const cleanPhone = (params.recipientPhone || this.waTargetPhone).replace(
      /[^0-9]/g,
      ''
    );
    const entry: WhatsAppDeliveryLog = {
      id: `wa_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      recipientPhone: cleanPhone,
      eventType: params.eventType,
      message: params.message,
      status: 'NOT SENT: WhatsApp is not connected',
      timestamp: new Date().toISOString(),
    };

    if (!/^\d{8,15}$/.test(cleanPhone)) {
      entry.status = 'FAILED: Invalid recipient phone number';
    } else if (this.waStatus === 'CONNECTED' && this.waSocket) {
      try {
        await this.waSocket.sendMessage(`${cleanPhone}@s.whatsapp.net`, {
          text: params.message,
        });
        entry.status = 'SENT VIA BAILEYS';
      } catch (error) {
        entry.status = `FAILED: ${
          error instanceof Error ? error.message : 'WhatsApp delivery failed'
        }`;
      }
    }

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
