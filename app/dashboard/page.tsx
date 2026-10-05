import React from 'react';
import { FirebaseRealtimeProvider } from '@/src/components/providers/FirebaseRealtimeProvider';
import { AppShell } from '@/src/components/layout/AppShell';

export default function DashboardPage() {
  return (
    <FirebaseRealtimeProvider>
      <AppShell />
    </FirebaseRealtimeProvider>
  );
}
