# Phase 0: Payload-First Security TDD Specification

## 1. Data Invariants
1. **Identity Isolation & Split PII**: User email addresses are stored exclusively in `/users/{userId}/private/info` and can only be read or written by `request.auth.uid == userId` or a verified Admin.
2. **Master Gate & Workspace Scoping**: Every subcollection under `/workspaces/{workspaceId}` requires a valid `workspaceId` path variable (`isValidId`) and verified user authentication (`request.auth != null && request.auth.token.email_verified == true`).
3. **Immutable Audit Trail**: Documents in `/workspaces/{workspaceId}/aiActivityLogs/{logId}` can never be updated or deleted by any non-admin client (`allow update, delete: if false;`), enforcing AI Security Rule #38 ("AI cannot delete audit logs").
4. **Strict Keys & Anti-Shadow-Update**: Every `create` operation enforces `hasAll` and `hasOnly` on `request.resource.data.keys()`. Every `update` operation begins with `isValid[Entity](incoming())` and restricts `affectedKeys().hasOnly(...)` per named action.
5. **Temporal Integrity**: All `createdAt` fields must equal `request.time` on creation and remain immutable (`incoming().createdAt == existing().createdAt`) on update. All `updatedAt` fields must equal `request.time`.

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection on User Profile**: `{ uid: "u1", displayName: "Alice", avatarColor: "#10b981", role: "OWNER", isSuperRoot: true, createdAt: SERVER_TIME, updatedAt: SERVER_TIME }` -> Rejected by `hasOnly`.
2. **Unverified Email Spoof Attack**: Authenticated token with `email: "lintangsyahdewo26@gmail.com"` and `email_verified: false` attempting admin write -> Rejected by `request.auth.token.email_verified == true`.
3. **PII Blanket Read Attack**: User `u2` attempting `get(/users/u1/private/info)` -> Rejected by `isOwner(userId)`.
4. **Audit Log Deletion Attack**: User or AI attempting `delete(/workspaces/acme/aiActivityLogs/log_1)` -> Rejected by `allow delete: if false`.
5. **Audit Log Tampering Attack**: Attempting `update` on `/workspaces/acme/aiActivityLogs/log_1` -> Rejected by `allow update: if false`.
6. **ID Poisoning Attack**: Document ID containing 200 characters or special shell characters `../admin` -> Rejected by `isValidId(id)`.
7. **Value Poisoning on AI Autonomy**: Updating `autonomyLevel` on `/workspaces/acme/aiEmployees/ai_sarah` to `"UNRESTRICTED"` or `99` -> Rejected by `isValidAIEmployee` (`autonomyLevel is int && autonomyLevel >= 0 && autonomyLevel <= 4`).
8. **Timestamp Forgery Attack**: Creating a ChatMessage with `createdAt: Timestamp.fromMillis(0)` -> Rejected by `incoming().createdAt == request.time`.
9. **Immortal Field Mutation**: Updating `creatorId` or `createdAt` on an `AITask` -> Rejected by `incoming().creatorId == existing().creatorId && incoming().createdAt == existing().createdAt`.
10. **Terminal State Unlocking**: Updating an `AITask` whose existing `status == 'REJECTED'` without admin privileges -> Rejected by terminal state guard.
11. **Denial of Wallet Oversized Payload**: Sending a 50,000-character string in `ChatMessage.content` -> Rejected by `data.content.size() <= 2000`.
12. **Identity Spoofing on Presence**: User `u2` attempting to create or update `/workspaces/acme/presence/u1` with `uid: "u1"` -> Rejected by `incoming().uid == request.auth.uid && playerId == request.auth.uid`.
