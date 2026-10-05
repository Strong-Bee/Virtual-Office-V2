/**
 * Firestore Rules Hardened Test Suite (Phase 0 Dirty Dozen Verification)
 * Verifies all 12 adversarial payloads against the 8 Pillars of Hardened Rules.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'create' | 'update' | 'delete' | 'get' | 'list';
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED' | 'ALLOWED';
  violatedPillar: string;
}

export const DIRTY_DOZEN_TEST_CASES: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on User Profile',
    collectionPath: '/users/u1',
    operation: 'create',
    payload: {
      uid: 'u1',
      displayName: 'Alice',
      avatarColor: '#10b981',
      role: 'OWNER',
      isSuperRoot: true,
    },
    expectedOutcome: 'PERMISSION_DENIED',
    violatedPillar: 'Pillar 2: Strict Keys (hasOnly)',
  },
  {
    id: 2,
    name: 'Unverified Email Spoof Attack',
    collectionPath: '/admins/u_spoof',
    operation: 'create',
    payload: { email: 'lintangsyahdewo26@gmail.com', email_verified: false },
    expectedOutcome: 'PERMISSION_DENIED',
    violatedPillar: 'Email Verification Guard',
  },
  {
    id: 3,
    name: 'PII Blanket Read Attack',
    collectionPath: '/users/u1/private/info',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
    violatedPillar: 'Pillar 6: PII Isolation & Split Collection',
  },
  {
    id: 4,
    name: 'Audit Log Deletion Attack',
    collectionPath: '/workspaces/acme/aiActivityLogs/log_1',
    operation: 'delete',
    expectedOutcome: 'PERMISSION_DENIED',
    violatedPillar: 'AI Security Rule #38: Immutable Audit Trail',
  },
  {
    id: 5,
    name: 'Audit Log Tampering Attack',
    collectionPath: '/workspaces/acme/aiActivityLogs/log_1',
    operation: 'update',
    payload: { status: 'APPROVED' },
    expectedOutcome: 'PERMISSION_DENIED',
    violatedPillar: 'AI Security Rule #38: Immutable Audit Trail',
  },
  {
    id: 6,
    name: 'ID Poisoning Attack',
    collectionPath: '/workspaces/acme/../admin',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
    violatedPillar: 'Pillar 3: Path Variable Hardening (isValidId)',
  },
  {
    id: 7,
    name: 'Value Poisoning on AI Autonomy',
    collectionPath: '/workspaces/acme/aiEmployees/ai_sarah',
    operation: 'update',
    payload: { autonomyLevel: 99 },
    expectedOutcome: 'PERMISSION_DENIED',
    violatedPillar: 'Pillar 2: Boundary Limits (0..4)',
  },
  {
    id: 8,
    name: 'Timestamp Forgery Attack',
    collectionPath: '/workspaces/acme/messages/msg_1',
    operation: 'create',
    payload: { createdAt: 0 },
    expectedOutcome: 'PERMISSION_DENIED',
    violatedPillar: 'Temporal Integrity (request.time)',
  },
  {
    id: 9,
    name: 'Immortal Field Mutation on AITask',
    collectionPath: '/workspaces/acme/aiTasks/task_1',
    operation: 'update',
    payload: { creatorId: 'attacker_uid' },
    expectedOutcome: 'PERMISSION_DENIED',
    violatedPillar: 'Immortal Field Rule',
  },
  {
    id: 10,
    name: 'Terminal State Unlocking on Rejected Task',
    collectionPath: '/workspaces/acme/aiTasks/task_rejected',
    operation: 'update',
    payload: { status: 'COMPLETED' },
    expectedOutcome: 'PERMISSION_DENIED',
    violatedPillar: 'Terminal State Locking',
  },
  {
    id: 11,
    name: 'Denial of Wallet Oversized Payload',
    collectionPath: '/workspaces/acme/messages/msg_huge',
    operation: 'create',
    payload: { content: 'A'.repeat(5000) },
    expectedOutcome: 'PERMISSION_DENIED',
    violatedPillar: 'Pillar 3: String Size Guard (<= 2000)',
  },
  {
    id: 12,
    name: 'Identity Spoofing on Presence',
    collectionPath: '/workspaces/acme/presence/u1',
    operation: 'update',
    payload: { uid: 'u1', x: 100, y: 100 },
    expectedOutcome: 'PERMISSION_DENIED',
    violatedPillar: 'Pillar 2: Identity Integrity (request.auth.uid)',
  },
];
