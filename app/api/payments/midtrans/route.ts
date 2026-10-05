import { NextRequest, NextResponse } from 'next/server';
import {
  serverIntegrations,
  MidtransTransactionRecord,
} from '@/src/lib/server-integrations';

export async function GET() {
  return NextResponse.json({
    transactions: serverIntegrations.midtransTransactions,
    configuredServerKey: Boolean(
      serverIntegrations.apiKeys.midtransServerKey ||
        process.env.MIDTRANS_SERVER_KEY
    ),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'CREATE_SNAP_TRANSACTION') {
      const orderId = `NX-MID-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const amountIdr = Math.max(10000, Number(body.amountIdr) || 2500000);
      const clientName = String(body.clientName || 'Enterprise Client').slice(
        0,
        120
      );
      const clientEmail = String(
        body.clientEmail || 'billing@client.co.id'
      ).slice(0, 120);
      const planName = String(
        body.planName || 'Enterprise AI Workforce Package'
      ).slice(0, 160);
      const paymentMethod = String(
        body.paymentMethod || 'QRIS / GoPay Midtrans'
      );

      let snapToken = `snap_${Math.random().toString(36).substring(2, 14)}`;
      let redirectUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${snapToken}`;

      const activeMidtransKey =
        serverIntegrations.apiKeys.midtransServerKey ||
        process.env.MIDTRANS_SERVER_KEY;

      // If MIDTRANS_SERVER_KEY is present in environment or Settings Vault, call real Midtrans Snap REST API
      if (activeMidtransKey) {
        try {
          const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';
          const midtransEndpoint = isProd
            ? 'https://app.midtrans.com/snap/v1/transactions'
            : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
          const authString = Buffer.from(`${activeMidtransKey}:`).toString(
            'base64'
          );

          const snapRes = await fetch(midtransEndpoint, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: `Basic ${authString}`,
            },
            body: JSON.stringify({
              transaction_details: {
                order_id: orderId,
                gross_amount: amountIdr,
              },
              customer_details: {
                first_name: clientName,
                email: clientEmail,
              },
            }),
          });

          if (snapRes.ok) {
            const snapData = (await snapRes.json()) as {
              token?: string;
              redirect_url?: string;
            };
            if (snapData.token) snapToken = snapData.token;
            if (snapData.redirect_url) redirectUrl = snapData.redirect_url;
          }
        } catch {
          // Graceful fallback to built-in Snap Checkout simulator if sandbox key is invalid
        }
      }

      const newTx: MidtransTransactionRecord = {
        orderId,
        clientName,
        clientEmail,
        planName,
        amountIdr,
        paymentMethod,
        status: 'PENDING',
        vaNumber: `8801${Math.floor(10000000 + Math.random() * 90000000)}`,
        snapToken,
        redirectUrl,
        createdAt: new Date().toISOString(),
      };

      serverIntegrations.midtransTransactions = [
        newTx,
        ...serverIntegrations.midtransTransactions,
      ];

      if (serverIntegrations.waAutoNotifyPayments) {
        serverIntegrations.appendWhatsAppNotification({
          eventType: 'MIDTRANS_INVOICE_CREATED',
          message: `🧾 *[Midtrans Invoice Dibuat]*\nOrder ID: *${orderId}*\nClient: *${clientName}*\nPaket: *${planName}*\nNominal: *Rp ${amountIdr.toLocaleString(
            'id-ID'
          )}*\nMetode: ${paymentMethod}\nStatus: MENUNGGU PEMBAYARAN`,
        });
      }

      return NextResponse.json({
        ok: true,
        transaction: newTx,
        transactions: serverIntegrations.midtransTransactions,
      });
    }

    if (body.action === 'CONFIRM_SETTLEMENT') {
      const targetOrderId = String(body.orderId || '');
      let settledTx: MidtransTransactionRecord | null = null;

      serverIntegrations.midtransTransactions =
        serverIntegrations.midtransTransactions.map((tx) => {
          if (tx.orderId === targetOrderId) {
            settledTx = { ...tx, status: 'SETTLEMENT' };
            return settledTx;
          }
          return tx;
        });

      if (settledTx && serverIntegrations.waAutoNotifyPayments) {
        const s: MidtransTransactionRecord = settledTx;
        serverIntegrations.appendWhatsAppNotification({
          eventType: 'MIDTRANS_PAYMENT_SETTLEMENT',
          message: `✅ *[Midtrans Pembayaran Lunas / Settlement]*\nOrder ID: *${
            s.orderId
          }*\nClient: *${s.clientName}*\nNominal: *Rp ${s.amountIdr.toLocaleString(
            'id-ID'
          )}*\nMetode: ${
            s.paymentMethod
          }\nPaket Layanan AI Workforce telah aktif otomatis.`,
        });
      }

      return NextResponse.json({
        ok: true,
        transaction: settledTx,
        transactions: serverIntegrations.midtransTransactions,
      });
    }

    return NextResponse.json({
      ok: true,
      transactions: serverIntegrations.midtransTransactions,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : 'Midtrans payment gateway error',
      },
      { status: 500 }
    );
  }
}
