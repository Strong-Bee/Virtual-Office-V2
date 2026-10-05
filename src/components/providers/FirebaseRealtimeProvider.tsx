'use client';

import React, { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  validateFirestoreConnection,
  handleFirestoreError,
  OperationType,
} from '@/src/lib/firebase';
import {
  ensureWorkspaceSeeded,
  syncPlayerPresence,
  removePlayerPresence,
} from '@/src/lib/firestore-actions';
import { DEFAULT_WORKSPACE_ID, INITIAL_OFFICE_MAP } from '@/src/lib/seed-data';
import { useAppStore } from '@/src/store/useAppStore';
import {
  Department,
  AIEmployee,
  AITask,
  AIActivityLog,
  PlayerPresence,
  ChatMessage,
  AIKnowledgeDoc,
  AIKpi,
  UserRole,
} from '@/src/types';

export function FirebaseRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const setAuthReady = useAppStore((s) => s.setAuthReady);
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const setDepartments = useAppStore((s) => s.setDepartments);
  const setAIEmployees = useAppStore((s) => s.setAIEmployees);
  const setAITasks = useAppStore((s) => s.setAITasks);
  const setActivityLogs = useAppStore((s) => s.setActivityLogs);
  const setPlayers = useAppStore((s) => s.setPlayers);
  const setMessages = useAppStore((s) => s.setMessages);
  const setOfficeMap = useAppStore((s) => s.setOfficeMap);
  const setKnowledgeDocs = useAppStore((s) => s.setKnowledgeDocs);
  const setKpis = useAppStore((s) => s.setKpis);

  useEffect(() => {
    validateFirestoreConnection();

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        setAuthReady(true);
        return;
      }

      const isRootOwner =
        firebaseUser.email === 'lintangsyahdewo26@gmail.com';
      const defaultRole: UserRole = isRootOwner
        ? 'OWNER'
        : 'DEPARTMENT_SUPERVISOR';

      setCurrentUser({
        uid: firebaseUser.uid,
        displayName:
          firebaseUser.displayName ||
          firebaseUser.email?.split('@')[0] ||
          'Supervisor',
        avatarColor: isRootOwner ? '#10b981' : '#3b82f6',
        role: defaultRole,
        departmentId: 'dept_marketing',
      });
      setAuthReady(true);

      if (firebaseUser.emailVerified) {
        await ensureWorkspaceSeeded(
          firebaseUser.uid,
          firebaseUser.email || 'user@example.com',
          firebaseUser.displayName || 'Executive Supervisor'
        );

        await syncPlayerPresence({
          uid: firebaseUser.uid,
          displayName:
            firebaseUser.displayName ||
            firebaseUser.email?.split('@')[0] ||
            'Supervisor',
          role: defaultRole,
          avatarColor: isRootOwner ? '#10b981' : '#3b82f6',
          x: 6 * 32,
          y: 5 * 32,
          direction: 'DOWN',
          status: 'AVAILABLE',
          roomId: 'room_lobby',
          inCall: false,
        });
      }
    });

    return () => {
      unsubAuth();
    };
  }, [setCurrentUser, setAuthReady]);

  const currentUserUid = useAppStore((s) => s.currentUser?.uid);
  const authReady = useAppStore((s) => s.authReady);

  useEffect(() => {
    if (!authReady || !currentUserUid || !auth.currentUser?.emailVerified) {
      return;
    }

    const wsId = DEFAULT_WORKSPACE_ID;

    // 1. Workspace document listener
    const wsPath = `workspaces/${wsId}`;
    const unsubWs = onSnapshot(
      doc(db, 'workspaces', wsId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setWorkspace({
            id: data.id,
            name: data.name,
            slug: data.slug,
            ownerId: data.ownerId,
            emergencyPauseAllAI: Boolean(data.emergencyPauseAllAI),
            monthlyBudgetLimit: Number(data.monthlyBudgetLimit ?? 520),
            requireApprovalExternalComm: Boolean(
              data.requireApprovalExternalComm
            ),
            requireApprovalFinancial: Boolean(data.requireApprovalFinancial),
            requireApprovalDestructive: Boolean(
              data.requireApprovalDestructive
            ),
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, wsPath)
    );

    // 2. Departments listener (with secure where clause matching firestore.rules)
    const deptsPath = `workspaces/${wsId}/departments`;
    const unsubDepts = onSnapshot(
      query(
        collection(db, 'workspaces', wsId, 'departments'),
        where('workspaceId', '==', wsId)
      ),
      (snap) => {
        if (!snap.empty) {
          const list: Department[] = snap.docs.map(
            (d) => d.data() as Department
          );
          setDepartments(list);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, deptsPath)
    );

    // 3. AI Employees listener
    const aiPath = `workspaces/${wsId}/aiEmployees`;
    const unsubAI = onSnapshot(
      query(
        collection(db, 'workspaces', wsId, 'aiEmployees'),
        where('workspaceId', '==', wsId)
      ),
      (snap) => {
        if (!snap.empty) {
          const list: AIEmployee[] = snap.docs.map(
            (d) => d.data() as AIEmployee
          );
          setAIEmployees(list);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, aiPath)
    );

    // 4. AI Tasks listener
    const tasksPath = `workspaces/${wsId}/aiTasks`;
    const unsubTasks = onSnapshot(
      query(
        collection(db, 'workspaces', wsId, 'aiTasks'),
        where('workspaceId', '==', wsId)
      ),
      (snap) => {
        if (!snap.empty) {
          const list: AITask[] = snap.docs.map((d) => d.data() as AITask);
          setAITasks(list);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, tasksPath)
    );

    // 5. AI Activity Logs listener
    const logsPath = `workspaces/${wsId}/aiActivityLogs`;
    const unsubLogs = onSnapshot(
      query(
        collection(db, 'workspaces', wsId, 'aiActivityLogs'),
        where('workspaceId', '==', wsId)
      ),
      (snap) => {
        if (!snap.empty) {
          const list: AIActivityLog[] = snap.docs.map(
            (d) => d.data() as AIActivityLog
          );
          setActivityLogs(list);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, logsPath)
    );

    // 6. Multiplayer Presence listener
    const presencePath = `workspaces/${wsId}/presence`;
    const unsubPresence = onSnapshot(
      query(
        collection(db, 'workspaces', wsId, 'presence'),
        where('workspaceId', '==', wsId)
      ),
      (snap) => {
        const map: Record<string, PlayerPresence> = {};
        snap.docs.forEach((d) => {
          const p = d.data() as PlayerPresence;
          map[p.uid] = p;
        });
        setPlayers(map);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, presencePath)
    );

    // 7. Chat Messages listener
    const msgsPath = `workspaces/${wsId}/messages`;
    const unsubMsgs = onSnapshot(
      query(
        collection(db, 'workspaces', wsId, 'messages'),
        where('workspaceId', '==', wsId)
      ),
      (snap) => {
        const list: ChatMessage[] = snap.docs.map(
          (d) => d.data() as ChatMessage
        );
        setMessages(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, msgsPath)
    );

    // 8. Office Map listener
    const mapPath = `workspaces/${wsId}/maps/${INITIAL_OFFICE_MAP.id}`;
    const unsubMap = onSnapshot(
      doc(db, 'workspaces', wsId, 'maps', INITIAL_OFFICE_MAP.id),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          try {
            setOfficeMap({
              id: data.id,
              workspaceId: data.workspaceId,
              name: data.name,
              width: data.width,
              height: data.height,
              tileSize: data.tileSize,
              objects: JSON.parse(data.objectsJson || '[]'),
              rooms: JSON.parse(data.roomsJson || '[]'),
              portals: JSON.parse(data.portalsJson || '[]'),
            });
          } catch {
            // Keep default map if JSON parse fails
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, mapPath)
    );

    // 9. Knowledge Base listener
    const knowPath = `workspaces/${wsId}/knowledge`;
    const unsubKnow = onSnapshot(
      query(
        collection(db, 'workspaces', wsId, 'knowledge'),
        where('workspaceId', '==', wsId)
      ),
      (snap) => {
        if (!snap.empty) {
          setKnowledgeDocs(snap.docs.map((d) => d.data() as AIKnowledgeDoc));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, knowPath)
    );

    // 10. KPIs listener
    const kpiPath = `workspaces/${wsId}/kpis`;
    const unsubKpi = onSnapshot(
      query(
        collection(db, 'workspaces', wsId, 'kpis'),
        where('workspaceId', '==', wsId)
      ),
      (snap) => {
        if (!snap.empty) {
          setKpis(snap.docs.map((d) => d.data() as AIKpi));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, kpiPath)
    );

    const handleBeforeUnload = () => {
      removePlayerPresence(currentUserUid);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubWs();
      unsubDepts();
      unsubAI();
      unsubTasks();
      unsubLogs();
      unsubPresence();
      unsubMsgs();
      unsubMap();
      unsubKnow();
      unsubKpi();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [
    authReady,
    currentUserUid,
    setWorkspace,
    setDepartments,
    setAIEmployees,
    setAITasks,
    setActivityLogs,
    setPlayers,
    setMessages,
    setOfficeMap,
    setKnowledgeDocs,
    setKpis,
  ]);

  return <>{children}</>;
}
