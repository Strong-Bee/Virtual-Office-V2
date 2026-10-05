'use client';

import React from 'react';
import { useAppStore } from '@/src/store/useAppStore';
import {
  Building2,
  ArrowRight,
  Users,
  Bot,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export function WorkspaceDashboardOverview() {
  const workspace = useAppStore((s) => s.workspace);
  const departments = useAppStore((s) => s.departments);
  const aiEmployees = useAppStore((s) => s.aiEmployees);
  const aiTasks = useAppStore((s) => s.aiTasks);
  const activityLogs = useAppStore((s) => s.activityLogs);
  const players = useAppStore((s) => s.players);
  const currentUser = useAppStore((s) => s.currentUser);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setSelectedDepartmentId = useAppStore((s) => s.setSelectedDepartmentId);

  const pendingApprovals = aiTasks.filter((t) => t.status === 'REVIEW');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Hero Workspace Banner */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
            <span>{workspace.name}</span>
            <span>·</span>
            <span>Role: {currentUser?.role || 'DEPARTMENT_SUPERVISOR'}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight text-balance">
            Welcome back, {currentUser?.displayName || 'Supervisor'}. Your 2D
            Virtual HQ & AI Workforce are live.
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Walk through the spatial office, collaborate via proximity voice and
            WebRTC boardrooms, and supervise your department&apos;s NVIDIA NIM &
            Gemini AI agents with full Human-in-the-Loop governance.
          </p>
        </div>

        <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl min-w-[260px] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Main HQ Floor 1
            </span>
            <span className="text-xs font-mono text-emerald-400 tabular-nums">
              {Math.max(1, Object.keys(players).length) + aiEmployees.length}{' '}
              online
            </span>
          </div>
          <div className="text-xs text-slate-400">
            {Math.max(1, Object.keys(players).length)} Human Supervisors ·{' '}
            {aiEmployees.length} AI Employees
          </div>
          <button
            onClick={() => setActiveTab('VIRTUAL_OFFICE')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            Enter 2D Virtual Office
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pending Human-in-the-Loop Alert if any */}
      {pendingApprovals.length > 0 && (
        <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white">
                {pendingApprovals.length} High-Risk AI Actions Require Human
                Supervisor Approval
              </div>
              <div className="text-xs text-amber-200/80">
                Latest: &ldquo;{pendingApprovals[0].title}&rdquo; by{' '}
                {pendingApprovals[0].aiEmployeeName}
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('APPROVAL_QUEUE')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap"
          >
            Review Approval Queue
          </button>
        </div>
      )}

      {/* 3-Layer Organizational Hierarchy: Company -> Departments -> Supervisors -> AI */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            Departments, Human Supervisors & Assigned AI Workforce
          </h2>
          <button
            onClick={() => setActiveTab('AI_CONTROL_CENTER')}
            className="text-xs text-emerald-400 hover:underline"
          >
            Open Full AI Control Center →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {departments.map((dept) => {
            const deptAIs = aiEmployees.filter(
              (a) => a.departmentId === dept.id
            );
            const deptSpend = deptAIs.reduce((acc, a) => acc + a.spentMonth, 0);

            return (
              <div
                key={dept.id}
                className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {dept.name}
                      </h3>
                      <div className="text-xs text-slate-400 mt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                          Supervisor: {dept.supervisorName}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-emerald-400">
                      ${deptSpend.toFixed(2)} / ${dept.monthlyBudget}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {dept.goals}
                  </p>

                  <div className="space-y-2 pt-1">
                    {deptAIs.map((ai) => (
                      <div
                        key={ai.id}
                        className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-100">
                            <span className="inline-flex items-center gap-1">
                              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                              {ai.name}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {ai.role} · {ai.modelProvider}
                          </div>
                        </div>
                        <div className="text-right font-mono tabular-nums">
                          <div className="text-emerald-400 text-[11px]">
                            {ai.status}
                          </div>
                          <div className="text-slate-500 text-[10px]">
                            KPI {ai.performanceScore}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedDepartmentId(dept.id);
                    setActiveTab('AI_CONTROL_CENTER');
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white rounded-lg transition-colors"
                >
                  Manage {dept.name} AI Team
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Audit Activity */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Recent AI Workforce & Supervisor Activity
          </h3>
          <button
            onClick={() => setActiveTab('AI_GOVERNANCE')}
            className="text-xs text-slate-400 hover:text-white"
          >
            View Full Audit Log →
          </button>
        </div>
        <div className="divide-y divide-slate-800/60">
          {activityLogs.slice(0, 5).map((log) => (
            <div
              key={log.id}
              className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {log.aiEmployeeName}
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-200">{log.action}</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums">
                <span className="text-amber-400">Risk: {log.riskLevel}</span>
                <span className="text-emerald-400">{log.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
