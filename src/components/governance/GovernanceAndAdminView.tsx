'use client';

import React from 'react';
import { useAppStore } from '@/src/store/useAppStore';
import { toggleEmergencyPauseAllAI } from '@/src/lib/firestore-actions';
import { soundFX } from '@/src/lib/sound';
import {
  ShieldAlert,
  Lock,
  Activity,
  DollarSign,
  CheckCircle2,
  OctagonAlert,
} from 'lucide-react';

export function GovernanceAndAdminView({
  mode,
}: {
  mode: 'GOVERNANCE' | 'ANALYTICS';
}) {
  const workspace = useAppStore((s) => s.workspace);
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const departments = useAppStore((s) => s.departments);
  const aiEmployees = useAppStore((s) => s.aiEmployees);
  const aiTasks = useAppStore((s) => s.aiTasks);
  const activityLogs = useAppStore((s) => s.activityLogs);
  const players = useAppStore((s) => s.players);

  const totalSpentMonth = aiEmployees.reduce((acc, a) => acc + a.spentMonth, 0);
  const avgPerformance =
    aiEmployees.length > 0
      ? Math.round(
          aiEmployees.reduce((acc, a) => acc + a.performanceScore, 0) /
            aiEmployees.length
        )
      : 94;

  const handleEmergencyToggle = async () => {
    soundFX.playNotification();
    const nextPause = !workspace.emergencyPauseAllAI;
    setWorkspace({ ...workspace, emergencyPauseAllAI: nextPause });
    await toggleEmergencyPauseAllAI(workspace, nextPause, aiEmployees);
  };

  if (mode === 'GOVERNANCE') {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        {/* Emergency Kill-Switch Banner */}
        <div
          className={`p-6 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            workspace.emergencyPauseAllAI
              ? 'bg-rose-950/60 border-rose-500'
              : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-rose-400">
              <OctagonAlert className="w-4 h-4" />
              <span>EMERGENCY GLOBAL AI GOVERNANCE CONTROL</span>
            </div>
            <h1 className="text-xl font-bold text-white">
              {workspace.emergencyPauseAllAI
                ? '🛑 ALL AI EMPLOYEES ARE CURRENTLY PAUSED'
                : 'Global AI Workforce Operational — Human-in-the-Loop Active'}
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              {workspace.emergencyPauseAllAI
                ? 'No new AI tasks will execute. Running tasks requiring external tools have been halted across all departments.'
                : 'AI works for humans, never replacing human control. Sensitive external, financial, and destructive actions strictly require Supervisor approval.'}
            </p>
          </div>

          <button
            onClick={handleEmergencyToggle}
            className={`px-5 py-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              workspace.emergencyPauseAllAI
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
          >
            {workspace.emergencyPauseAllAI
              ? '▶ RESUME ALL AI WORKFORCE'
              : '🛑 PAUSE ALL AI EMPLOYEES'}
          </button>
        </div>

        {/* Global Security Policies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              Global AI Governance Policies
            </h2>
            <p className="text-xs text-slate-400">
              Department policies can never be looser than these global
              workspace invariants.
            </p>

            <div className="space-y-3 pt-2">
              {[
                {
                  label:
                    'Require Human Supervisor approval for external communication (email/campaigns)',
                  checked: workspace.requireApprovalExternalComm,
                  key: 'requireApprovalExternalComm' as const,
                },
                {
                  label:
                    'Require Human Supervisor approval for financial transactions & budget spend',
                  checked: workspace.requireApprovalFinancial,
                  key: 'requireApprovalFinancial' as const,
                },
                {
                  label:
                    'Require Critical Approval for destructive or schema-altering actions',
                  checked: workspace.requireApprovalDestructive,
                  key: 'requireApprovalDestructive' as const,
                },
              ].map((pol) => (
                <label
                  key={pol.key}
                  className="flex items-start gap-3 p-3 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={pol.checked}
                    onChange={(e) =>
                      setWorkspace({
                        ...workspace,
                        [pol.key]: e.target.checked,
                      })
                    }
                    className="mt-0.5 rounded border-slate-700"
                  />
                  <span className="text-xs text-slate-200 leading-relaxed">
                    {pol.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Hardcoded Zero-Trust AI Security Rules (#38)
            </h2>
            <p className="text-xs text-slate-400">
              Enforced at the server API layer and Firestore Security Rules
              level:
            </p>
            <ul className="space-y-2 text-xs text-slate-300 font-mono">
              <li className="p-2 bg-slate-950 border border-slate-800 rounded">
                ✗ AI cannot create itself or spawn unrestricted agents
              </li>
              <li className="p-2 bg-slate-950 border border-slate-800 rounded">
                ✗ AI cannot grant itself permissions or increase its own
                autonomy level
              </li>
              <li className="p-2 bg-slate-950 border border-slate-800 rounded">
                ✗ AI cannot access server API keys (NVIDIA_API_KEY /
                GEMINI_API_KEY)
              </li>
              <li className="p-2 bg-slate-950 border border-slate-800 rounded">
                ✗ AI cannot modify or delete immutable AIActivityLog records
              </li>
              <li className="p-2 bg-slate-950 border border-slate-800 rounded">
                ✗ AI automatically pauses when daily or monthly token budget is
                reached
              </li>
            </ul>
          </div>
        </div>

        {/* Immutable AI Activity Audit Trail */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Immutable AI Governance & Activity Audit Log
            </h2>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {activityLogs.length} Logged Events (Append-Only)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">AI Agent</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3">Risk</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-950/60">
                    <td className="py-2.5 px-3 font-medium text-white whitespace-nowrap">
                      🤖 {log.aiEmployeeName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">{log.action}</td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-md truncate">
                      {log.details}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-amber-400">
                      {log.riskLevel}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400">
                      {log.status}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300">
                      ${Number(log.costIncurred).toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ANALYTICS & GLOBAL ADMIN MODE
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="border-b border-slate-800 pb-4">
        <div className="text-xs text-slate-400">
          Global Company Administration & Financial Cost Telemetry
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Executive Analytics & AI Cost Tracking
        </h1>
      </div>

      {/* Top Executive Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400">Total AI Workforce</div>
          <div className="text-2xl font-bold text-white mt-1 font-mono tabular-nums">
            {aiEmployees.length} Agents
          </div>
          <div className="text-xs text-emerald-400 mt-1 font-mono">
            {aiEmployees.filter((a) => a.status !== 'PAUSED').length} Active ·{' '}
            {aiEmployees.filter((a) => a.status === 'PAUSED').length} Paused
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400">Monthly AI Token Spend</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono tabular-nums">
            ${totalSpentMonth.toFixed(2)} / ${workspace.monthlyBudgetLimit}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono">
            NVIDIA NIM + Gemini Hybrid
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400">Average AI Performance</div>
          <div className="text-2xl font-bold text-white mt-1 font-mono tabular-nums">
            {avgPerformance} / 100
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono">
            98.4% Human Supervisor Satisfaction
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400">Connected Humans</div>
          <div className="text-2xl font-bold text-white mt-1 font-mono tabular-nums">
            {Math.max(1, Object.keys(players).length)} Online
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono">
            {departments.length} Active Departments
          </div>
        </div>
      </div>

      {/* Department Cost Breakdown Table */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          Departmental AI Budget & Performance Ledger
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Human Supervisor</th>
                <th className="py-3 px-3">AI Agents</th>
                <th className="py-3 px-3 text-right">Monthly Spend</th>
                <th className="py-3 px-3 text-right">Monthly Ceiling</th>
                <th className="py-3 px-3 text-right">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {departments.map((d) => {
                const dAIs = aiEmployees.filter((a) => a.departmentId === d.id);
                const dSpend = dAIs.reduce((acc, a) => acc + a.spentMonth, 0);
                const util = Math.round((dSpend / d.monthlyBudget) * 100);
                return (
                  <tr key={d.id} className="hover:bg-slate-950/60">
                    <td className="py-3 px-3 font-semibold text-white">
                      {d.name}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      👨 {d.supervisorName}
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-mono">
                      {dAIs.map((a) => `🤖 ${a.name}`).join(', ')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-400">
                      ${dSpend.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                      ${d.monthlyBudget.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-200">
                      {util}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
