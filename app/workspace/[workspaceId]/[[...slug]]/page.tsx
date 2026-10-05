import React from 'react';
import { FirebaseRealtimeProvider } from '@/src/components/providers/FirebaseRealtimeProvider';
import { AppShell } from '@/src/components/layout/AppShell';

export default function WorkspaceCatchAllPage() {
  return (
    <FirebaseRealtimeProvider>
      <AppShell />
    </FirebaseRealtimeProvider>
  );
}
