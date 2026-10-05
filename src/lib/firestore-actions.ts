'use client';

import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  db,
  auth,
  handleFirestoreError,
  OperationType,
} from '@/src/lib/firebase';
import {
  DEFAULT_WORKSPACE_ID,
  INITIAL_DEPARTMENTS,
  INITIAL_AI_EMPLOYEES,
  INITIAL_AI_TASKS,
  INITIAL_OFFICE_MAP,
  INITIAL_KNOWLEDGE_DOCS,
  INITIAL_KPIS,
  INITIAL_ACTIVITY_LOGS,
} from '@/src/lib/seed-data';
import {
  AIEmployee,
  AITask,
  Department,
  OfficeMapData,
  PresenceStatus,
  Direction,
  RiskLevel,
  AIModelProvider,
  AutonomyLevel,
} from '@/src/types';

export async function ensureWorkspaceSeeded(userId: string, userEmail: string, displayName: string) {
  if (!auth.currentUser?.emailVerified) return;

  // 1. Ensure User public profile + split private PII document
  const userPath = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const isBootstrappedAdmin = userEmail === 'lintangsyahdewo26@gmail.com';
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: userId,
        displayName: (displayName || 'Executive Supervisor').slice(0, 100),
        avatarColor: '#10b981',
        role: isBootstrappedAdmin ? 'OWNER' : 'DEPARTMENT_SUPERVISOR',
        departmentId: 'dept_marketing',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const privRef = doc(db, 'users', userId, 'private', 'info');
      await setDoc(privRef, {
        uid: userId,
        email: (userEmail || 'user@example.com').slice(0, 256),
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  // 2. Check if default workspace exists
  const wsPath = `workspaces/${DEFAULT_WORKSPACE_ID}`;
  try {
    const wsRef = doc(db, 'workspaces', DEFAULT_WORKSPACE_ID);
    const wsSnap = await getDoc(wsRef);
    if (wsSnap.exists()) {
      return;
    }

    await setDoc(wsRef, {
      id: DEFAULT_WORKSPACE_ID,
      name: 'Acme Corporation Global',
      slug: 'acme-corp',
      ownerId: userId,
      emergencyPauseAllAI: false,
      monthlyBudgetLimit: 520,
      requireApprovalExternalComm: true,
      requireApprovalFinancial: true,
      requireApprovalDestructive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Seed Departments
    for (const dept of INITIAL_DEPARTMENTS) {
      await setDoc(
        doc(db, 'workspaces', DEFAULT_WORKSPACE_ID, 'departments', dept.id),
        {
          ...dept,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
    }

    // Seed AI Employees
    for (const ai of INITIAL_AI_EMPLOYEES) {
      await setDoc(
        doc(db, 'workspaces', DEFAULT_WORKSPACE_ID, 'aiEmployees', ai.id),
        {
          ...ai,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
    }

    // Seed AI Tasks
    for (const task of INITIAL_AI_TASKS) {
      await setDoc(
        doc(db, 'workspaces', DEFAULT_WORKSPACE_ID, 'aiTasks', task.id),
        {
          ...task,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
    }

    // Seed Office Map
    await setDoc(
      doc(db, 'workspaces', DEFAULT_WORKSPACE_ID, 'maps', INITIAL_OFFICE_MAP.id),
      {
        id: INITIAL_OFFICE_MAP.id,
        workspaceId: DEFAULT_WORKSPACE_ID,
        name: INITIAL_OFFICE_MAP.name,
        width: INITIAL_OFFICE_MAP.width,
        height: INITIAL_OFFICE_MAP.height,
        tileSize: INITIAL_OFFICE_MAP.tileSize,
        objectsJson: JSON.stringify(INITIAL_OFFICE_MAP.objects),
        roomsJson: JSON.stringify(INITIAL_OFFICE_MAP.rooms),
        portalsJson: JSON.stringify(INITIAL_OFFICE_MAP.portals),
        updatedBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );

    // Seed Knowledge Docs
    for (const kdoc of INITIAL_KNOWLEDGE_DOCS) {
      await setDoc(
        doc(db, 'workspaces', DEFAULT_WORKSPACE_ID, 'knowledge', kdoc.id),
        {
          ...kdoc,
          authorId: userId,
          createdAt: serverTimestamp(),
        }
      );
    }

    // Seed KPIs
    for (const kpi of INITIAL_KPIS) {
      await setDoc(
        doc(db, 'workspaces', DEFAULT_WORKSPACE_ID, 'kpis', kpi.id),
        {
          ...kpi,
          creatorId: userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
    }

    // Seed Activity Logs
    for (const logItem of INITIAL_ACTIVITY_LOGS) {
      await setDoc(
        doc(db, 'workspaces', DEFAULT_WORKSPACE_ID, 'aiActivityLogs', logItem.id),
        {
          ...logItem,
          actorId: userId,
          createdAt: serverTimestamp(),
        }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, wsPath);
  }
}

export async function syncPlayerPresence(params: {
  uid: string;
  displayName: string;
  role: string;
  avatarColor: string;
  x: number;
  y: number;
  direction: Direction;
  status: PresenceStatus;
  roomId: string;
  inCall: boolean;
}) {
  if (!auth.currentUser?.emailVerified) return;
  const path = `workspaces/${DEFAULT_WORKSPACE_ID}/presence/${params.uid}`;
  try {
    const ref = doc(db, 'workspaces', DEFAULT_WORKSPACE_ID, 'presence', params.uid);
    await setDoc(ref, {
      uid: params.uid,
      workspaceId: DEFAULT_WORKSPACE_ID,
      officeId: 'hq_main_floor',
      roomId: params.roomId.slice(0, 64),
      displayName: params.displayName.slice(0, 100),
      role: params.role.slice(0, 32),
      avatarColor: params.avatarColor.slice(0, 32),
      x: Math.round(params.x),
      y: Math.round(params.y),
      direction: params.direction,
      status: params.status,
      inCall: params.inCall,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function sendRealtimeChatMessage(params: {
  channelType: 'GLOBAL' | 'ROOM' | 'PROXIMITY' | 'DM' | 'AI_DIRECT';
  roomId: string;
  senderId: string;
  senderName: string;
  senderType: 'HUMAN' | 'AI';
  content: string;
}) {
  if (!auth.currentUser?.emailVerified) return;
  const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `workspaces/${DEFAULT_WORKSPACE_ID}/messages/${msgId}`;
  try {
    await setDoc(doc(db, 'workspaces', DEFAULT_WORKSPACE_ID, 'messages', msgId), {
      id: msgId,
      workspaceId: DEFAULT_WORKSPACE_ID,
      channelType: params.channelType,
      roomId: params.roomId.slice(0, 128),
      senderId: params.senderId.slice(0, 128),
      senderName: params.senderName.slice(0, 100),
      senderType: params.senderType,
      content: params.content.slice(0, 2000),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function recordAIActivityLog(params: {
  departmentId: string;
  aiEmployeeId: string;
  aiEmployeeName: string;
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
}) {
  // Dispatch automatic WhatsApp notification via Baileys Gateway
  if (
    params.status === 'PENDING_APPROVAL' ||
    params.riskLevel === 'HIGH' ||
    params.riskLevel === 'CRITICAL' ||
    params.status === 'APPROVED' ||
    params.status === 'REJECTED'
  ) {
    fetch('/api/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'SEND_NOTIFICATION',
        eventType: `AI_${params.status}`,
        message: `🔔 *[NexusOS AI Workforce Alert]*\nAgent: *${params.aiEmployeeName}*\n📌 Action: ${params.action}\n⚠️ Risk: ${params.riskLevel} | Status: *${params.status}*\n📄 Detail: ${params.details.slice(
          0,
          140
        )}`,
      }),
    }).catch(() => {});
  }

  if (!auth.currentUser?.emailVerified) return;
  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `workspaces/${DEFAULT_WORKSPACE_ID}/aiActivityLogs/${logId}`;
  try {
    await setDoc(
      doc(db, 'workspaces', DEFAULT_WORKSPACE_ID, 'aiActivityLogs', logId),
      {
        id: logId,
        workspaceId: DEFAULT_WORKSPACE_ID,
        departmentId: params.departmentId,
        aiEmployeeId: params.aiEmployeeId,
        aiEmployeeName: params.aiEmployeeName.slice(0, 100),
        actorId: auth.currentUser.uid,
        action: params.action.slice(0, 200),
        details: params.details.slice(0, 1500),
        status: params.status,
        riskLevel: params.riskLevel,
        costIncurred: Math.max(0, Number(params.costIncurred) || 0),
        createdAt: serverTimestamp(),
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createNewAITask(params: {
  departmentId: string;
  aiEmployee: AIEmployee;
  title: string;
  description: string;
  priority: RiskLevel;
  deadline: string;
  requiresApproval: boolean;
  estimatedCost: number;
  outputReport?: string;
  initialStatus?: AITask['status'];
}) {
  if (!auth.currentUser?.emailVerified) return null;
  const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const path = `workspaces/${DEFAULT_WORKSPACE_ID}/aiTasks/${taskId}`;
  try {
    const newTask = {
      id: taskId,
      workspaceId: DEFAULT_WORKSPACE_ID,
      departmentId: params.departmentId,
      aiEmployeeId: params.aiEmployee.id,
      aiEmployeeName: params.aiEmployee.name,
      creatorId: auth.currentUser.uid,
      title: params.title.slice(0, 200),
      description: params.description.slice(0, 2000),
      priority: params.priority,
      status: params.initialStatus || 'TODO',
      riskLevel: params.priority,
      requiresApproval: params.requiresApproval,
      estimatedCost: Math.max(0, params.estimatedCost),
      outputReport: (params.outputReport || 'Queued for AI execution.').slice(0, 5000),
      deadline: (params.deadline || 'This Week').slice(0, 64),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(
      doc(db, 'workspaces', DEFAULT_WORKSPACE_ID, 'aiTasks', taskId),
      newTask
    );

    await recordAIActivityLog({
      departmentId: params.departmentId,
      aiEmployeeId: params.aiEmployee.id,
      aiEmployeeName: params.aiEmployee.name,
      action: `Created Task: ${params.title.slice(0, 80)}`,
      details: `Priority: ${params.priority}. Assigned to ${params.aiEmployee.name}.`,
      status: params.initialStatus === 'REVIEW' ? 'PENDING_APPROVAL' : 'SUCCESS',
      riskLevel: params.priority,
      costIncurred: params.estimatedCost,
    });

    return taskId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateAITaskStatusAndOutput(params: {
  task: AITask;
  status: AITask['status'];
  outputReport?: string;
  requiresApproval?: boolean;
  estimatedCost?: number;
}) {
  if (!auth.currentUser?.emailVerified) return;
  const path = `workspaces/${DEFAULT_WORKSPACE_ID}/aiTasks/${params.task.id}`;
  try {
    await updateDoc(
      doc(db, 'workspaces', DEFAULT_WORKSPACE_ID, 'aiTasks', params.task.id),
      {
        status: params.status,
        outputReport: (params.outputReport ?? params.task.outputReport).slice(
          0,
          5000
        ),
        requiresApproval:
          params.requiresApproval ?? params.task.requiresApproval,
        estimatedCost: params.estimatedCost ?? params.task.estimatedCost,
        priority: params.task.priority,
        updatedAt: serverTimestamp(),
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateAIEmployeeState(
  ai: AIEmployee,
  updates: Partial<
    Pick<
      AIEmployee,
      | 'name'
      | 'role'
      | 'personality'
      | 'systemPrompt'
      | 'restrictions'
      | 'modelProvider'
      | 'modelName'
      | 'temperature'
      | 'autonomyLevel'
      | 'status'
      | 'dailyBudget'
      | 'monthlyBudget'
      | 'spentToday'
      | 'spentMonth'
      | 'performanceScore'
      | 'tasksCompleted'
      | 'tasksPending'
      | 'x'
      | 'y'
      | 'roomId'
    >
  >
) {
  if (!auth.currentUser?.emailVerified) return;
  const path = `workspaces/${DEFAULT_WORKSPACE_ID}/aiEmployees/${ai.id}`;
  try {
    await updateDoc(
      doc(db, 'workspaces', DEFAULT_WORKSPACE_ID, 'aiEmployees', ai.id),
      {
        name: (updates.name ?? ai.name).slice(0, 100),
        role: (updates.role ?? ai.role).slice(0, 120),
        avatarColor: ai.avatarColor,
        personality: (updates.personality ?? ai.personality).slice(0, 500),
        systemPrompt: (updates.systemPrompt ?? ai.systemPrompt).slice(0, 2000),
        restrictions: (updates.restrictions ?? ai.restrictions).slice(0, 1000),
        modelProvider: (updates.modelProvider ?? ai.modelProvider) as AIModelProvider,
        modelName: (updates.modelName ?? ai.modelName).slice(0, 100),
        temperature: updates.temperature ?? ai.temperature,
        autonomyLevel: (updates.autonomyLevel ?? ai.autonomyLevel) as AutonomyLevel,
        status: updates.status ?? ai.status,
        dailyBudget: updates.dailyBudget ?? ai.dailyBudget,
        monthlyBudget: updates.monthlyBudget ?? ai.monthlyBudget,
        spentToday: Number((updates.spentToday ?? ai.spentToday).toFixed(2)),
        spentMonth: Number((updates.spentMonth ?? ai.spentMonth).toFixed(2)),
        performanceScore: updates.performanceScore ?? ai.performanceScore,
        tasksCompleted: updates.tasksCompleted ?? ai.tasksCompleted,
        tasksPending: updates.tasksPending ?? ai.tasksPending,
        x: updates.x ?? ai.x,
        y: updates.y ?? ai.y,
        roomId: updates.roomId ?? ai.roomId,
        updatedAt: serverTimestamp(),
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createNewAIEmployeeInFirestore(params: {
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
  autonomyLevel: AutonomyLevel;
  dailyBudget: number;
  monthlyBudget: number;
  roomId: string;
  x: number;
  y: number;
}) {
  if (!auth.currentUser?.emailVerified) return;
  const aiId = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const path = `workspaces/${DEFAULT_WORKSPACE_ID}/aiEmployees/${aiId}`;
  try {
    await setDoc(
      doc(db, 'workspaces', DEFAULT_WORKSPACE_ID, 'aiEmployees', aiId),
      {
        id: aiId,
        workspaceId: DEFAULT_WORKSPACE_ID,
        departmentId: params.departmentId,
        supervisorId: params.supervisorId,
        name: params.name.slice(0, 100),
        role: params.role.slice(0, 120),
        avatarColor: params.avatarColor.slice(0, 32),
        personality: params.personality.slice(0, 500),
        systemPrompt: params.systemPrompt.slice(0, 2000),
        restrictions: params.restrictions.slice(0, 1000),
        modelProvider: params.modelProvider,
        modelName: params.modelName.slice(0, 100),
        temperature: 0.6,
        autonomyLevel: params.autonomyLevel,
        status: 'WORKING',
        dailyBudget: Math.max(1, params.dailyBudget),
        monthlyBudget: Math.max(5, params.monthlyBudget),
        spentToday: 0,
        spentMonth: 0,
        performanceScore: 90,
        tasksCompleted: 0,
        tasksPending: 0,
        x: params.x,
        y: params.y,
        roomId: params.roomId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );

    await recordAIActivityLog({
      departmentId: params.departmentId,
      aiEmployeeId: aiId,
      aiEmployeeName: params.name,
      action: `Provisioned New AI Employee (${params.modelProvider})`,
      details: `Role: ${params.role}, Model: ${params.modelName}, Autonomy Level: ${params.autonomyLevel}`,
      status: 'SUCCESS',
      riskLevel: 'LOW',
      costIncurred: 0,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleEmergencyPauseAllAI(
  currentWorkspace: {
    name: string;
    monthlyBudgetLimit: number;
    requireApprovalExternalComm: boolean;
    requireApprovalFinancial: boolean;
    requireApprovalDestructive: boolean;
  },
  pause: boolean,
  allAIs: AIEmployee[]
) {
  if (!auth.currentUser?.emailVerified) return;
  const wsPath = `workspaces/${DEFAULT_WORKSPACE_ID}`;
  try {
    await updateDoc(doc(db, 'workspaces', DEFAULT_WORKSPACE_ID), {
      name: currentWorkspace.name,
      emergencyPauseAllAI: pause,
      monthlyBudgetLimit: currentWorkspace.monthlyBudgetLimit,
      requireApprovalExternalComm: currentWorkspace.requireApprovalExternalComm,
      requireApprovalFinancial: currentWorkspace.requireApprovalFinancial,
      requireApprovalDestructive: currentWorkspace.requireApprovalDestructive,
      updatedAt: serverTimestamp(),
    });

    for (const ai of allAIs) {
      await updateAIEmployeeState(ai, {
        status: pause ? 'PAUSED' : 'WORKING',
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, wsPath);
  }
}

export async function toggleDepartmentPauseAI(
  dept: Department,
  pause: boolean,
  deptAIs: AIEmployee[]
) {
  if (!auth.currentUser?.emailVerified) return;
  const path = `workspaces/${DEFAULT_WORKSPACE_ID}/departments/${dept.id}`;
  try {
    await updateDoc(
      doc(db, 'workspaces', DEFAULT_WORKSPACE_ID, 'departments', dept.id),
      {
        name: dept.name,
        supervisorId: dept.supervisorId,
        supervisorName: dept.supervisorName,
        goals: dept.goals,
        monthlyBudget: dept.monthlyBudget,
        spentBudget: dept.spentBudget,
        paused: pause,
        updatedAt: serverTimestamp(),
      }
    );

    for (const ai of deptAIs) {
      await updateAIEmployeeState(ai, {
        status: pause ? 'PAUSED' : 'WORKING',
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveOfficeMapToFirestore(mapData: OfficeMapData) {
  if (!auth.currentUser?.emailVerified) return;
  const path = `workspaces/${DEFAULT_WORKSPACE_ID}/maps/${mapData.id}`;
  try {
    await updateDoc(
      doc(db, 'workspaces', DEFAULT_WORKSPACE_ID, 'maps', mapData.id),
      {
        name: mapData.name.slice(0, 100),
        width: mapData.width,
        height: mapData.height,
        tileSize: mapData.tileSize,
        objectsJson: JSON.stringify(mapData.objects).slice(0, 50000),
        roomsJson: JSON.stringify(mapData.rooms).slice(0, 20000),
        portalsJson: JSON.stringify(mapData.portals).slice(0, 10000),
        updatedBy: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function addKnowledgeDocumentToFirestore(params: {
  departmentId: string;
  title: string;
  category: string;
  content: string;
}) {
  if (!auth.currentUser?.emailVerified) return;
  const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const path = `workspaces/${DEFAULT_WORKSPACE_ID}/knowledge/${docId}`;
  try {
    await setDoc(
      doc(db, 'workspaces', DEFAULT_WORKSPACE_ID, 'knowledge', docId),
      {
        id: docId,
        workspaceId: DEFAULT_WORKSPACE_ID,
        departmentId: params.departmentId,
        title: params.title.slice(0, 160),
        category: params.category.slice(0, 64),
        content: params.content.slice(0, 8000),
        authorId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removePlayerPresence(uid: string) {
  if (!auth.currentUser?.emailVerified) return;
  const path = `workspaces/${DEFAULT_WORKSPACE_ID}/presence/${uid}`;
  try {
    await deleteDoc(doc(db, 'workspaces', DEFAULT_WORKSPACE_ID, 'presence', uid));
  } catch {
    // Ignore disconnect cleanup errors
  }
}
