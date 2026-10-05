'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/src/store/useAppStore';
import {
  createNewAITask,
  updateAITaskStatusAndOutput,
  updateAIEmployeeState,
  recordAIActivityLog,
} from '@/src/lib/firestore-actions';
import { soundFX } from '@/src/lib/sound';
import { AITask, RiskLevel } from '@/src/types';
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Loader2,
  Sparkles,
} from 'lucide-react';

export function AITaskBoardAndApprovals({
  filterReviewOnly = false,
}: {
  filterReviewOnly?: boolean;
}) {
  const aiTasks = useAppStore((s) => s.aiTasks);
  const aiEmployees = useAppStore((s) => s.aiEmployees);
  const knowledgeDocs = useAppStore((s) => s.knowledgeDocs);
  const workspace = useAppStore((s) => s.workspace);

  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedTaskForModal, setSelectedTaskForModal] =
    useState<AITask | null>(null);
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAiId, setTaskAiId] = useState(aiEmployees[0]?.id || 'ai_sarah');
  const [taskPriority, setTaskPriority] = useState<RiskLevel>('HIGH');
  const [taskDeadline, setTaskDeadline] = useState('Friday 17:00');
  const [taskRequiresApproval, setTaskRequiresApproval] = useState(true);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAI =
      aiEmployees.find((a) => a.id === taskAiId) || aiEmployees[0];
    if (!targetAI || !taskTitle.trim()) return;

    await createNewAITask({
      departmentId: targetAI.departmentId,
      aiEmployee: targetAI,
      title: taskTitle.trim(),
      description: taskDesc.trim() || taskTitle.trim(),
      priority: taskPriority,
      deadline: taskDeadline.trim(),
      requiresApproval: taskRequiresApproval,
      estimatedCost: taskPriority === 'CRITICAL' ? 35 : taskPriority === 'HIGH' ? 18 : 4.5,
    });

    setTaskTitle('');
    setTaskDesc('');
    setShowNewTaskModal(false);
    soundFX.playNotification();
  };

  const handleRunAIOnTask = async (task: AITask) => {
    const targetAI = aiEmployees.find((a) => a.id === task.aiEmployeeId);
    if (!targetAI || executingTaskId) return;
    if (workspace.emergencyPauseAllAI || targetAI.status === 'PAUSED') return;

    setExecutingTaskId(task.id);
    soundFX.playClick();

    try {
      await updateAITaskStatusAndOutput({
        task,
        status: 'WORKING',
      });
      await updateAIEmployeeState(targetAI, { status: 'PROCESSING' });

      const deptDocs = knowledgeDocs
        .filter((d) => d.departmentId === task.departmentId)
        .map((d) => `${d.title}: ${d.content}`)
        .join('\n\n');

      const res = await fetch('/api/ai/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          title: task.title,
          description: task.description,
          aiEmployeeName: targetAI.name,
          aiRole: targetAI.role,
          provider: targetAI.modelProvider,
          modelName: targetAI.modelName,
          systemPrompt: targetAI.systemPrompt,
          restrictions: targetAI.restrictions,
          knowledgeContext: deptDocs,
          autonomyLevel: targetAI.autonomyLevel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute AI task');
      }

      const nextStatus: AITask['status'] =
        task.requiresApproval || data.requiresApproval ? 'REVIEW' : 'COMPLETED';

      await updateAITaskStatusAndOutput({
        task,
        status: nextStatus,
        outputReport: data.outputReport,
        requiresApproval: task.requiresApproval || data.requiresApproval,
      });

      await updateAIEmployeeState(targetAI, {
        status: nextStatus === 'REVIEW' ? 'WAITING_APPROVAL' : 'WORKING',
        spentToday: targetAI.spentToday + (data.estimatedCostUsd || 0.02),
        spentMonth: targetAI.spentMonth + (data.estimatedCostUsd || 0.02),
        tasksCompleted:
          nextStatus === 'COMPLETED'
            ? targetAI.tasksCompleted + 1
            : targetAI.tasksCompleted,
      });

      await recordAIActivityLog({
        departmentId: task.departmentId,
        aiEmployeeId: targetAI.id,
        aiEmployeeName: targetAI.name,
        action:
          nextStatus === 'REVIEW'
            ? `Task Executed & Queued for Approval: ${task.title.slice(0, 60)}`
            : `Task Completed Autonomously: ${task.title.slice(0, 60)}`,
        details: `Provider: ${data.providerUsed} (${data.modelUsed})`,
        status: nextStatus === 'REVIEW' ? 'PENDING_APPROVAL' : 'SUCCESS',
        riskLevel: task.riskLevel,
        costIncurred: data.estimatedCostUsd || 0.02,
      });

      soundFX.playNotification();
    } catch (err) {
      await updateAITaskStatusAndOutput({
        task,
        status: 'TODO',
        outputReport:
          err instanceof Error ? `Execution Error: ${err.message}` : 'Error',
      });
    } finally {
      setExecutingTaskId(null);
    }
  };

  const handleSupervisorDecision = async (
    task: AITask,
    decision: 'APPROVED' | 'REJECTED'
  ) => {
    soundFX.playClick();
    const targetAI = aiEmployees.find((a) => a.id === task.aiEmployeeId);

    await updateAITaskStatusAndOutput({
      task,
      status: decision === 'APPROVED' ? 'COMPLETED' : 'REJECTED',
    });

    if (targetAI) {
      await updateAIEmployeeState(targetAI, {
        status: 'WORKING',
        tasksCompleted:
          decision === 'APPROVED'
            ? targetAI.tasksCompleted + 1
            : targetAI.tasksCompleted,
      });
    }

    await recordAIActivityLog({
      departmentId: task.departmentId,
      aiEmployeeId: task.aiEmployeeId,
      aiEmployeeName: task.aiEmployeeName,
      action: `Human Supervisor ${decision}: ${task.title.slice(0, 70)}`,
      details: `Risk Level: ${task.riskLevel}. Estimated Cost: $${task.estimatedCost.toFixed(2)}.`,
      status: decision,
      riskLevel: task.riskLevel,
      costIncurred: decision === 'APPROVED' ? task.estimatedCost : 0,
    });

    soundFX.playNotification();
  };

  if (filterReviewOnly) {
    const reviewTasks = aiTasks.filter((t) => t.status === 'REVIEW');
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <div className="text-xs text-amber-400 font-medium mb-1">
            Human-in-the-Loop Governance Gate
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Supervisor Approval Queue ({reviewTasks.length} Pending)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            High-risk actions (external communications, campaign blasts,
            budget commitments, permission changes) are halted until reviewed
            by a Department Supervisor.
          </p>
        </div>

        {reviewTasks.length === 0 ? (
          <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="text-sm font-semibold text-white">
              All High-Risk AI Actions Reviewed
            </div>
            <p className="text-xs text-slate-400">
              No pending approval requests in the queue.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviewTasks.map((task) => (
              <div
                key={task.id}
                className="p-5 bg-slate-900 border border-amber-500/40 rounded-xl space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-amber-300 font-mono">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>
                        🤖 {task.aiEmployeeName} requests approval · Risk:{' '}
                        {task.riskLevel} · Est. Cost: $
                        {task.estimatedCost.toFixed(2)}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-white mt-1">
                      {task.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSupervisorDecision(task, 'REJECTED')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700/50 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Action
                    </button>
                    <button
                      onClick={() => handleSupervisorDecision(task, 'APPROVED')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve & Execute
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300">{task.description}</p>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                  {task.outputReport}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const columns: { key: AITask['status']; label: string }[] = [
    { key: 'TODO', label: 'TODO' },
    { key: 'WORKING', label: 'WORKING (AI ACTIVE)' },
    { key: 'REVIEW', label: 'HUMAN REVIEW' },
    { key: 'COMPLETED', label: 'COMPLETED' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="text-xs text-slate-400">
            Kanban Workflow & Autonomous Execution
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            AI Workforce Task Board
          </h1>
        </div>
        <button
          onClick={() => setShowNewTaskModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Assign New AI Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colTasks = aiTasks.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col space-y-3 min-h-[480px]"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-semibold text-slate-300">
                <span>{col.label}</span>
                <span className="font-mono tabular-nums text-slate-400">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-3 flex-1">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2.5 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>🤖 {task.aiEmployeeName}</span>
                        <span>Risk: {task.riskLevel}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-white leading-snug">
                        {task.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {task.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-900 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                        <span>Est: ${task.estimatedCost.toFixed(2)}</span>
                        <span>Due: {task.deadline}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {task.status === 'TODO' && (
                          <button
                            onClick={() => handleRunAIOnTask(task)}
                            disabled={executingTaskId === task.id}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            {executingTaskId === task.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                AI Executing...
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                Execute via AI
                              </>
                            )}
                          </button>
                        )}

                        {task.status === 'WORKING' && (
                          <button
                            onClick={() => handleRunAIOnTask(task)}
                            disabled={executingTaskId === task.id}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Generate Deliverable
                          </button>
                        )}

                        {task.status === 'REVIEW' && (
                          <>
                            <button
                              onClick={() =>
                                handleSupervisorDecision(task, 'REJECTED')
                              }
                              className="flex-1 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-700/40 rounded text-xs font-medium transition-colors"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() =>
                                handleSupervisorDecision(task, 'APPROVED')
                              }
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors"
                            >
                              Approve
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setSelectedTaskForModal(task)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                        >
                          Report
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deliverable Report Viewer Modal */}
      {selectedTaskForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs text-emerald-400 font-mono">
                  🤖 {selectedTaskForModal.aiEmployeeName} · Status:{' '}
                  {selectedTaskForModal.status}
                </div>
                <h3 className="text-base font-semibold text-white mt-0.5">
                  {selectedTaskForModal.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTaskForModal(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
              {selectedTaskForModal.outputReport}
            </div>
          </div>
        </div>
      )}

      {/* Assign New Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateTask}
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-semibold text-white">
              Assign Task to AI Employee
            </h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Select AI Employee
              </label>
              <select
                value={taskAiId}
                onChange={(e) => setTaskAiId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                {aiEmployees.map((ai) => (
                  <option key={ai.id} value={ai.id}>
                    🤖 {ai.name} — {ai.role} ({ai.modelProvider})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Task Title
              </label>
              <input
                type="text"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g., Create Competitor Analysis for Q4 Enterprise Segment"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Detailed Instructions & Expected Deliverable
              </label>
              <textarea
                rows={3}
                required
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                placeholder="Specify scope, target metrics, and expected report format..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Priority / Risk Level
                </label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as RiskLevel)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Deadline
                </label>
                <input
                  type="text"
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={taskRequiresApproval}
                onChange={(e) => setTaskRequiresApproval(e.target.checked)}
                className="rounded border-slate-700"
              />
              Require Human Supervisor Approval before final completion
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewTaskModal(false)}
                className="px-4 py-2 bg-slate-800 text-xs text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white rounded-lg"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
