'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/src/store/useAppStore';
import {
  createNewAIEmployeeInFirestore,
  updateAIEmployeeState,
  toggleDepartmentPauseAI,
  addKnowledgeDocumentToFirestore,
} from '@/src/lib/firestore-actions';
import { AIModelProvider, AutonomyLevel } from '@/src/types';
import {
  Bot,
  PauseCircle,
  PlayCircle,
  Plus,
  BookOpen,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

export function AIWorkforceControlCenter() {
  const departments = useAppStore((s) => s.departments);
  const aiEmployees = useAppStore((s) => s.aiEmployees);
  const aiTasks = useAppStore((s) => s.aiTasks);
  const knowledgeDocs = useAppStore((s) => s.knowledgeDocs);
  const kpis = useAppStore((s) => s.kpis);
  const selectedDepartmentId = useAppStore((s) => s.selectedDepartmentId);
  const setSelectedDepartmentId = useAppStore((s) => s.setSelectedDepartmentId);
  const setSelectedAIEmployeeId = useAppStore((s) => s.setSelectedAIEmployeeId);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);

  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newProvider, setNewProvider] =
    useState<AIModelProvider>('NINEROUTER');
  const [newModel, setNewModel] = useState('openrouter/auto');
  const [newAutonomy, setNewAutonomy] = useState<AutonomyLevel>(2);
  const [newDailyBudget, setNewDailyBudget] = useState(15);
  const [newMonthlyBudget, setNewMonthlyBudget] = useState(60);
  const [newSystemPrompt, setNewSystemPrompt] = useState(
    'You are a specialized enterprise AI agent reporting to your Human Department Supervisor.'
  );
  const [newRestrictions, setNewRestrictions] = useState(
    'Cannot execute external communications or spend budget without human approval.'
  );

  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('Department SOP');
  const [docContent, setDocContent] = useState('');

  const currentDept =
    departments.find((d) => d.id === selectedDepartmentId) || departments[0];
  const deptAIs = aiEmployees.filter(
    (a) => a.departmentId === currentDept?.id
  );
  const deptTasks = aiTasks.filter((t) => t.departmentId === currentDept?.id);
  const deptDocs = knowledgeDocs.filter(
    (d) => d.departmentId === currentDept?.id
  );
  const deptKpis = kpis.filter((k) => k.departmentId === currentDept?.id);

  const handleCreateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newRole.trim() || !currentDept) return;

    const roomMap: Record<string, { roomId: string; x: number; y: number }> = {
      dept_marketing: { roomId: 'room_marketing', x: 6 * 32, y: 15 * 32 },
      dept_engineering: { roomId: 'room_engineering', x: 18 * 32, y: 15 * 32 },
      dept_finance: { roomId: 'room_finance', x: 30 * 32, y: 15 * 32 },
    };
    const spawn = roomMap[currentDept.id] || {
      roomId: 'room_lobby',
      x: 8 * 32,
      y: 6 * 32,
    };

    await createNewAIEmployeeInFirestore({
      departmentId: currentDept.id,
      supervisorId: currentDept.supervisorId,
      name: newName.trim(),
      role: newRole.trim(),
      avatarColor: '#10b981',
      personality: 'Analytical, collaborative, compliant with human governance.',
      systemPrompt: newSystemPrompt.trim(),
      restrictions: newRestrictions.trim(),
      modelProvider: newProvider,
      modelName: newModel.trim(),
      autonomyLevel: newAutonomy,
      dailyBudget: Number(newDailyBudget),
      monthlyBudget: Number(newMonthlyBudget),
      roomId: spawn.roomId,
      x: spawn.x,
      y: spawn.y,
    });

    setNewName('');
    setNewRole('');
    setShowCreateModal(false);
  };

  const handleCreateKnowledgeDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim() || !currentDept) return;

    await addKnowledgeDocumentToFirestore({
      departmentId: currentDept.id,
      title: docTitle.trim(),
      category: docCategory.trim(),
      content: docContent.trim(),
    });

    setDocTitle('');
    setDocContent('');
    setShowKnowledgeModal(false);
  };

  if (!currentDept) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>AI Workforce Control Center</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
              Human Supervisor: {currentDept.supervisorName}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {currentDept.name} Department — AI Workforce
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            {currentDept.goals}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            {departments.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDepartmentId(d.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  d.id === currentDept.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>

          <button
            onClick={() =>
              toggleDepartmentPauseAI(currentDept, !currentDept.paused, deptAIs)
            }
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              currentDept.paused
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700/50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            {currentDept.paused
              ? 'Resume Department AI'
              : 'Pause Department AI'}
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Add AI Employee
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="text-xs text-slate-400">AI Employees</div>
          <div className="text-xl font-bold text-white mt-1 font-mono tabular-nums">
            {deptAIs.filter((a) => a.status !== 'PAUSED').length} /{' '}
            {deptAIs.length} Active
          </div>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="text-xs text-slate-400">Department Tasks</div>
          <div className="text-xl font-bold text-white mt-1 font-mono tabular-nums">
            {deptTasks.filter((t) => t.status === 'COMPLETED').length} /{' '}
            {deptTasks.length} Done
          </div>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="text-xs text-slate-400">Waiting Approval</div>
          <div className="text-xl font-bold text-amber-400 mt-1 font-mono tabular-nums">
            {deptTasks.filter((t) => t.status === 'REVIEW').length} Tasks
          </div>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="text-xs text-slate-400">Monthly AI Spend</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono tabular-nums">
            ${deptAIs.reduce((acc, a) => acc + a.spentMonth, 0).toFixed(2)} / $
            {currentDept.monthlyBudget}
          </div>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="text-xs text-slate-400">Avg Performance</div>
          <div className="text-xl font-bold text-white mt-1 font-mono tabular-nums">
            {deptAIs.length > 0
              ? Math.round(
                  deptAIs.reduce((acc, a) => acc + a.performanceScore, 0) /
                    deptAIs.length
                )
              : 94}
            %
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-base font-semibold text-white">
          Assigned AI Employees (Supervised by {currentDept.supervisorName})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deptAIs.map((ai) => (
            <div
              key={ai.id}
              className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      <span className="inline-flex items-center gap-1">
                        <Bot className="h-4 w-4" aria-hidden="true" />
                        {ai.name} — {ai.role}
                      </span>
                    </h3>
                    <div className="text-xs text-slate-400 mt-0.5 font-mono">
                      Provider: {ai.modelProvider} · Model: {ai.modelName} ·
                      Status: {ai.status}
                    </div>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-emerald-400">
                    KPI {ai.performanceScore}%
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {ai.systemPrompt}
                </p>

                <div className="text-xs text-amber-300/90 bg-amber-950/30 border border-amber-800/40 rounded-lg p-2.5">
                  <strong className="font-medium">
                    Governance Restrictions:
                  </strong>{' '}
                  {ai.restrictions}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
                  <span>
                    Tasks: {ai.tasksCompleted} completed · {ai.tasksPending}{' '}
                    pending
                  </span>
                  <span>
                    Daily Budget: ${ai.spentToday.toFixed(2)} / $
                    {ai.dailyBudget}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">Autonomy:</label>
                    <select
                      value={ai.autonomyLevel}
                      onChange={(e) =>
                        updateAIEmployeeState(ai, {
                          autonomyLevel: Number(
                            e.target.value
                          ) as AutonomyLevel,
                        })
                      }
                      className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    >
                      <option value={0}>L0 — Assistant Only</option>
                      <option value={1}>L1 — Suggest Only</option>
                      <option value={2}>L2 — Execute w/ Approval</option>
                      <option value={3}>L3 — Limited Autonomous</option>
                      <option value={4}>L4 — Highly Autonomous</option>
                    </select>

                    <select
                      value={ai.modelProvider}
                      onChange={(e) => {
                        const prov = e.target.value as AIModelProvider;
                        const defaultModel =
                          prov === 'NVIDIA'
                            ? 'meta/llama-3.1-70b-instruct'
                            : prov === 'GEMINI'
                              ? 'gemini-3.8-flash'
                              : prov === 'OPENROUTER'
                                ? 'openrouter/auto'
                                : prov === 'ANTHROPIC'
                                  ? 'claude-3-7-sonnet-latest'
                                  : prov === 'OPENCLAW'
                                    ? 'openclaw'
                                    : prov === 'NINEROUTER'
                                      ? 'openrouter/auto'
                                    : prov === 'OPENAI'
                                      ? 'gpt-4o'
                                      : ai.modelName;
                        updateAIEmployeeState(ai, {
                          modelProvider: prov,
                          modelName: defaultModel,
                        });
                      }}
                      className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-emerald-400 font-mono"
                    >
                      <option value="NVIDIA">NVIDIA NIM</option>
                      <option value="GEMINI">Google Gemini</option>
                      <option value="OPENAI">OpenAI</option>
                      <option value="ANTHROPIC">Anthropic</option>
                      <option value="OPENROUTER">OpenRouter</option>
                      <option value="OPENCLAW">OpenClaw</option>
                      <option value="NINEROUTER">9Router Proxy</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedAIEmployeeId(ai.id);
                        setActiveTab('TASK_BOARD');
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white rounded-lg transition-colors whitespace-nowrap"
                    >
                      Give Task
                    </button>
                    <button
                      onClick={() =>
                        updateAIEmployeeState(ai, {
                          status:
                            ai.status === 'PAUSED' ? 'WORKING' : 'PAUSED',
                        })
                      }
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-400 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {ai.status === 'PAUSED' ? (
                        <>
                          <PlayCircle className="w-3.5 h-3.5" /> Resume
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-3.5 h-3.5" /> Pause
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Department & AI KPIs
          </h3>
          <div className="space-y-3">
            {deptKpis.map((k) => {
              const pct = Math.min(
                100,
                Math.round((k.currentValue / k.targetValue) * 100)
              );
              return (
                <div
                  key={k.id}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">
                      {k.title}
                    </span>
                    <span className="font-mono tabular-nums text-emerald-400">
                      {k.currentValue} / {k.targetValue} {k.unit} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              Authorized Department Knowledge Base (RAG Context)
            </h3>
            <button
              onClick={() => setShowKnowledgeModal(true)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white rounded-md whitespace-nowrap"
            >
              + Add Document
            </button>
          </div>
          <div className="space-y-2.5">
            {deptDocs.map((docItem) => (
              <div
                key={docItem.id}
                className="p-3 bg-slate-950 border border-slate-800 rounded-lg"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    📄 {docItem.title}
                  </span>
                  <span className="text-slate-400">{docItem.category}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {docItem.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateAI}
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-400" />
                Provision AI Employee for {currentDept.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  AI Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Orion"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Role / Specialization
                </label>
                <input
                  type="text"
                  required
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g., SEO & Growth Analyst"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Model Provider
                </label>
                <select
                  value={newProvider}
                  onChange={(e) => {
                    const p = e.target.value as AIModelProvider;
                    setNewProvider(p);
                    if (p === 'NVIDIA')
                      setNewModel('meta/llama-3.1-70b-instruct');
                    if (p === 'GEMINI') setNewModel('gemini-3.8-flash');
                    if (p === 'OPENAI') setNewModel('gpt-4o');
                    if (p === 'ANTHROPIC')
                      setNewModel('claude-3-7-sonnet-latest');
                    if (p === 'OPENROUTER')
                      setNewModel('openrouter/auto');
                    if (p === 'OPENCLAW') setNewModel('openclaw');
                    if (p === 'NINEROUTER')
                      setNewModel('openrouter/auto');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="NVIDIA">NVIDIA NIM API</option>
                  <option value="GEMINI">Google Gemini</option>
                  <option value="OPENAI">OpenAI</option>
                  <option value="ANTHROPIC">Anthropic</option>
                  <option value="OPENROUTER">OpenRouter</option>
                  <option value="OPENCLAW">OpenClaw</option>
                  <option value="NINEROUTER">9Router Proxy</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Model Identifier
                </label>
                <input
                  type="text"
                  required
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Autonomy Level
                </label>
                <select
                  value={newAutonomy}
                  onChange={(e) =>
                    setNewAutonomy(Number(e.target.value) as AutonomyLevel)
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value={0}>Level 0 (Assist)</option>
                  <option value={1}>Level 1 (Suggest)</option>
                  <option value={2}>Level 2 (Approval)</option>
                  <option value={3}>Level 3 (Limited Auto)</option>
                  <option value={4}>Level 4 (High Auto)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Daily Budget ($)
                </label>
                <input
                  type="number"
                  min={1}
                  value={newDailyBudget}
                  onChange={(e) => setNewDailyBudget(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Monthly Budget ($)
                </label>
                <input
                  type="number"
                  min={5}
                  value={newMonthlyBudget}
                  onChange={(e) => setNewMonthlyBudget(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                System Instructions
              </label>
              <textarea
                rows={3}
                value={newSystemPrompt}
                onChange={(e) => setNewSystemPrompt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Hard Governance Restrictions
              </label>
              <input
                type="text"
                value={newRestrictions}
                onChange={(e) => setNewRestrictions(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-800 text-xs text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white rounded-lg"
              >
                Deploy AI Employee to Office
              </button>
            </div>
          </form>
        </div>
      )}

      {showKnowledgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateKnowledgeDoc}
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-semibold text-white">
              Add Department Knowledge Document ({currentDept.name})
            </h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Document Title
              </label>
              <input
                type="text"
                required
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g., Q4 Enterprise Pricing & Discount Policy.pdf"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Category
              </label>
              <input
                type="text"
                required
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Document Content (Indexed for AI Retrieval)
              </label>
              <textarea
                rows={4}
                required
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                placeholder="Paste guidelines, policies, or product knowledge..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowKnowledgeModal(false)}
                className="px-4 py-2 bg-slate-800 text-xs text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white rounded-lg"
              >
                Save Document
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
