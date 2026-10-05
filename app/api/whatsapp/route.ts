import { NextRequest, NextResponse } from 'next/server';
import { serverIntegrations } from '@/src/lib/server-integrations';

export async function GET() {
  const qrDataUrl = await serverIntegrations.ensureQrCodeGenerated();
  return NextResponse.json({
    status: serverIntegrations.waStatus,
    qrDataUrl,
    targetPhone: serverIntegrations.waTargetPhone,
    pairedDeviceName: serverIntegrations.waPairedDeviceName,
    autoNotifyApprovals: serverIntegrations.waAutoNotifyApprovals,
    autoNotifyTaskComplete: serverIntegrations.waAutoNotifyTaskComplete,
    autoNotifyBudgetAlerts: serverIntegrations.waAutoNotifyBudgetAlerts,
    autoNotifyPayments: serverIntegrations.waAutoNotifyPayments,
    logs: serverIntegrations.waLogs,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'GENERATE_QR') {
      serverIntegrations.waStatus = 'QR_READY';
      const qrDataUrl = await serverIntegrations.regenerateBaileysQr();
      return NextResponse.json({
        ok: true,
        status: serverIntegrations.waStatus,
        qrDataUrl,
      });
    }

    if (body.action === 'CONFIRM_PAIRING') {
      if (body.targetPhone) {
        serverIntegrations.waTargetPhone = String(body.targetPhone).replace(
          /[^0-9]/g,
          ''
        );
      }
      serverIntegrations.waStatus = 'CONNECTED';
      serverIntegrations.waPairedDeviceName =
        body.deviceName || 'WhatsApp Multi-Device (Baileys v6.7 Socket)';

      serverIntegrations.appendWhatsAppNotification({
        eventType: 'BAILEYS_SESSION_LINKED',
        recipientPhone: serverIntegrations.waTargetPhone,
        message: `✅ *[Baileys WhatsApp Multi-Device Terhubung]*\nPerangkat Supervisor (+${serverIntegrations.waTargetPhone}) berhasil ditautkan ke NexusOS Virtual Office. Seluruh notifikasi AI Approval, Task, Budget, dan Pembayaran Midtrans akan diteruskan otomatis ke nomor ini.`,
      });

      return NextResponse.json({
        ok: true,
        status: serverIntegrations.waStatus,
        pairedDeviceName: serverIntegrations.waPairedDeviceName,
        logs: serverIntegrations.waLogs,
      });
    }

    if (body.action === 'UPDATE_CONFIG') {
      if (body.targetPhone) {
        serverIntegrations.waTargetPhone = String(body.targetPhone).replace(
          /[^0-9]/g,
          ''
        );
      }
      if (typeof body.autoNotifyApprovals === 'boolean') {
        serverIntegrations.waAutoNotifyApprovals = body.autoNotifyApprovals;
      }
      if (typeof body.autoNotifyTaskComplete === 'boolean') {
        serverIntegrations.waAutoNotifyTaskComplete =
          body.autoNotifyTaskComplete;
      }
      if (typeof body.autoNotifyBudgetAlerts === 'boolean') {
        serverIntegrations.waAutoNotifyBudgetAlerts =
          body.autoNotifyBudgetAlerts;
      }
      if (typeof body.autoNotifyPayments === 'boolean') {
        serverIntegrations.waAutoNotifyPayments = body.autoNotifyPayments;
      }

      return NextResponse.json({
        ok: true,
        targetPhone: serverIntegrations.waTargetPhone,
        logs: serverIntegrations.waLogs,
      });
    }

    if (body.action === 'SEND_NOTIFICATION') {
      const log = serverIntegrations.appendWhatsAppNotification({
        eventType: body.eventType || 'SYSTEM_NOTIFICATION',
        recipientPhone: body.targetPhone || serverIntegrations.waTargetPhone,
        message:
          body.message ||
          '🔔 Notifikasi otomatis dari NexusOS AI Virtual Office.',
      });

      return NextResponse.json({
        ok: true,
        log,
        logs: serverIntegrations.waLogs,
      });
    }

    return NextResponse.json({ ok: true, logs: serverIntegrations.waLogs });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : 'WhatsApp Baileys gateway error',
      },
      { status: 500 }
    );
  }
}
