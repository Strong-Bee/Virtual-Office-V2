'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/src/store/useAppStore';
import { recordAIActivityLog } from '@/src/lib/firestore-actions';
import { soundFX } from '@/src/lib/sound';
import {
  Bot,
  Users,
  Sparkles,
  ArrowRightLeft,
  Loader2,
  FileText,
} from 'lucide-react';

export function AIStandupAndCollaborationView() {
  const departments = useAppStore((s) => s.departments);
  const aiEmployees = useAppStore((s) => s.aiEmployees);
  const selectedDepartmentId = useAppStore((s) => s.selectedDepartmentId);
  const setSelectedDepartmentId = useAppStore((s) => s.setSelectedDepartmentId);

  const [standupReports, setStandupReports] = useState<Record<string, string>>(
    {}
  );
  const [loadingAiId, setLoadingAiId] = useState<string | null>(null);
  const [collabLoading, setCollabLoading] = useState(false);
  const [collabTranscript, setCollabTranscript] = useState<string | null>(null);

  const currentDept =
    departments.find((d) => d.id === selectedDepartmentId) || departments[0];
  const deptAIs = aiEmployees.filter(
    (a) => a.departmentId === currentDept?.id
  );

  const generateStandupForAI = async (aiId: string) => {
    const ai = aiEmployees.find((a) => a.id === aiId);
    if (!ai || loadingAiId) return;
    setLoadingAiId(ai.id);
    soundFX.playClick();

    try {
      const prompt = `Generate your concise DAILY AI REPORT for your Human Supervisor (${currentDept?.supervisorName}).
Format strictly with:
1. Yesterday's Completed Deliverables
2. Today's Active Execution Focus
3. Pending Approval / Blockers
4. Current Budget & KPI Status ($${ai.spentToday}/$${ai.dailyBudget} daily budget, ${ai.performanceScore}% KPI score)`;

      const res = await fetch(`/api/ai/employees/${ai.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: ai.modelProvider,
          modelName: ai.modelName,
          systemPrompt: ai.systemPrompt,
          userPrompt: prompt,
          temperature: 0.5,
        }),
      });
      const data = await res.json();
      setStandupReports((prev) => ({
        ...prev,
        [ai.id]: data.text || 'Standup report ready.',
      }));

      await recordAIActivityLog({
        departmentId: ai.departmentId,
        aiEmployeeId: ai.id,
        aiEmployeeName: ai.name,
        action: `Generated Daily Standup Report (${data.providerUsed})`,
        details: `Delivered daily status update to supervisor ${currentDept?.supervisorName}.`,
        status: 'SUCCESS',
        riskLevel: 'LOW',
        costIncurred: data.estimatedCostUsd || 0.005,
      });
      soundFX.playNotification();
    } catch {
      setStandupReports((prev) => ({
        ...prev,
        [ai.id]: 'Unable to generate report at this moment.',
      }));
    } finally {
      setLoadingAiId(null);
    }
  };

  const triggerAIToAICollaboration = async () => {
    if (collabLoading) return;
    setCollabLoading(true);
    soundFX.playClick();

    try {
      const sarah =
        aiEmployees.find((a) => a.id === 'ai_sarah') || aiEmployees[0];
      const maya =
        aiEmployees.find((a) => a.id === 'ai_maya') || aiEmployees[1];
      const fin = aiEmployees.find((a) => a.id === 'ai_fin') || aiEmployees[2];

      const prompt = `Simulate an authorized cross-department AI-to-AI workflow between:
1. ${sarah?.name} (Marketing Strategist)
2. ${maya?.name} (Market & Revenue Intelligence)
3. ${fin?.name} (FP&A & Cost Governance)

Topic: Joint Q4 Enterprise Expansion Campaign & ROI Budget Verification.
Provide each agent's structured contribution and end with a joint recommendation queued for Human Supervisor Approval.`;

      const res = await fetch(`/api/ai/employees/${sarah?.id || 'ai_sarah'}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: sarah?.modelProvider || 'NVIDIA',
          modelName: sarah?.modelName || 'meta/llama-3.1-70b-instruct',
          systemPrompt:
            'You orchestrate multi-agent collaboration under strict permission boundaries.',
          userPrompt: prompt,
          temperature: 0.6,
        }),
      });
      const data = await res.json();
      setCollabTranscript(data.text);

      if (sarah) {
        await recordAIActivityLog({
          departmentId: sarah.departmentId,
          aiEmployeeId: sarah.id,
          aiEmployeeName: sarah.name,
          action:
            'Executed Permitted AI-to-AI Collaboration (Marketing ↔ Research ↔ Finance)',
          details:
            'Synthesized Q4 cross-department campaign ROI proposal for Human Supervisor review.',
          status: 'PENDING_APPROVAL',
          riskLevel: 'MEDIUM',
          costIncurred: data.estimatedCostUsd || 0.015,
        });
      }
      soundFX.playNotification();
    } catch {
      setCollabTranscript('Collaboration session interrupted.');
    } finally {
      setCollabLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="text-xs text-slate-400">
            Daily Standup & Permitted Multi-Agent Collaboration
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {currentDept?.name} Daily Standup & AI Collaboration
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            <span className="inline-flex items-center gap-1">
              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
              Chaired by Human Supervisor {currentDept?.supervisorName}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {departments.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDepartmentId(d.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                d.id === currentDept?.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

      {/* Daily Standup Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {deptAIs.map((ai) => (
          <div
            key={ai.id}
            className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {ai.name} — {ai.role}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono">
                    {ai.modelProvider} · {ai.modelName} · KPI{' '}
                    {ai.performanceScore}%
                  </div>
                </div>
                <button
                  onClick={() => generateStandupForAI(ai.id)}
                  disabled={loadingAiId === ai.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                >
                  {loadingAiId === ai.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5" />
                      Generate Daily Report
                    </>
                  )}
                </button>
              </div>

              {standupReports[ai.id] ? (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">
                  {standupReports[ai.id]}
                </div>
              ) : (
                <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs text-slate-400 space-y-1.5">
                  <div>
                    <strong className="text-slate-200">Completed:</strong>{' '}
                    {ai.tasksCompleted} tasks verified
                  </div>
                  <div>
                    <strong className="text-slate-200">In Progress:</strong>{' '}
                    {ai.tasksPending} active department deliverables
                  </div>
                  <div>
                    <strong className="text-slate-200">Budget Burn:</strong> $
                    {ai.spentToday.toFixed(2)} / ${ai.dailyBudget} today
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* AI-to-AI Permitted Collaboration Pipeline */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono">
              <ArrowRightLeft className="w-4 h-4" />
              <span>
                Permitted Multi-Agent Pipeline: Marketing AI → Research AI →
                Finance AI
              </span>
            </div>
            <h2 className="text-lg font-semibold text-white mt-1">
              Cross-Department AI-to-AI Collaboration Session
            </h2>
            <p className="text-xs text-slate-400">
              Agents exchange structured context along their allowed
              communication list and submit unified proposals for Human
              Supervisor approval.
            </p>
          </div>

          <button
            onClick={triggerAIToAICollaboration}
            disabled={collabLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
          >
            {collabLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Orchestrating Multi-Agent Handoff...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Run Marketing ↔ Research ↔ Finance Collaboration
              </>
            )}
          </button>
        </div>

        {collabTranscript && (
          <div className="p-4 bg-slate-950 border border-cyan-500/30 rounded-lg text-xs text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">
            {collabTranscript}
          </div>
        )}
      </div>
    </div>
  );
}
