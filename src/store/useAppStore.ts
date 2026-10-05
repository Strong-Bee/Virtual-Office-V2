'use client';

import { create } from 'zustand';
import {
  UserProfile,
  Workspace,
  Department,
  AIEmployee,
  AITask,
  AIActivityLog,
  PlayerPresence,
  ChatMessage,
  OfficeMapData,
  AIKnowledgeDoc,
  AIKpi,
  PresenceStatus,
} from '@/src/types';
import {
  INITIAL_OFFICE_MAP,
  INITIAL_DEPARTMENTS,
  INITIAL_AI_EMPLOYEES,
  INITIAL_AI_TASKS,
  INITIAL_KNOWLEDGE_DOCS,
  INITIAL_KPIS,
  INITIAL_ACTIVITY_LOGS,
  DEFAULT_WORKSPACE_ID,
} from '@/src/lib/seed-data';

export type ActiveTabView =
  | 'VIRTUAL_OFFICE'
  | 'DASHBOARD'
  | 'DEPARTMENTS'
  | 'AI_CONTROL_CENTER'
  | 'TASK_BOARD'
  | 'APPROVAL_QUEUE'
  | 'AI_STANDUP'
  | 'OFFICE_EDITOR'
  | 'AI_GOVERNANCE'
  | 'ADMIN_ANALYTICS'
  | 'SETTINGS_INTEGRATIONS';

interface AppState {
  currentUser: UserProfile | null;
  authReady: boolean;
  workspace: Workspace;
  activeTab: ActiveTabView;
  selectedDepartmentId: string;
  selectedAIEmployeeId: string | null;
  interactingObjectLabel: string | null;
  nearbyAIEmployee: AIEmployee | null;
  nearbyObject: {
    id: string;
    label: string;
    actionType?: string;
  } | null;

  // Realtime collections
  departments: Department[];
  aiEmployees: AIEmployee[];
  aiTasks: AITask[];
  activityLogs: AIActivityLog[];
  players: Record<string, PlayerPresence>;
  messages: ChatMessage[];
  officeMap: OfficeMapData;
  knowledgeDocs: AIKnowledgeDoc[];
  kpis: AIKpi[];

  // Local player realtime coords (kept for fast proximity calculations without re-rendering full map)
  localPlayerPos: { x: number; y: number; roomId: string; status: PresenceStatus };

  // Voice/Video & Meeting Room state
  inMeetingRoom: boolean;
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenShareEnabled: boolean;
  whiteboardOpen: boolean;

  // Setters
  setCurrentUser: (user: UserProfile | null) => void;
  setAuthReady: (ready: boolean) => void;
  setWorkspace: (ws: Workspace) => void;
  setActiveTab: (tab: ActiveTabView) => void;
  setSelectedDepartmentId: (deptId: string) => void;
  setSelectedAIEmployeeId: (aiId: string | null) => void;
  setNearbyAIEmployee: (ai: AIEmployee | null) => void;
  setNearbyObject: (
    obj: { id: string; label: string; actionType?: string } | null
  ) => void;
  setDepartments: (depts: Department[]) => void;
  setAIEmployees: (ais: AIEmployee[]) => void;
  setAITasks: (tasks: AITask[]) => void;
  setActivityLogs: (logs: AIActivityLog[]) => void;
  setPlayers: (players: Record<string, PlayerPresence>) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  setOfficeMap: (map: OfficeMapData) => void;
  setKnowledgeDocs: (docs: AIKnowledgeDoc[]) => void;
  setKpis: (kpis: AIKpi[]) => void;
  setLocalPlayerPos: (pos: {
    x: number;
    y: number;
    roomId: string;
    status: PresenceStatus;
  }) => void;
  setInMeetingRoom: (inMeeting: boolean) => void;
  setMicEnabled: (enabled: boolean) => void;
  setCameraEnabled: (enabled: boolean) => void;
  setScreenShareEnabled: (enabled: boolean) => void;
  setWhiteboardOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  authReady: false,
  workspace: {
    id: DEFAULT_WORKSPACE_ID,
    name: 'Acme Corporation Global',
    slug: 'acme-corp',
    ownerId: 'system',
    emergencyPauseAllAI: false,
    monthlyBudgetLimit: 520,
    requireApprovalExternalComm: true,
    requireApprovalFinancial: true,
    requireApprovalDestructive: true,
  },
  activeTab: 'VIRTUAL_OFFICE',
  selectedDepartmentId: 'dept_marketing',
  selectedAIEmployeeId: 'ai_sarah',
  interactingObjectLabel: null,
  nearbyAIEmployee: null,
  nearbyObject: null,

  departments: INITIAL_DEPARTMENTS,
  aiEmployees: INITIAL_AI_EMPLOYEES,
  aiTasks: INITIAL_AI_TASKS,
  activityLogs: INITIAL_ACTIVITY_LOGS,
  players: {},
  messages: [],
  officeMap: INITIAL_OFFICE_MAP,
  knowledgeDocs: INITIAL_KNOWLEDGE_DOCS,
  kpis: INITIAL_KPIS,

  localPlayerPos: {
    x: 6 * 32,
    y: 5 * 32,
    roomId: 'room_lobby',
    status: 'AVAILABLE',
  },

  inMeetingRoom: false,
  micEnabled: false,
  cameraEnabled: false,
  screenShareEnabled: false,
  whiteboardOpen: false,

  setCurrentUser: (currentUser) => set({ currentUser }),
  setAuthReady: (authReady) => set({ authReady }),
  setWorkspace: (workspace) => set({ workspace }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSelectedDepartmentId: (selectedDepartmentId) =>
    set({ selectedDepartmentId }),
  setSelectedAIEmployeeId: (selectedAIEmployeeId) =>
    set({ selectedAIEmployeeId }),
  setNearbyAIEmployee: (nearbyAIEmployee) => set({ nearbyAIEmployee }),
  setNearbyObject: (nearbyObject) => set({ nearbyObject }),
  setDepartments: (departments) => set({ departments }),
  setAIEmployees: (aiEmployees) => set({ aiEmployees }),
  setAITasks: (aiTasks) => set({ aiTasks }),
  setActivityLogs: (activityLogs) => set({ activityLogs }),
  setPlayers: (players) => set({ players }),
  setMessages: (messages) => set({ messages }),
  setOfficeMap: (officeMap) => set({ officeMap }),
  setKnowledgeDocs: (knowledgeDocs) => set({ knowledgeDocs }),
  setKpis: (kpis) => set({ kpis }),
  setLocalPlayerPos: (localPlayerPos) => set({ localPlayerPos }),
  setInMeetingRoom: (inMeetingRoom) => set({ inMeetingRoom }),
  setMicEnabled: (micEnabled) => set({ micEnabled }),
  setCameraEnabled: (cameraEnabled) => set({ cameraEnabled }),
  setScreenShareEnabled: (screenShareEnabled) => set({ screenShareEnabled }),
  setWhiteboardOpen: (whiteboardOpen) => set({ whiteboardOpen }),
}));
