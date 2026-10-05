'use client';

import React, { useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/src/lib/firebase';
import { useAppStore, ActiveTabView } from '@/src/store/useAppStore';
import { syncPlayerPresence } from '@/src/lib/firestore-actions';
import { soundFX } from '@/src/lib/sound';
import { PresenceStatus, UserRole } from '@/src/types';
import { VirtualOfficeCanvas } from '@/src/components/office/VirtualOfficeCanvas';
import { MeetingRoomOverlay } from '@/src/components/office/MeetingRoomOverlay';
import { RightCollaborationSidebar } from '@/src/components/office/RightCollaborationSidebar';
import { WorkspaceDashboardOverview } from '@/src/components/dashboard/WorkspaceDashboardOverview';
import { AIWorkforceControlCenter } from '@/src/components/ai-workforce/AIWorkforceControlCenter';
import { AITaskBoardAndApprovals } from '@/src/components/ai-workforce/AITaskBoardAndApprovals';
import { AIStandupAndCollaborationView } from '@/src/components/ai-workforce/AIStandupAndCollaborationView';
import { OfficeMapEditorView } from '@/src/components/office/OfficeMapEditorView';
import { GovernanceAndAdminView } from '@/src/components/governance/GovernanceAndAdminView';
import { UnifiedSettingsAndIntegrationsView } from '@/src/components/settings/UnifiedSettingsAndIntegrationsView';
import {
  Map,
  LayoutDashboard,
  Bot,
  Kanban,
  ShieldCheck,
  UsersRound,
  PenTool,
  Lock,
  BarChart3,
  Settings,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  LogIn,
  LogOut,
  Menu,
  X,
  MessageSquare,
} from 'lucide-react';

export function AppShell() {
  const currentUser = useAppStore((s) => s.currentUser);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const aiTasks = useAppStore((s) => s.aiTasks);
  const localPlayerPos = useAppStore((s) => s.localPlayerPos);
  const setLocalPlayerPos = useAppStore((s) => s.setLocalPlayerPos);
  const inMeetingRoom = useAppStore((s) => s.inMeetingRoom);
  const setInMeetingRoom = useAppStore((s) => s.setInMeetingRoom);
  const micEnabled = useAppStore((s) => s.micEnabled);
  const setMicEnabled = useAppStore((s) => s.setMicEnabled);
  const cameraEnabled = useAppStore((s) => s.cameraEnabled);
  const setCameraEnabled = useAppStore((s) => s.setCameraEnabled);
  const workspace = useAppStore((s) => s.workspace);

  const [soundMuted, setSoundMuted] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  const pendingApprovalsCount = aiTasks.filter(
    (t) => t.status === 'REVIEW'
  ).length;

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      soundFX.playNotification();
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Unable to sign in with Google'
      );
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch {}
  };

  const handleChangePresenceStatus = (nextStatus: PresenceStatus) => {
    setLocalPlayerPos({
      ...localPlayerPos,
      status: nextStatus,
    });
    if (currentUser) {
      syncPlayerPresence({
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        role: currentUser.role,
        avatarColor: currentUser.avatarColor,
        x: localPlayerPos.x,
        y: localPlayerPos.y,
        direction: 'DOWN',
        status: nextStatus,
        roomId: localPlayerPos.roomId,
        inCall: inMeetingRoom,
      });
    }
  };

  const handleChangeRole = (nextRole: UserRole) => {
    if (!currentUser) {
      setCurrentUser({
        uid: 'local_supervisor',
        displayName: 'Andi Pratama',
        avatarColor: '#10b981',
        role: nextRole,
        departmentId: 'dept_marketing',
      });
      return;
    }
    setCurrentUser({
      ...currentUser,
      role: nextRole,
    });
  };

  const navItems: {
    id: ActiveTabView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'VIRTUAL_OFFICE', label: '2D Virtual Office', icon: Map },
    { id: 'DASHBOARD', label: 'Workspace Overview', icon: LayoutDashboard },
    {
      id: 'AI_CONTROL_CENTER',
      label: 'AI Workforce Center',
      icon: Bot,
    },
    { id: 'TASK_BOARD', label: 'AI Task Board', icon: Kanban },
    {
      id: 'APPROVAL_QUEUE',
      label: 'Human Approvals',
      icon: ShieldCheck,
      badge: pendingApprovalsCount,
    },
    {
      id: 'AI_STANDUP',
      label: 'AI Standup & Collab',
      icon: UsersRound,
    },
    { id: 'OFFICE_EDITOR', label: 'Office Map Editor', icon: PenTool },
    { id: 'AI_GOVERNANCE', label: 'AI Governance & Audit', icon: Lock },
    { id: 'ADMIN_ANALYTICS', label: 'Cost & Analytics', icon: BarChart3 },
    {
      id: 'SETTINGS_INTEGRATIONS',
      label: 'Settings, AI, Midtrans & WA',
      icon: Settings,
    },
  ];

  const renderLeftSidebarContent = (onSelectTab?: () => void) => (
    <>
      <div className="p-3 space-y-1 overflow-y-auto flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                soundFX.playClick();
                setActiveTab(item.id);
                if (onSelectTab) onSelectTab();
              }}
              className={`w-full min-h-[42px] flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-2.5 truncate">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    isActive ? 'text-white' : 'text-amber-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom User Presence & RBAC Role Control */}
      <div className="p-3.5 border-t border-slate-800 space-y-3 bg-slate-950/40 shrink-0">
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">
            Presence Status
          </label>
          <select
            value={localPlayerPos.status}
            onChange={(e) =>
              handleChangePresenceStatus(e.target.value as PresenceStatus)
            }
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
          >
            <option value="AVAILABLE">🟢 Available</option>
            <option value="AWAY">🟡 Away</option>
            <option value="BUSY">🔴 Busy</option>
            <option value="DND">🌙 Do Not Disturb</option>
            <option value="OFFLINE">⚫ Offline</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-slate-400 mb-1">
            Active RBAC Role
          </label>
          <select
            value={currentUser?.role || 'DEPARTMENT_SUPERVISOR'}
            onChange={(e) => handleChangeRole(e.target.value as UserRole)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono"
          >
            <option value="OWNER">OWNER (Full Control)</option>
            <option value="ADMIN">ADMIN (Company Ops)</option>
            <option value="DEPARTMENT_SUPERVISOR">DEPARTMENT_SUPERVISOR</option>
            <option value="MEMBER">MEMBER (Collaborator)</option>
            <option value="GUEST">GUEST (Read-Only)</option>
          </select>
        </div>

        {/* Quick Audio / Meeting Bar */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => {
              soundFX.playClick();
              setMicEnabled(!micEnabled);
            }}
            title="Toggle Microphone"
            className={`p-2 rounded-lg text-xs transition-colors ${
              micEnabled
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {micEnabled ? (
              <Mic className="w-4 h-4" />
            ) : (
              <MicOff className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setCameraEnabled(!cameraEnabled);
            }}
            title="Toggle Camera"
            className={`p-2 rounded-lg text-xs transition-colors ${
              cameraEnabled
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {cameraEnabled ? (
              <Video className="w-4 h-4" />
            ) : (
              <VideoOff className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => {
              soundFX.playMeetingJoin();
              setInMeetingRoom(!inMeetingRoom);
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              inMeetingRoom
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {inMeetingRoom ? 'In Boardroom' : 'Join Call'}
          </button>

          <button
            onClick={() => {
              const next = !soundMuted;
              soundFX.muted = next;
              setSoundMuted(next);
            }}
            title="Toggle Sound Effects"
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            {soundMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex flex-col bg-slate-950 text-slate-100">
      {/* Top Bar Contract: 3 Zones (Brand Wordmark | 5 Nav Links | Primary Actions) */}
      <header className="h-14 shrink-0 flex items-center justify-between px-3 sm:px-6 border-b border-slate-800 bg-slate-900">
        {/* Zone 1: Mobile Menu Trigger + Single text element wordmark */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <a
            href="#virtual-office"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('VIRTUAL_OFFICE');
            }}
            className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap"
          >
            NexusOS
          </a>
        </div>

        {/* Zone 2: 5 Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-xs font-medium text-slate-300">
          <button
            onClick={() => setActiveTab('VIRTUAL_OFFICE')}
            className={`hover:text-white transition-colors whitespace-nowrap ${
              activeTab === 'VIRTUAL_OFFICE'
                ? 'text-white underline underline-offset-4 decoration-emerald-500'
                : ''
            }`}
          >
            Virtual Office
          </button>
          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`hover:text-white transition-colors whitespace-nowrap ${
              activeTab === 'DASHBOARD'
                ? 'text-white underline underline-offset-4 decoration-emerald-500'
                : ''
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('AI_CONTROL_CENTER')}
            className={`hover:text-white transition-colors whitespace-nowrap ${
              activeTab === 'AI_CONTROL_CENTER'
                ? 'text-white underline underline-offset-4 decoration-emerald-500'
                : ''
            }`}
          >
            AI Workforce
          </button>
          <button
            onClick={() => setActiveTab('APPROVAL_QUEUE')}
            className={`hover:text-white transition-colors whitespace-nowrap ${
              activeTab === 'APPROVAL_QUEUE'
                ? 'text-white underline underline-offset-4 decoration-emerald-500'
                : ''
            }`}
          >
            Approvals ({pendingApprovalsCount})
          </button>
          <button
            onClick={() => setActiveTab('SETTINGS_INTEGRATIONS')}
            className={`hover:text-white transition-colors whitespace-nowrap ${
              activeTab === 'SETTINGS_INTEGRATIONS'
                ? 'text-white underline underline-offset-4 decoration-emerald-500'
                : ''
            }`}
          >
            Settings & Integrations
          </button>
        </nav>

        {/* Zone 3: Primary Actions + Mobile Chat Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileRightOpen(true)}
            className="xl:hidden p-2 rounded-lg bg-slate-800 text-emerald-400 hover:text-white"
            title="Open Team & AI Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {currentUser ? (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                Sign Out ({currentUser.displayName.split(' ')[0]})
              </span>
            </button>
          ) : (
            <button
              onClick={handleGoogleLogin}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white rounded-lg transition-colors whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {authError && (
        <div className="bg-rose-950/90 border-b border-rose-800 px-4 sm:px-6 py-2 text-xs text-rose-200 flex items-center justify-between">
          <span className="truncate">{authError}</span>
          <button
            onClick={() => setAuthError(null)}
            className="underline text-rose-300 ml-3 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Desktop Left Workspace Navigation Sidebar */}
        <aside className="hidden lg:flex w-60 bg-slate-900 border-r border-slate-800 flex-col justify-between shrink-0">
          {renderLeftSidebarContent()}
        </aside>

        {/* Mobile/Tablet Left Drawer */}
        {mobileNavOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
              onClick={() => setMobileNavOpen(false)}
            />
            <aside className="relative w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-full z-10 shadow-2xl">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-sm font-bold text-white">
                  NexusOS Navigation
                </span>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {renderLeftSidebarContent(() => setMobileNavOpen(false))}
            </aside>
          </div>
        )}

        {/* Center Viewport */}
        <main className="flex-1 relative overflow-y-auto bg-slate-950 pb-16 lg:pb-0">
          {workspace.emergencyPauseAllAI && (
            <div className="bg-rose-950/90 border-b border-rose-700 px-4 sm:px-6 py-2 text-xs text-rose-200 flex flex-wrap items-center justify-between gap-2">
              <span>
                🛑 EMERGENCY PAUSE ACTIVE: All AI employees are paused.
              </span>
              <button
                onClick={() => setActiveTab('AI_GOVERNANCE')}
                className="underline font-semibold text-white"
              >
                Manage Controls
              </button>
            </div>
          )}

          {activeTab === 'VIRTUAL_OFFICE' && <VirtualOfficeCanvas />}
          {activeTab === 'DASHBOARD' && <WorkspaceDashboardOverview />}
          {(activeTab === 'AI_CONTROL_CENTER' ||
            activeTab === 'DEPARTMENTS') && <AIWorkforceControlCenter />}
          {activeTab === 'TASK_BOARD' && (
            <AITaskBoardAndApprovals filterReviewOnly={false} />
          )}
          {activeTab === 'APPROVAL_QUEUE' && (
            <AITaskBoardAndApprovals filterReviewOnly={true} />
          )}
          {activeTab === 'AI_STANDUP' && <AIStandupAndCollaborationView />}
          {activeTab === 'OFFICE_EDITOR' && <OfficeMapEditorView />}
          {activeTab === 'AI_GOVERNANCE' && (
            <GovernanceAndAdminView mode="GOVERNANCE" />
          )}
          {activeTab === 'ADMIN_ANALYTICS' && (
            <GovernanceAndAdminView mode="ANALYTICS" />
          )}
          {activeTab === 'SETTINGS_INTEGRATIONS' && (
            <UnifiedSettingsAndIntegrationsView />
          )}

          <MeetingRoomOverlay />
        </main>

        {/* Desktop Right Collaboration & Direct AI Chat Sidebar */}
        <RightCollaborationSidebar className="hidden xl:flex w-80 bg-slate-900 border-l border-slate-800 flex-col h-full shrink-0" />

        {/* Mobile/Tablet Right Collaboration Drawer */}
        {mobileRightOpen && (
          <div className="xl:hidden fixed inset-0 z-50 flex justify-end">
            <div
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
              onClick={() => setMobileRightOpen(false)}
            />
            <div className="relative w-80 max-w-[90vw] bg-slate-900 border-l border-slate-800 flex flex-col h-full z-10 shadow-2xl">
              <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <span className="text-xs font-bold text-white">
                  People, Office Chat & AI Direct
                </span>
                <button
                  onClick={() => setMobileRightOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <RightCollaborationSidebar className="w-full bg-slate-900 flex flex-col h-full" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (Visible on phones/tablets) */}
      <nav className="lg:hidden h-14 shrink-0 bg-slate-900 border-t border-slate-800 grid grid-cols-5 items-center px-1 z-30">
        {[
          { id: 'VIRTUAL_OFFICE' as const, label: 'Office', icon: Map },
          { id: 'DASHBOARD' as const, label: 'Home', icon: LayoutDashboard },
          { id: 'AI_CONTROL_CENTER' as const, label: 'AI Team', icon: Bot },
          {
            id: 'APPROVAL_QUEUE' as const,
            label: 'Approvals',
            icon: ShieldCheck,
          },
          {
            id: 'SETTINGS_INTEGRATIONS' as const,
            label: 'Settings',
            icon: Settings,
          },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                soundFX.playClick();
                setActiveTab(item.id);
              }}
              className={`flex flex-col items-center justify-center py-1 text-[10px] font-medium transition-colors ${
                isActive ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
