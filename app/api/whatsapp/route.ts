import { NextRequest, NextResponse } from 'next/server';
import { serverIntegrations } from '@/src/lib/server-integrations';

export const runtime = 'nodejs';

export async function GET() {
  await serverIntegrations.ensureWhatsAppConnection();
  return NextResponse.json(
    {
      status: serverIntegrations.waStatus,
      qrDataUrl: serverIntegrations.waQrDataUrl,
      error: serverIntegrations.waError,
      targetPhone: serverIntegrations.waTargetPhone,
      pairedDeviceName: serverIntegrations.waPairedDeviceName,
      autoNotifyApprovals: serverIntegrations.waAutoNotifyApprovals,
      autoNotifyTaskComplete: serverIntegrations.waAutoNotifyTaskComplete,
      autoNotifyBudgetAlerts: serverIntegrations.waAutoNotifyBudgetAlerts,
      autoNotifyPayments: serverIntegrations.waAutoNotifyPayments,
      logs: serverIntegrations.waLogs,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'GENERATE_QR') {
      await serverIntegrations.ensureWhatsAppConnection();
      return NextResponse.json({
        ok: true,
        status: serverIntegrations.waStatus,
        qrDataUrl: serverIntegrations.waQrDataUrl,
        error: serverIntegrations.waError,
      });
    }

    if (body.action === 'UPDATE_CONFIG') {
      if (typeof body.targetPhone === 'string') {
        const phone = body.targetPhone.replace(/[^0-9]/g, '');
        if (phone && !/^\d{8,15}$/.test(phone)) {
          return NextResponse.json(
            { ok: false, error: 'Nomor WhatsApp harus berisi 8-15 digit.' },
            { status: 400 }
          );
        }
        serverIntegrations.waTargetPhone = phone;
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
      const log = await serverIntegrations.sendWhatsAppNotification({
        eventType: body.eventType || 'SYSTEM_NOTIFICATION',
        recipientPhone: body.targetPhone || serverIntegrations.waTargetPhone,
        message:
          body.message ||
          '🔔 Notifikasi otomatis dari NexusOS AI Virtual Office.',
      });
      const delivered = log.status === 'SENT VIA BAILEYS';

      return NextResponse.json(
        {
          ok: delivered,
          log,
          logs: serverIntegrations.waLogs,
          error: delivered ? undefined : log.status,
        },
        {
          status: delivered
            ? 200
            : log.status.startsWith('FAILED: Invalid')
              ? 400
              : 503,
        }
      );
    }

    return NextResponse.json(
      { ok: false, error: 'Unknown WhatsApp action.' },
      { status: 400 }
    );
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
