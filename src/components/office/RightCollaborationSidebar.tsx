'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/src/store/useAppStore';
import {
  sendRealtimeChatMessage,
  recordAIActivityLog,
  updateAIEmployeeState,
} from '@/src/lib/firestore-actions';
import { soundFX } from '@/src/lib/sound';
import { Send, Users, Bot, MessageSquare, Sparkles } from 'lucide-react';

export function RightCollaborationSidebar({
  className = 'w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0',
}: {
  className?: string;
} = {}) {
  const [sidebarMode, setSidebarMode] = useState<'PEOPLE' | 'CHAT' | 'AI_CHAT'>(
    'PEOPLE'
  );
  const [chatChannel, setChatChannel] = useState<
    'GLOBAL' | 'ROOM' | 'PROXIMITY'
  >('GLOBAL');
  const [inputMsg, setInputMsg] = useState('');
  const [aiInputMsg, setAiInputMsg] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const currentUser = useAppStore((s) => s.currentUser);
  const players = useAppStore((s) => s.players);
  const aiEmployees = useAppStore((s) => s.aiEmployees);
  const messages = useAppStore((s) => s.messages);
  const localPlayerPos = useAppStore((s) => s.localPlayerPos);
  const selectedAIEmployeeId = useAppStore((s) => s.selectedAIEmployeeId);
  const setSelectedAIEmployeeId = useAppStore((s) => s.setSelectedAIEmployeeId);
  const departments = useAppStore((s) => s.departments);
  const knowledgeDocs = useAppStore((s) => s.knowledgeDocs);
  const workspace = useAppStore((s) => s.workspace);

  const activeAI =
    aiEmployees.find((a) => a.id === selectedAIEmployeeId) || aiEmployees[0];

  const handleSendHumanChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    const text = inputMsg.trim();
    setInputMsg('');
    soundFX.playClick();

    await sendRealtimeChatMessage({
      channelType: chatChannel,
      roomId:
        chatChannel === 'ROOM' ? localPlayerPos.roomId : 'global_channel',
      senderId: currentUser?.uid || 'local_user',
      senderName: currentUser?.displayName || 'Supervisor',
      senderType: 'HUMAN',
      content: text,
    });
  };

  const handleSendDirectAIChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInputMsg.trim() || !activeAI || aiLoading) return;

    if (workspace.emergencyPauseAllAI || activeAI.status === 'PAUSED') {
      return;
    }

    const promptText = aiInputMsg.trim();
    setAiInputMsg('');
    setAiLoading(true);
    soundFX.playClick();

    // Save human message in AI_DIRECT thread
    await sendRealtimeChatMessage({
      channelType: 'AI_DIRECT',
      roomId: activeAI.id,
      senderId: currentUser?.uid || 'local_user',
      senderName: currentUser?.displayName || 'Supervisor',
      senderType: 'HUMAN',
      content: promptText,
    });

    const dept = departments.find((d) => d.id === activeAI.departmentId);
    const deptDocs = knowledgeDocs
      .filter((k) => k.departmentId === activeAI.departmentId)
      .map((k) => `${k.title}: ${k.content}`)
      .join('\n\n');

    try {
      await updateAIEmployeeState(activeAI, { status: 'THINKING' });

      const res = await fetch(`/api/ai/employees/${activeAI.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: activeAI.modelProvider,
          modelName: activeAI.modelName,
          systemPrompt: activeAI.systemPrompt,
          userPrompt: promptText,
          temperature: activeAI.temperature,
          departmentContext: dept
            ? `Department: ${dept.name}. Supervisor: ${dept.supervisorName}. Goals: ${dept.goals}`
            : undefined,
          knowledgeContext: deptDocs,
          restrictions: activeAI.restrictions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI request failed');
      }

      await sendRealtimeChatMessage({
        channelType: 'AI_DIRECT',
        roomId: activeAI.id,
        senderId: activeAI.id,
        senderName: `🤖 ${activeAI.name} (${data.providerUsed})`,
        senderType: 'AI',
        content: data.text,
      });

      const nextSpentToday = activeAI.spentToday + (data.estimatedCostUsd || 0.01);
      const nextSpentMonth = activeAI.spentMonth + (data.estimatedCostUsd || 0.01);
      const budgetExceeded = nextSpentToday >= activeAI.dailyBudget;

      await updateAIEmployeeState(activeAI, {
        status: budgetExceeded
          ? 'PAUSED'
          : data.toolSuggested?.requiresApproval
            ? 'WAITING_APPROVAL'
            : 'WORKING',
        spentToday: nextSpentToday,
        spentMonth: nextSpentMonth,
      });

      await recordAIActivityLog({
        departmentId: activeAI.departmentId,
        aiEmployeeId: activeAI.id,
        aiEmployeeName: activeAI.name,
        action: `Direct Supervisor Consultation (${data.providerUsed})`,
        details: `Prompt: "${promptText.slice(0, 80)}..." | Model: ${data.modelUsed}`,
        status: data.toolSuggested?.requiresApproval
          ? 'PENDING_APPROVAL'
          : 'SUCCESS',
        riskLevel: data.toolSuggested?.riskLevel || 'LOW',
        costIncurred: data.estimatedCostUsd || 0.005,
      });

      soundFX.playNotification();
    } catch (err) {
      await sendRealtimeChatMessage({
        channelType: 'AI_DIRECT',
        roomId: activeAI.id,
        senderId: activeAI.id,
        senderName: `🤖 ${activeAI.name}`,
        senderType: 'AI',
        content:
          err instanceof Error
            ? `⚠️ ${err.message}`
            : '🤖 AI temporarily unavailable. The task has been paused.',
      });
      await updateAIEmployeeState(activeAI, { status: 'ERROR' });
    } finally {
      setAiLoading(false);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (sidebarMode === 'AI_CHAT') {
      return m.channelType === 'AI_DIRECT' && m.roomId === activeAI?.id;
    }
    if (chatChannel === 'ROOM') {
      return m.channelType === 'ROOM' && m.roomId === localPlayerPos.roomId;
    }
    return m.channelType === chatChannel;
  });

  const humanPlayersList = Object.values(players);

  return (
    <aside className={className}>
      {/* Segmented Switcher */}
      <div className="p-3 border-b border-slate-800">
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-lg">
          <button
            onClick={() => setSidebarMode('PEOPLE')}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              sidebarMode === 'PEOPLE'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            People
          </button>
          <button
            onClick={() => setSidebarMode('CHAT')}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              sidebarMode === 'CHAT'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Office Chat
          </button>
          <button
            onClick={() => setSidebarMode('AI_CHAT')}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              sidebarMode === 'AI_CHAT'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            AI Direct
          </button>
        </div>
      </div>

      {/* Mode 1: People & AI Presence Roster */}
      {sidebarMode === 'PEOPLE' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Human Employees */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-3">
              <span>Human Supervisors & Staff</span>
              <span className="font-mono tabular-nums">
                {Math.max(1, humanPlayersList.length)} online
              </span>
            </div>
            <div className="space-y-2.5">
              {humanPlayersList.length === 0 && currentUser && (
                <div className="flex items-center justify-between py-1.5 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <div>
                      <div className="font-medium text-slate-100">
                        {currentUser.displayName} (You)
                      </div>
                      <div className="text-slate-500">
                        {currentUser.role} · {localPlayerPos.roomId.replace('room_', '')}
                      </div>
                    </div>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {localPlayerPos.status}
                  </span>
                </div>
              )}
              {humanPlayersList.map((p) => (
                <div
                  key={p.uid}
                  className="flex items-center justify-between py-1.5 text-xs border-b border-slate-800/50 last:border-none"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          p.status === 'AVAILABLE'
                            ? '#10b981'
                            : p.status === 'AWAY'
                              ? '#f59e0b'
                              : '#ef4444',
                      }}
                    />
                    <div>
                      <div className="font-medium text-slate-100">
                        {p.displayName}{' '}
                        {p.uid === currentUser?.uid ? '(You)' : ''}
                      </div>
                      <div className="text-slate-500">
                        {p.role} · {p.roomId.replace('room_', '')}
                      </div>
                    </div>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Workforce Roster */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-3">
              <span>AI Workforce Agents</span>
              <span className="font-mono tabular-nums">
                {aiEmployees.filter((a) => a.status !== 'PAUSED').length} /{' '}
                {aiEmployees.length} active
              </span>
            </div>
            <div className="space-y-2">
              {aiEmployees.map((ai) => (
                <div
                  key={ai.id}
                  onClick={() => {
                    setSelectedAIEmployeeId(ai.id);
                    setSidebarMode('AI_CHAT');
                  }}
                  className="p-2.5 rounded-lg bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/80 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-xs text-slate-100">
                      🤖 {ai.name}
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 tabular-nums">
                      {ai.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {ai.role}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 font-mono tabular-nums">
                    <span>{ai.modelProvider}</span>
                    <span>·</span>
                    <span>KPI {ai.performanceScore}%</span>
                    <span>·</span>
                    <span>
                      ${ai.spentToday}/${ai.dailyBudget}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Multi-Channel Office Chat */}
      {sidebarMode === 'CHAT' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-1">
            {(['GLOBAL', 'ROOM', 'PROXIMITY'] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setChatChannel(ch)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                  chatChannel === ch
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No messages in {chatChannel} channel yet. Start a conversation
                with your team.
              </div>
            ) : (
              filteredMessages.map((m) => (
                <div
                  key={m.id}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-slate-200">
                      {m.senderName}
                    </span>
                    <span className="font-mono">{m.channelType}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed break-words">
                    {m.content}
                  </p>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handleSendHumanChat}
            className="p-3 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder={`Message ${chatChannel.toLowerCase()}...`}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Mode 3: Direct AI Employee Chat (Powered by NVIDIA NIM / Gemini) */}
      {sidebarMode === 'AI_CHAT' && activeAI && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 border-b border-slate-800 bg-slate-950/50">
            <label className="block text-[11px] text-slate-400 mb-1">
              Select AI Employee:
            </label>
            <select
              value={activeAI.id}
              onChange={(e) => setSelectedAIEmployeeId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {aiEmployees.map((ai) => (
                <option key={ai.id} value={ai.id}>
                  🤖 {ai.name} — {ai.role} ({ai.modelProvider})
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
              <span>Model: {activeAI.modelName.split('/').pop()}</span>
              <span>Autonomy L{activeAI.autonomyLevel}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {filteredMessages.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Consult 🤖 {activeAI.name}
                </div>
                <p>
                  Ask {activeAI.name} to analyze department KPIs, draft reports,
                  or plan campaigns. High-risk actions will automatically
                  trigger Human-in-the-Loop approval.
                </p>
              </div>
            ) : (
              filteredMessages.map((m) => (
                <div
                  key={m.id}
                  className={`p-2.5 rounded-lg border text-xs ${
                    m.senderType === 'AI'
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-white">
                      {m.senderName}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed break-words">
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {aiLoading && (
              <div className="text-xs text-emerald-400 font-mono animate-pulse px-2">
                🤖 {activeAI.name} is thinking via {activeAI.modelProvider}...
              </div>
            )}
          </div>

          <form
            onSubmit={handleSendDirectAIChat}
            className="p-3 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={aiInputMsg}
              onChange={(e) => setAiInputMsg(e.target.value)}
              disabled={
                aiLoading ||
                workspace.emergencyPauseAllAI ||
                activeAI.status === 'PAUSED'
              }
              placeholder={
                activeAI.status === 'PAUSED'
                  ? `${activeAI.name} is PAUSED`
                  : `Message ${activeAI.name}...`
              }
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={
                aiLoading ||
                workspace.emergencyPauseAllAI ||
                activeAI.status === 'PAUSED'
              }
              className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}
