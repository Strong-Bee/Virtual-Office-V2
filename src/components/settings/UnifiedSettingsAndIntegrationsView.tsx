'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/src/store/useAppStore';
import { updateAIEmployeeState } from '@/src/lib/firestore-actions';
import { soundFX } from '@/src/lib/sound';
import { AIModelProvider } from '@/src/types';
import {
  Cpu,
  QrCode,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  Send,
  Smartphone,
  Sliders,
  Loader2,
  Sparkles,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';

interface WhatsAppLogItem {
  id: string;
  recipientPhone: string;
  eventType: string;
  message: string;
  status: string;
  timestamp: string;
}

interface MidtransTxItem {
  orderId: string;
  clientName: string;
  clientEmail: string;
  planName: string;
  amountIdr: number;
  paymentMethod: string;
  status: 'PENDING' | 'SETTLEMENT' | 'EXPIRED';
  vaNumber?: string;
  createdAt: string;
}

export function UnifiedSettingsAndIntegrationsView() {
  const aiEmployees = useAppStore((s) => s.aiEmployees);
  const setAIEmployees = useAppStore((s) => s.setAIEmployees);

  const [activeSubTab, setActiveSubTab] = useState<
    'AI_MODELS' | 'WHATSAPP_BAILEYS' | 'MIDTRANS_PAYMENTS'
  >('AI_MODELS');

  // 1. AI Model & API Settings State
  const [selectedProvider, setSelectedProvider] =
    useState<AIModelProvider>('NVIDIA');
  const [selectedModel, setSelectedModel] = useState(
    'meta/llama-3.1-70b-instruct'
  );
  const [nvidiaEndpoint, setNvidiaEndpoint] = useState(
    'https://integrate.api.nvidia.com/v1'
  );
  const [temperature, setTemperature] = useState(0.6);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [autoFallback, setAutoFallback] = useState(true);
  const [providerCatalog, setProviderCatalog] = useState<
    Record<string, string[]>
  >({
    NVIDIA: [
      'meta/llama-3.1-70b-instruct',
      'meta/llama-3.1-405b-instruct',
      'nvidia/llama-3.1-nemotron-70b-instruct',
      'deepseek-ai/deepseek-r1',
    ],
    GEMINI: ['gemini-3-flash-preview', 'gemini-3.1-flash-lite-preview', 'gemini-2.5-flash'],
    OPENAI: ['gpt-4o', 'gpt-4o-mini'],
    ANTHROPIC: ['claude-3-5-sonnet-latest'],
    OPENROUTER: ['meta-llama/llama-3.1-70b-instruct'],
  });
  const [providersStatus, setProvidersStatus] = useState<
    Record<string, boolean>
  >({});
  const [maskedKeys, setMaskedKeys] = useState<Record<string, string>>({});
  const [nvidiaApiKeyInput, setNvidiaApiKeyInput] = useState('');
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [openaiApiKeyInput, setOpenaiApiKeyInput] = useState('');
  const [anthropicApiKeyInput, setAnthropicApiKeyInput] = useState('');
  const [openrouterApiKeyInput, setOpenrouterApiKeyInput] = useState('');
  const [midtransServerKeyInput, setMidtransServerKeyInput] = useState('');
  const [midtransClientKeyInput, setMidtransClientKeyInput] = useState('');
  const [showKeyFields, setShowKeyFields] = useState<Record<string, boolean>>(
    {}
  );
  const [testingApi, setTestingApi] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [savingAiSettings, setSavingAiSettings] = useState(false);

  // 2. Baileys WhatsApp QR State
  const [waStatus, setWaStatus] = useState<
    'DISCONNECTED' | 'QR_READY' | 'CONNECTED'
  >('DISCONNECTED');
  const [waQrDataUrl, setWaQrDataUrl] = useState<string | null>(null);
  const [waError, setWaError] = useState<string | null>(null);
  const [waTargetPhone, setWaTargetPhone] = useState('');
  const [waDeviceName, setWaDeviceName] = useState<string | null>(null);
  const [waAutoApprovals, setWaAutoApprovals] = useState(true);
  const [waAutoTasks, setWaAutoTasks] = useState(true);
  const [waAutoBudget, setWaAutoBudget] = useState(true);
  const [waAutoPayments, setWaAutoPayments] = useState(true);
  const [waLogs, setWaLogs] = useState<WhatsAppLogItem[]>([]);
  const [waLoadingQr, setWaLoadingQr] = useState(false);
  const [waCustomMessage, setWaCustomMessage] = useState('');

  // 3. Midtrans Client Payment State
  const [midtransTxList, setMidtransTxList] = useState<MidtransTxItem[]>([]);
  const [clientName, setClientName] = useState('PT Solusi Teknologi Nusantara');
  const [clientEmail, setClientEmail] = useState('finance@solusitek.co.id');
  const [planName, setPlanName] = useState(
    'Enterprise AI Workforce + 25 Virtual Seats'
  );
  const [amountIdr, setAmountIdr] = useState(7500000);
  const [paymentMethod, setPaymentMethod] = useState('QRIS / GoPay Midtrans');
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [activeSnapModalTx, setActiveSnapModalTx] =
    useState<MidtransTxItem | null>(null);

  useEffect(() => {
    // Load AI Settings
    fetch('/api/settings/ai')
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setSelectedProvider(data.settings.defaultProvider || 'NVIDIA');
          setSelectedModel(
            data.settings.defaultModel || 'meta/llama-3.1-70b-instruct'
          );
          setNvidiaEndpoint(
            data.settings.nvidiaBaseUrl || 'https://integrate.api.nvidia.com/v1'
          );
          setTemperature(data.settings.temperature ?? 0.6);
          setMaxTokens(data.settings.maxTokens ?? 1024);
          setAutoFallback(Boolean(data.settings.autoFallbackToGemini));
        }
        if (data.catalog) setProviderCatalog(data.catalog);
        if (data.providersStatus) setProvidersStatus(data.providersStatus);
        if (data.maskedKeys) setMaskedKeys(data.maskedKeys);
      })
      .catch(() => {});

    // Load WhatsApp Baileys state
    fetch('/api/whatsapp')
      .then((r) => r.json())
      .then((data) => {
        if (data.status) setWaStatus(data.status);
        if (data.qrDataUrl) setWaQrDataUrl(data.qrDataUrl);
        if (data.error) setWaError(data.error);
        if (data.targetPhone) setWaTargetPhone(data.targetPhone);
        if (data.pairedDeviceName) setWaDeviceName(data.pairedDeviceName);
        if (data.logs) setWaLogs(data.logs);
      })
      .catch((err) => {
        setWaError(err instanceof Error ? err.message : 'Gagal memuat status WhatsApp.');
      });

    // Load Midtrans transactions
    fetch('/api/payments/midtrans')
      .then((r) => r.json())
      .then((data) => {
        if (data.transactions) setMidtransTxList(data.transactions);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeSubTab !== 'WHATSAPP_BAILEYS') return;

    let active = true;
    const refreshStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp', { cache: 'no-store' });
        const data = await res.json();
        if (!active) return;
        if (data.status) setWaStatus(data.status);
        setWaQrDataUrl(data.qrDataUrl || null);
        setWaDeviceName(data.pairedDeviceName || null);
        setWaError(data.error || null);
        if (data.logs) setWaLogs(data.logs);
      } catch (err) {
        if (active) {
          setWaError(
            err instanceof Error ? err.message : 'Gagal memuat status WhatsApp.'
          );
        }
      }
    };

    void refreshStatus();
    const timer = window.setInterval(() => void refreshStatus(), 1500);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activeSubTab]);

  const buildApiKeysPayload = () => ({
    nvidiaApiKey: nvidiaApiKeyInput.trim(),
    geminiApiKey: geminiApiKeyInput.trim(),
    openaiApiKey: openaiApiKeyInput.trim(),
    anthropicApiKey: anthropicApiKeyInput.trim(),
    openrouterApiKey: openrouterApiKeyInput.trim(),
    midtransServerKey: midtransServerKeyInput.trim(),
    midtransClientKey: midtransClientKeyInput.trim(),
  });

  const handleTestAIConnection = async () => {
    setTestingApi(true);
    setTestResult(null);
    soundFX.playClick();
    try {
      const res = await fetch('/api/settings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST_CONNECTION',
          provider: selectedProvider,
          model: selectedModel,
          nvidiaBaseUrl: nvidiaEndpoint,
          apiKeys: buildApiKeysPayload(),
        }),
      });
      const data = await res.json();
      if (data.providersStatus) setProvidersStatus(data.providersStatus);
      if (data.maskedKeys) setMaskedKeys(data.maskedKeys);
      if (!res.ok || !data.ok) {
        setTestResult({
          ok: false,
          message: data.error || 'Endpoint verification failed.',
        });
      } else {
        setTestResult({
          ok: true,
          message: `✓ Connected to ${data.provider} (${data.model}) in ${data.latencyMs}ms — "${data.reply}"`,
        });
        soundFX.playNotification();
      }
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Connection error',
      });
    } finally {
      setTestingApi(false);
    }
  };

  const handleApplyModelToAllAgents = async () => {
    setSavingAiSettings(true);
    soundFX.playClick();
    try {
      const res = await fetch('/api/settings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultProvider: selectedProvider,
          defaultModel: selectedModel,
          nvidiaBaseUrl: nvidiaEndpoint,
          temperature,
          maxTokens,
          autoFallbackToGemini: autoFallback,
          apiKeys: buildApiKeysPayload(),
        }),
      });
      const data = await res.json();
      if (data.providersStatus) setProvidersStatus(data.providersStatus);
      if (data.maskedKeys) setMaskedKeys(data.maskedKeys);

      // Clear raw inputs after saving to server vault
      setNvidiaApiKeyInput('');
      setGeminiApiKeyInput('');
      setOpenaiApiKeyInput('');
      setAnthropicApiKeyInput('');
      setOpenrouterApiKeyInput('');
      setMidtransServerKeyInput('');
      setMidtransClientKeyInput('');

      const updatedLocal = aiEmployees.map((ai) => ({
        ...ai,
        modelProvider: selectedProvider,
        modelName: selectedModel,
        temperature,
      }));
      setAIEmployees(updatedLocal);

      for (const ai of aiEmployees) {
        await updateAIEmployeeState(ai, {
          modelProvider: selectedProvider,
          modelName: selectedModel,
          temperature,
        });
      }

      setTestResult({
        ok: true,
        message: `✓ Saved & synchronized ${selectedProvider} (${selectedModel}) across all ${aiEmployees.length} AI Employees.`,
      });
      soundFX.playNotification();
    } finally {
      setSavingAiSettings(false);
    }
  };

  const handleGenerateBaileysQR = async () => {
    setWaLoadingQr(true);
    soundFX.playClick();
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GENERATE_QR' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memulai koneksi WhatsApp.');
      setWaStatus(data.status || 'DISCONNECTED');
      setWaQrDataUrl(data.qrDataUrl || null);
      setWaError(data.error || null);
    } catch (err) {
      setWaError(
        err instanceof Error ? err.message : 'Gagal memulai koneksi WhatsApp.'
      );
    } finally {
      setWaLoadingQr(false);
    }
  };

  const handleSendTestWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFX.playClick();
    const msgToSend =
      waCustomMessage.trim() ||
      `🔔 *NexusOS AI Virtual Office*\nIni adalah pesan tes koneksi WhatsApp Baileys.`;

    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_NOTIFICATION',
          eventType: 'MANUAL_TEST_NOTIFICATION',
          targetPhone: waTargetPhone,
          message: msgToSend,
        }),
      });
      const data = await res.json();
      if (data.logs) setWaLogs(data.logs);
      if (!res.ok) throw new Error(data.error || 'Pesan WhatsApp gagal dikirim.');
      setWaCustomMessage('');
      setWaError(null);
      soundFX.playNotification();
    } catch (err) {
      setWaError(
        err instanceof Error ? err.message : 'Pesan WhatsApp gagal dikirim.'
      );
    }
  };

  const handleCreateMidtransInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPayment(true);
    soundFX.playClick();
    try {
      const res = await fetch('/api/payments/midtrans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_SNAP_TRANSACTION',
          clientName,
          clientEmail,
          planName,
          amountIdr: Number(amountIdr),
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (data.transactions) setMidtransTxList(data.transactions);
      if (data.transaction) setActiveSnapModalTx(data.transaction);

      // Refresh WA logs since Midtrans invoice automatically triggers WhatsApp notification
      const waRes = await fetch('/api/whatsapp');
      const waData = await waRes.json();
      if (waData.logs) setWaLogs(waData.logs);

      soundFX.playNotification();
    } finally {
      setCreatingPayment(false);
    }
  };

  const handleConfirmMidtransSettlement = async (orderId: string) => {
    soundFX.playClick();
    const res = await fetch('/api/payments/midtrans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CONFIRM_SETTLEMENT',
        orderId,
      }),
    });
    const data = await res.json();
    if (data.transactions) setMidtransTxList(data.transactions);
    setActiveSnapModalTx(null);

    const waRes = await fetch('/api/whatsapp');
    const waData = await waRes.json();
    if (waData.logs) setWaLogs(waData.logs);
    soundFX.playNotification();
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 pb-24 lg:pb-10">
      {/* Header & Responsive Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="text-xs text-emerald-400 font-mono">
            System Configuration · Multi-Provider AI · Midtrans · Baileys
            WhatsApp
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
            Settings, AI Models, Midtrans Billing & WhatsApp Gateway
          </h1>
        </div>

        {/* Touch-friendly 44px minimum height segmented tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveSubTab('AI_MODELS')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeSubTab === 'AI_MODELS'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4 shrink-0" />
            AI Model & API Settings
          </button>
          <button
            onClick={() => setActiveSubTab('WHATSAPP_BAILEYS')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeSubTab === 'WHATSAPP_BAILEYS'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4 shrink-0" />
            WhatsApp Baileys QR
          </button>
          <button
            onClick={() => setActiveSubTab('MIDTRANS_PAYMENTS')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeSubTab === 'MIDTRANS_PAYMENTS'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            Midtrans Client Billing
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: AI MODEL & API CONFIGURATION */}
      {activeSubTab === 'AI_MODELS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-5 sm:p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  Global AI Provider & Model Routing
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure NVIDIA NIM, Google Gemini, OpenAI, Anthropic, or
                  OpenRouter endpoints for your AI Workforce.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Primary AI Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => {
                    const prov = e.target.value as AIModelProvider;
                    setSelectedProvider(prov);
                    const list = providerCatalog[prov] || [];
                    if (list[0]) setSelectedModel(list[0]);
                  }}
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="NVIDIA">
                    NVIDIA NIM API (integrate.api.nvidia.com)
                  </option>
                  <option value="GEMINI">Google Gemini (@google/genai)</option>
                  <option value="OPENAI">OpenAI Compatible API</option>
                  <option value="ANTHROPIC">Anthropic Claude API</option>
                  <option value="OPENROUTER">OpenRouter Unified Gateway</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Model Identifier (Preset or Custom)
                </label>
                <input
                  type="text"
                  list="model-presets"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                />
                <datalist id="model-presets">
                  {(providerCatalog[selectedProvider] || []).map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  NVIDIA NIM / OpenAI-Compatible Base URL
                </label>
                <input
                  type="url"
                  value={nvidiaEndpoint}
                  onChange={(e) => setNvidiaEndpoint(e.target.value)}
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Temperature ({temperature})
                </label>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full mt-3 accent-emerald-500"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 p-3.5 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={autoFallback}
                onChange={(e) => setAutoFallback(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700"
              />
              <span className="text-xs text-slate-200">
                Enable Automatic High-Availability Failover (Fallback to Google
                Gemini if primary provider experiences timeout)
              </span>
            </label>

            {testResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-mono ${
                  testResult.ok
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                }`}
              >
                {testResult.message}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestAIConnection}
                disabled={testingApi}
                className="min-h-[44px] px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                {testingApi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing API Endpoint...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Test API Connection & Latency
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleApplyModelToAllAgents}
                disabled={savingAiSettings}
                className="min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4" />
                {savingAiSettings
                  ? 'Applying to All AI Agents...'
                  : 'Save & Apply Model to All AI Employees'}
              </button>
            </div>
          </div>

          {/* Server API Key Input Form & Status Card */}
          <div className="p-5 sm:p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  Form Input API Key (Server Vault)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Masukkan API Key Anda di bawah ini lalu klik{' '}
                  <strong>Save & Apply</strong> atau{' '}
                  <strong>Test API Connection</strong>.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {[
                {
                  id: 'NVIDIA',
                  label: 'NVIDIA NIM API Key',
                  placeholder: 'nvapi-xxxxxxxxxxxxxxxxxxxx',
                  value: nvidiaApiKeyInput,
                  setter: setNvidiaApiKeyInput,
                },
                {
                  id: 'GEMINI',
                  label: 'Google Gemini API Key',
                  placeholder: 'AIzaSyxxxxxxxxxxxxxxxxxx',
                  value: geminiApiKeyInput,
                  setter: setGeminiApiKeyInput,
                },
                {
                  id: 'OPENAI',
                  label: 'OpenAI API Key',
                  placeholder: 'sk-proj-xxxxxxxxxxxxxxxx',
                  value: openaiApiKeyInput,
                  setter: setOpenaiApiKeyInput,
                },
                {
                  id: 'OPENROUTER',
                  label: 'OpenRouter API Key',
                  placeholder: 'sk-or-v1-xxxxxxxxxxxxxxx',
                  value: openrouterApiKeyInput,
                  setter: setOpenrouterApiKeyInput,
                },
                {
                  id: 'ANTHROPIC',
                  label: 'Anthropic Claude API Key',
                  placeholder: 'sk-ant-xxxxxxxxxxxxxxxxx',
                  value: anthropicApiKeyInput,
                  setter: setAnthropicApiKeyInput,
                },
                {
                  id: 'MIDTRANS',
                  label: 'Midtrans Server Key',
                  placeholder: 'SB-Mid-server-xxxxxxxxxx',
                  value: midtransServerKeyInput,
                  setter: setMidtransServerKeyInput,
                },
              ].map((item) => {
                const isConfigured = providersStatus[item.id];
                const masked = maskedKeys[item.id];
                const isVisible = Boolean(showKeyFields[item.id]);

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <label className="font-medium text-slate-200">
                        {item.label}
                      </label>
                      <span
                        className={`font-mono text-[11px] ${
                          isConfigured ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {isConfigured
                          ? `● Active (${masked || 'Saved'})`
                          : '○ Belum Diisi'}
                      </span>
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type={isVisible ? 'text' : 'password'}
                        value={item.value}
                        onChange={(e) => item.setter(e.target.value)}
                        placeholder={
                          masked
                            ? `Tersimpan: ${masked} (Ketik untuk ganti)`
                            : item.placeholder
                        }
                        className="w-full min-h-[40px] bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-9 py-1.5 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowKeyFields((prev) => ({
                            ...prev,
                            [item.id]: !prev[item.id],
                          }))
                        }
                        className="absolute right-2.5 text-slate-400 hover:text-white"
                        title={isVisible ? 'Sembunyikan Key' : 'Tampilkan Key'}
                      >
                        {isVisible ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleApplyModelToAllAgents}
              disabled={savingAiSettings}
              className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <KeyRound className="w-4 h-4" />
              {savingAiSettings
                ? 'Menyimpan API Key ke Server...'
                : 'Simpan Semua API Key & Terapkan'}
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: BAILEYS WHATSAPP QR GATEWAY */}
      {activeSubTab === 'WHATSAPP_BAILEYS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Baileys QR Code Scanner */}
          <div className="lg:col-span-5 p-5 sm:p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-base font-bold text-white">
                Baileys WhatsApp Multi-Device QR
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Scan QR code di bawah menggunakan WhatsApp (Perangkat Tertaut /
                Linked Devices) agar seluruh notifikasi AI & pembayaran dikirim
                ke WhatsApp Anda.
              </p>
            </div>

            {/* QR Canvas Box */}
            <div className="w-64 h-64 bg-white rounded-2xl p-3 flex items-center justify-center shadow-inner border-4 border-slate-800">
              {waStatus === 'CONNECTED' ? (
                <div className="text-slate-900 space-y-2 p-4">
                  <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
                  <div className="text-sm font-bold">WhatsApp Terhubung!</div>
                  <div className="text-xs text-slate-600 font-mono">
                    {waDeviceName || 'Baileys MD Session Active'}
                  </div>
                </div>
              ) : waQrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={waQrDataUrl}
                  alt="Baileys WhatsApp QR Code"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-slate-500 text-xs px-4">
                  {waStatus === 'QR_READY'
                    ? 'Menyiapkan QR pairing WhatsApp...'
                    : 'Mulai koneksi untuk mendapatkan QR pairing WhatsApp.'}
                </div>
              )}
            </div>

            <div className="w-full flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleGenerateBaileysQR}
                disabled={waLoadingQr || waStatus === 'CONNECTED'}
                className="flex-1 min-h-[44px] px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw
                  className={`w-4 h-4 ${waLoadingQr ? 'animate-spin' : ''}`}
                />
                {waLoadingQr
                  ? 'Menghubungkan...'
                  : waQrDataUrl
                    ? 'Menunggu scan QR...'
                    : 'Generate QR Code Baileys'}
              </button>
            </div>
            {waError && (
              <p
                role="alert"
                className="w-full rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-left text-xs text-rose-300"
              >
                {waError}
              </p>
            )}
          </div>

          {/* Right Column: Notification Routing & Live Delivery Log */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-5 sm:p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="text-base font-semibold text-white">
                Pengaturan Nomor Tujuan & Trigger Notifikasi Otomatis
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1.5">
                    Nomor WhatsApp Supervisor (Format 628xxx)
                  </label>
                  <input
                    type="tel"
                    value={waTargetPhone}
                    onChange={(e) => setWaTargetPhone(e.target.value)}
                    placeholder="628xxxxxxxxxx"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={async () => {
                      soundFX.playClick();
                      try {
                        const res = await fetch('/api/whatsapp', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'UPDATE_CONFIG',
                            targetPhone: waTargetPhone,
                            autoNotifyApprovals: waAutoApprovals,
                            autoNotifyTaskComplete: waAutoTasks,
                            autoNotifyBudgetAlerts: waAutoBudget,
                            autoNotifyPayments: waAutoPayments,
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          throw new Error(data.error || 'Gagal menyimpan konfigurasi WhatsApp.');
                        }
                        setWaTargetPhone(data.targetPhone || '');
                        setWaError(null);
                        soundFX.playNotification();
                      } catch (err) {
                        setWaError(
                          err instanceof Error
                            ? err.message
                            : 'Gagal menyimpan konfigurasi WhatsApp.'
                        );
                      }
                    }}
                    className="w-full min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white rounded-xl transition-colors"
                  >
                    Simpan Nomor & Preferensi WA
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {[
                  {
                    label: 'Notifikasi Saat AI Meminta Approval (High Risk)',
                    checked: waAutoApprovals,
                    setter: setWaAutoApprovals,
                  },
                  {
                    label: 'Notifikasi Saat AI Menyelesaikan Task & Report',
                    checked: waAutoTasks,
                    setter: setWaAutoTasks,
                  },
                  {
                    label: 'Notifikasi Peringatan Budget Token AI Habis',
                    checked: waAutoBudget,
                    setter: setWaAutoBudget,
                  },
                  {
                    label: 'Notifikasi Pembayaran Client Midtrans (Settlement)',
                    checked: waAutoPayments,
                    setter: setWaAutoPayments,
                  },
                ].map((item, idx) => (
                  <label
                    key={idx}
                    className="flex items-center gap-2.5 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer text-xs text-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => item.setter(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              {/* Send Test Notification Form */}
              <form
                onSubmit={handleSendTestWhatsApp}
                className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2.5"
              >
                <input
                  type="text"
                  value={waCustomMessage}
                  onChange={(e) => setWaCustomMessage(e.target.value)}
                  placeholder="Ketik pesan tes atau kosongkan untuk kirim template laporan AI..."
                  className="flex-1 min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  Kirim Notifikasi Tes ke WA
                </button>
              </form>
            </div>

            {/* Outbox / Delivery Logs */}
            <div className="p-5 sm:p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Riwayat Pengiriman Notifikasi WhatsApp (Baileys Outbox)
                </h3>
                <span className="text-xs font-mono text-emerald-400 tabular-nums">
                  {waLogs.length} Pesan
                </span>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {waLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>To: +{log.recipientPhone}</span>
                      <span
                        className={
                          log.status.startsWith('SENT')
                            ? 'text-emerald-400'
                            : 'text-rose-300'
                        }
                      >
                        {log.status}
                      </span>
                    </div>
                    <div className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {log.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MIDTRANS CLIENT PAYMENT GATEWAY */}
      {activeSubTab === 'MIDTRANS_PAYMENTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Client Invoice / Checkout Form */}
          <form
            onSubmit={handleCreateMidtransInvoice}
            className="lg:col-span-5 p-5 sm:p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4"
          >
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="text-base font-bold text-white">
                  Buat Tagihan / Checkout Client (Midtrans Snap)
                </h2>
                <p className="text-xs text-slate-400">
                  Mendukung QRIS, GoPay, BCA/Mandiri/BNI Virtual Account, &
                  Kartu Kredit.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Nama Perusahaan / Client
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Email Billing Client
              </label>
              <input
                type="email"
                required
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Paket Layanan / Top-Up Budget AI
              </label>
              <select
                value={planName}
                onChange={(e) => {
                  const val = e.target.value;
                  setPlanName(val);
                  if (val.includes('Starter')) setAmountIdr(2500000);
                  if (val.includes('Enterprise')) setAmountIdr(7500000);
                  if (val.includes('Unlimited')) setAmountIdr(18500000);
                }}
                className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
              >
                <option value="Starter Virtual Office + 3 AI Agents">
                  Starter Virtual Office + 3 AI Agents (Rp 2.500.000)
                </option>
                <option value="Enterprise AI Workforce + 25 Virtual Seats">
                  Enterprise AI Workforce + 25 Virtual Seats (Rp 7.500.000)
                </option>
                <option value="Unlimited Multi-Tenant + Custom NVIDIA NIM Cluster">
                  Unlimited Multi-Tenant + Custom NVIDIA NIM Cluster (Rp
                  18.500.000)
                </option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Nominal Tagihan (IDR)
                </label>
                <input
                  type="number"
                  min={10000}
                  required
                  value={amountIdr}
                  onChange={(e) => setAmountIdr(Number(e.target.value))}
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-emerald-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Channel Pembayaran Midtrans
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                >
                  <option value="QRIS / GoPay Midtrans">
                    QRIS / GoPay / ShopeePay
                  </option>
                  <option value="BCA Virtual Account">
                    BCA Virtual Account
                  </option>
                  <option value="Mandiri Bill Payment">
                    Mandiri Virtual Account
                  </option>
                  <option value="BNI / BRI Virtual Account">
                    BNI / BRI Virtual Account
                  </option>
                  <option value="Credit Card (Visa / Mastercard)">
                    Credit Card (3DS)
                  </option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingPayment}
              className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
            >
              <CreditCard className="w-4 h-4" />
              {creatingPayment
                ? 'Membuat Snap Token Midtrans...'
                : 'Generate Midtrans Snap Checkout & Kirim Notif WA'}
            </button>
          </form>

          {/* Midtrans Transactions Ledger */}
          <div className="lg:col-span-7 p-5 sm:p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">
                Riwayat Transaksi Midtrans Client
              </h3>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {midtransTxList.length} Transaksi
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-2">Order ID</th>
                    <th className="py-2.5 px-2">Client & Paket</th>
                    <th className="py-2.5 px-2">Metode</th>
                    <th className="py-2.5 px-2 text-right">Nominal</th>
                    <th className="py-2.5 px-2 text-right">Status / Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {midtransTxList.map((tx) => (
                    <tr key={tx.orderId} className="hover:bg-slate-950/60">
                      <td className="py-3 px-2 font-mono text-slate-300 whitespace-nowrap">
                        {tx.orderId}
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-semibold text-white">
                          {tx.clientName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {tx.planName}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-slate-300">
                        {tx.paymentMethod}
                      </td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums text-emerald-400 whitespace-nowrap">
                        Rp {tx.amountIdr.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-2 text-right whitespace-nowrap">
                        {tx.status === 'SETTLEMENT' ? (
                          <span className="text-emerald-400 font-mono">
                            ✓ SETTLEMENT
                          </span>
                        ) : (
                          <button
                            onClick={() => setActiveSnapModalTx(tx)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-[11px]"
                          >
                            Bayar (Snap UI)
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Midtrans Snap Checkout Modal */}
      {activeSnapModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono text-emerald-400">
                  MIDTRANS SNAP CHECKOUT
                </div>
                <div className="text-sm font-bold text-white">
                  {activeSnapModalTx.clientName}
                </div>
              </div>
              <button
                onClick={() => setActiveSnapModalTx(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1"
              >
                Tutup
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="text-xs text-slate-400">Total Pembayaran</div>
                <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
                  Rp {activeSnapModalTx.amountIdr.toLocaleString('id-ID')}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Order ID: {activeSnapModalTx.orderId}
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Paket Layanan:</span>
                  <span className="font-medium text-white text-right">
                    {activeSnapModalTx.planName}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Metode Pembayaran:</span>
                  <span className="font-mono text-emerald-400">
                    {activeSnapModalTx.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Nomor VA / Referensi:</span>
                  <span className="font-mono text-white">
                    {activeSnapModalTx.vaNumber || '880129481029'}
                  </span>
                </div>
              </div>

              <button
                onClick={() =>
                  handleConfirmMidtransSettlement(activeSnapModalTx.orderId)
                }
                className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Konfirmasi Pembayaran Lunas (Simulasi Webhook Settlement)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
