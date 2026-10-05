export type UserRole =
  | 'OWNER'
  | 'ADMIN'
  | 'DEPARTMENT_SUPERVISOR'
  | 'MEMBER'
  | 'GUEST';

export type PresenceStatus =
  | 'AVAILABLE'
  | 'AWAY'
  | 'BUSY'
  | 'OFFLINE'
  | 'DND';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type AIModelProvider =
  | 'NVIDIA'
  | 'GEMINI'
  | 'OPENAI'
  | 'ANTHROPIC'
  | 'OPENROUTER'
  | 'OPENCLAW'
  | 'NINEROUTER';

export type AIStatus =
  | 'WORKING'
  | 'THINKING'
  | 'IN_MEETING'
  | 'PROCESSING'
  | 'WAITING_APPROVAL'
  | 'PAUSED'
  | 'ERROR';

export type AutonomyLevel = 0 | 1 | 2 | 3 | 4;

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TaskStatus =
  | 'TODO'
  | 'WORKING'
  | 'REVIEW'
  | 'COMPLETED'
  | 'REJECTED';

export interface UserProfile {
  uid: string;
  displayName: string;
  avatarColor: string;
  role: UserRole;
  departmentId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  emergencyPauseAllAI: boolean;
  monthlyBudgetLimit: number;
  requireApprovalExternalComm: boolean;
  requireApprovalFinancial: boolean;
  requireApprovalDestructive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Department {
  id: string;
  workspaceId: string;
  name: string;
  supervisorId: string;
  supervisorName: string;
  goals: string;
  monthlyBudget: number;
  spentBudget: number;
  paused: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AIEmployee {
  id: string;
  workspaceId: string;
  departmentId: string;
  supervisorId: string;
  name: string;
  role: string;
  avatarColor: string;
  personality: string;
  systemPrompt: string;
  restrictions: string;
  modelProvider: AIModelProvider;
  modelName: string;
  temperature: number;
  autonomyLevel: AutonomyLevel;
  status: AIStatus;
  dailyBudget: number;
  monthlyBudget: number;
  spentToday: number;
  spentMonth: number;
  performanceScore: number;
  tasksCompleted: number;
  tasksPending: number;
  x: number;
  y: number;
  roomId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AITask {
  id: string;
  workspaceId: string;
  departmentId: string;
  aiEmployeeId: string;
  aiEmployeeName: string;
  creatorId: string;
  title: string;
  description: string;
  priority: RiskLevel;
  status: TaskStatus;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  estimatedCost: number;
  outputReport: string;
  deadline: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AIActivityLog {
  id: string;
  workspaceId: string;
  departmentId: string;
  aiEmployeeId: string;
  aiEmployeeName: string;
  actorId: string;
  action: string;
  details: string;
  status:
    | 'SUCCESS'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'REJECTED'
    | 'PAUSED'
    | 'ERROR';
  riskLevel: RiskLevel;
  costIncurred: number;
  createdAt?: unknown;
}

export interface PlayerPresence {
  uid: string;
  workspaceId: string;
  officeId: string;
  roomId: string;
  displayName: string;
  role: UserRole;
  avatarColor: string;
  x: number;
  y: number;
  direction: Direction;
  status: PresenceStatus;
  inCall: boolean;
  updatedAt?: unknown;
}

export interface ChatMessage {
  id: string;
  workspaceId: string;
  channelType: 'GLOBAL' | 'ROOM' | 'PROXIMITY' | 'DM' | 'AI_DIRECT';
  roomId: string;
  senderId: string;
  senderName: string;
  senderType: 'HUMAN' | 'AI';
  content: string;
  createdAt?: unknown;
}

export interface MapObjectItem {
  id: string;
  type:
    | 'desk'
    | 'chair'
    | 'computer'
    | 'whiteboard'
    | 'tv'
    | 'coffee_machine'
    | 'door'
    | 'printer'
    | 'bookshelf'
    | 'meeting_table'
    | 'plant'
    | 'server_rack'
    | 'sofa';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  collidable: boolean;
  interactive: boolean;
  actionType?:
    | 'OPEN_MEETING'
    | 'OPEN_WHITEBOARD'
    | 'OPEN_AI_CENTER'
    | 'OPEN_DOCS'
    | 'BREW_COFFEE'
    | 'VIEW_METRICS';
  roomId: string;
}

export interface MapRoomZone {
  id: string;
  name: string;
  category:
    | 'LOBBY'
    | 'WORKSPACE'
    | 'MEETING_ROOM'
    | 'LOUNGE'
    | 'PRIVATE_OFFICE'
    | 'SERVER_ROOM'
    | 'OUTDOOR';
  x: number;
  y: number;
  width: number;
  height: number;
  floorColor: string;
  departmentId?: string;
}

export interface MapPortal {
  id: string;
  label: string;
  sourceX: number;
  sourceY: number;
  destinationX: number;
  destinationY: number;
  destinationRoomId: string;
}

export interface OfficeMapData {
  id: string;
  workspaceId: string;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  objects: MapObjectItem[];
  rooms: MapRoomZone[];
  portals: MapPortal[];
}

export interface AIKnowledgeDoc {
  id: string;
  workspaceId: string;
  departmentId: string;
  title: string;
  category: string;
  content: string;
  authorId: string;
  createdAt?: unknown;
}

export interface AIKpi {
  id: string;
  workspaceId: string;
  departmentId: string;
  aiEmployeeId: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  creatorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
