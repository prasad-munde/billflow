"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  SparklesIcon,
  PaperAirplaneIcon,
  CommandLineIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  BanknotesIcon,
  ArrowTopRightOnSquareIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import { api, toast } from "@/lib/api";

interface ToolCall {
  tool: string;
  args: Record<string, any>;
  result: any;
}

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  tool_calls?: ToolCall[];
  provider_used?: string;
  model_used?: string;
  timestamp: string;
}

interface QuickMetric {
  total_revenue_earned?: number;
  total_pending_receivables?: number;
  total_overdue_balance?: number;
  total_clients?: number;
  total_invoices?: number;
}

export default function AIControlPage() {
  const [provider, setProvider] = useState<string>("gemini-3.5-flash");
  const [apiKey, setApiKey] = useState<string>("");
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [keySaved, setKeySaved] = useState<boolean>(true);

  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<QuickMetric | null>(null);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      sender: "assistant",
      text: "⚡ **BillFlow Autonomous AI Control Center Online.**\n\nI am connected to your workspace database with 6 autonomous execution tools:\n\n• `get_clients` — Retrieve client directory with segregated revenue & overdue balances.\n• `get_client_analytics` — Deep-dive into specific client invoicing and payment history.\n• `create_client` — Register new clients into the database.\n• `create_invoice` — Generate & dispatch real invoices with itemized services.\n• `get_invoices` — Query and filter invoices by status or client.\n• `get_dashboard_summary` — Real-time business KPI diagnostics.\n\n*Configure your free Gemini or Groq API key in the Model Settings above to unlock full multi-turn conversational reasoning.*",
      provider_used: "Autonomous Tool Executor",
      timestamp: "Ready",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem("billflow_llm_key") || "";
    const savedProvider = localStorage.getItem("billflow_llm_provider") || "gemini";
    setApiKey(savedKey);
    setProvider(savedProvider);
    if (savedKey) setKeySaved(true);

    fetchMetrics();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const fetchMetrics = async () => {
    try {
      const res = await api<QuickMetric>("/dashboard/summary");
      setMetrics({
        total_revenue_earned: (res as any).total_earned || 0,
        total_pending_receivables: (res as any).total_outstanding || 0,
        total_overdue_balance: (res as any).total_overdue || 0,
        total_clients: (res as any).clients_count || 0,
        total_invoices: (res as any).invoices_count || 0,
      });
    } catch {
      // Ignore
    }
  };

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("billflow_llm_key", apiKey.trim());
    localStorage.setItem("billflow_llm_provider", provider);
    setKeySaved(!!apiKey.trim());
    setShowKeyModal(false);
    toast.success("LLM Provider configuration saved!");
  };

  const toggleToolExpand = (id: string) => {
    setExpandedTools((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSend = async (userPrompt: string) => {
    const trimmed = userPrompt.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = {
      id: "u-" + Date.now(),
      sender: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.sender,
        content: m.text,
      }));

      const res = await api<{
        text: string;
        tool_calls: ToolCall[];
        provider_used: string;
        model_used?: string;
      }>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: trimmed,
          provider: provider,
          api_key: apiKey.trim() || undefined,
          history: historyPayload,
        }),
      });

      const assistantMessage: Message = {
        id: "a-" + Date.now(),
        sender: "assistant",
        text: res.text,
        tool_calls: res.tool_calls,
        provider_used: res.provider_used,
        model_used: res.model_used,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      fetchMetrics();
    } catch (err: any) {
      toast.error(err?.message || "Failed to execute AI control command.");
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          sender: "assistant",
          text: "⚠️ Encountered an error dispatching the command. Please check your network or API key configuration.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="grid size-12 place-items-center rounded-2xl bg-lime text-ink shadow-sm">
            <SparklesIcon className="size-7 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
                AI Based Control Center
              </h1>
              <span className="rounded-full bg-lime/30 border border-lime/60 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-ink">
                Autonomous
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink/60">
              Direct natural language control for all studio operations, billing, and database tools.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-ink/10 bg-paper px-3.5 py-2 text-xs">
            <span className="size-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-bold text-ink">
              {keySaved
                ? (provider === "gemini" ? "Google Gemini" : provider === "groq" ? "Groq Llama 3.3" : "OpenAI") + " (Active)"
                : "Built-in Autonomous Engine"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowKeyModal(true)}
            className="btn-light !py-2 !px-3.5 text-xs font-bold flex items-center gap-1.5"
          >
            <KeyIcon className="size-4 text-cobalt" />
            <span>{keySaved ? "Change Key / Model" : "Connect Free LLM Key"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 flex flex-col h-[75vh] rounded-3xl border border-ink/10 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink/10 bg-[#fafaf9] px-6 py-3.5">
            <div className="flex items-center gap-2">
              <CommandLineIcon className="size-4 text-cobalt" />
              <span className="text-xs font-bold font-mono text-ink uppercase tracking-wider">
                Autonomous Execution Stream
              </span>
            </div>
            <button
              onClick={() =>
                setMessages([
                  {
                    id: "reset",
                    sender: "assistant",
                    text: "Workspace session reset. Ready for your next command.",
                    timestamp: "Just now",
                  },
                ])
              }
              className="text-[11px] font-semibold text-ink/45 hover:text-ink transition"
            >
              Clear Feed
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs bg-paper/30">
            {messages.map((m) => (
              <div
                key={m.id}
                className={"flex flex-col " + (m.sender === "user" ? "items-end" : "items-start")}
              >
                <div
                  className={"max-w-[92%] rounded-2xl p-4 leading-relaxed " + (
                    m.sender === "user"
                      ? "bg-ink text-white shadow-xs rounded-br-xs"
                      : "bg-white text-ink border border-ink/10 shadow-xs rounded-bl-xs"
                  )}
                >
                  <div className="whitespace-pre-line space-y-1.5 text-xs md:text-sm">
                    {m.text}
                  </div>

                  {m.provider_used && (
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] text-ink/40 border-t border-ink/5 pt-2">
                      <SparklesIcon className="size-3 text-cobalt" />
                      <span>{m.provider_used}</span>
                    </div>
                  )}

                  {m.tool_calls && m.tool_calls.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-ink/10 pt-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-cobalt flex items-center gap-1">
                        <CommandLineIcon className="size-3.5 stroke-[2.5]" />
                        Autonomous Tool Invocation Dispatched
                      </p>

                      {m.tool_calls.map((tc, idx) => {
                        const toolKey = m.id + "-tool-" + idx;
                        const isExpanded = expandedTools[toolKey];

                        return (
                          <div
                            key={idx}
                            className="rounded-xl border border-ink/10 bg-[#fbfbfa] p-3 text-[11px]"
                          >
                            <div
                              onClick={() => toggleToolExpand(toolKey)}
                              className="flex items-center justify-between cursor-pointer font-mono font-bold text-ink"
                            >
                              <span className="text-cobalt">⚡ {tc.tool}()</span>
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-green-100 text-green-800 px-1.5 py-0.5 text-[9px] font-bold">
                                  EXECUTED
                                </span>
                                {isExpanded ? (
                                  <ChevronUpIcon className="size-3 text-ink/40" />
                                ) : (
                                  <ChevronDownIcon className="size-3 text-ink/40" />
                                )}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="mt-2.5 space-y-2 border-t border-ink/5 pt-2.5 text-[10px]">
                                <div>
                                  <span className="font-bold text-ink/50 uppercase">Parameters:</span>
                                  <pre className="mt-1 rounded-lg bg-white p-2 font-mono overflow-x-auto border border-ink/5 text-ink/80">
                                    {JSON.stringify(tc.args, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <span className="font-bold text-ink/50 uppercase">Database Output:</span>
                                  <pre className="mt-1 rounded-lg bg-white p-2 font-mono overflow-x-auto border border-ink/5 text-ink/80 max-h-40">
                                    {JSON.stringify(tc.result, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <span className="mt-1 px-1 text-[10px] text-ink/35">{m.timestamp}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-ink/10 bg-white p-4 text-xs text-ink/70 w-fit shadow-xs">
                <ArrowPathIcon className="size-4 animate-spin text-cobalt" />
                <span className="font-semibold">AI Agent executing tools & synthesizing response…</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-ink/5 bg-white px-5 py-2.5 overflow-x-auto flex items-center gap-2 no-scrollbar">
            <span className="text-[10px] font-black text-ink/40 uppercase tracking-wider shrink-0">
              Quick Commands:
            </span>
            <button
              onClick={() => handleSend("Show me Maya Chen's overdue balance")}
              className="rounded-full border border-ink/10 bg-paper px-3 py-1 text-[11px] font-medium text-ink/70 hover:border-cobalt hover:text-cobalt transition whitespace-nowrap shrink-0"
            >
              Maya Chen Overdue
            </button>
            <button
              onClick={() => handleSend("Who owes me money right now?")}
              className="rounded-full border border-ink/10 bg-paper px-3 py-1 text-[11px] font-medium text-ink/70 hover:border-cobalt hover:text-cobalt transition whitespace-nowrap shrink-0"
            >
              Receivables Audit
            </button>
            <button
              onClick={() => handleSend("Create invoice for David Sterling for $1,500 Web Handover")}
              className="rounded-full border border-ink/10 bg-paper px-3 py-1 text-[11px] font-medium text-ink/70 hover:border-cobalt hover:text-cobalt transition whitespace-nowrap shrink-0"
            >
              Bill David Sterling $1,500
            </button>
            <button
              onClick={() => handleSend("Add client Quantum Labs with email billing@quantum.io")}
              className="rounded-full border border-ink/10 bg-paper px-3 py-1 text-[11px] font-medium text-ink/70 hover:border-cobalt hover:text-cobalt transition whitespace-nowrap shrink-0"
            >
              Add Quantum Labs
            </button>
            <button
              onClick={() => handleSend("Give me a summary of my business metrics")}
              className="rounded-full border border-ink/10 bg-paper px-3 py-1 text-[11px] font-medium text-ink/70 hover:border-cobalt hover:text-cobalt transition whitespace-nowrap shrink-0"
            >
              Studio KPIs
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex items-center gap-2 border-t border-ink/10 bg-white p-4"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="E.g. 'Create invoice for Maya Chen for $2,000 UI redesign', 'Who has overdue payments?', 'Add client Acme Corp'..."
              className="input !py-3 !px-4 text-xs md:text-sm flex-1"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn-dark !py-3 !px-5 text-xs md:text-sm font-bold flex items-center gap-2 shrink-0"
            >
              <span>Execute</span>
              <PaperAirplaneIcon className="size-4 -rotate-45" />
            </button>
          </form>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <BanknotesIcon className="size-5 text-cobalt" />
                Live Financial State
              </h3>
              <button
                onClick={fetchMetrics}
                className="text-xs text-cobalt font-bold hover:underline"
              >
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-2xl bg-paper p-4 border border-ink/5">
                <p className="text-[11px] font-semibold text-ink/50 uppercase">Collected Revenue</p>
                <p className="font-display text-2xl font-bold text-ink mt-1">
                  ${(metrics?.total_revenue_earned || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-paper p-3.5 border border-ink/5">
                  <p className="text-[10px] font-semibold text-ink/50 uppercase">Receivables</p>
                  <p className="font-display text-lg font-bold text-ink mt-0.5">
                    ${(metrics?.total_pending_receivables || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="rounded-2xl bg-red-50 p-3.5 border border-red-100">
                  <p className="text-[10px] font-semibold text-red-600 uppercase">Overdue</p>
                  <p className="font-display text-lg font-bold text-red-700 mt-0.5">
                    ${(metrics?.total_overdue_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm space-y-3">
            <h3 className="font-display text-base font-bold text-ink flex items-center gap-2 mb-2">
              <CommandLineIcon className="size-5 text-cobalt" />
              1-Click Operations
            </h3>

            <button
              onClick={() => handleSend("List all clients with their full revenue and overdue breakdown")}
              className="w-full flex items-center justify-between rounded-2xl border border-ink/10 bg-paper p-3 text-xs font-bold text-ink hover:bg-ink hover:text-white transition"
            >
              <span>📊 Full Client Financial Audit</span>
              <span className="text-[10px] opacity-60">RUN →</span>
            </button>

            <button
              onClick={() => handleSend("Which invoices are currently overdue or pending payment?")}
              className="w-full flex items-center justify-between rounded-2xl border border-ink/10 bg-paper p-3 text-xs font-bold text-ink hover:bg-ink hover:text-white transition"
            >
              <span>🚨 Audit Overdue Invoices</span>
              <span className="text-[10px] opacity-60">RUN →</span>
            </button>

            <button
              onClick={() => handleSend("Show me recent invoices with their payment links")}
              className="w-full flex items-center justify-between rounded-2xl border border-ink/10 bg-paper p-3 text-xs font-bold text-ink hover:bg-ink hover:text-white transition"
            >
              <span>🔗 Generate Payment Links List</span>
              <span className="text-[10px] opacity-60">RUN →</span>
            </button>
          </div>

          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
            <h3 className="font-display text-sm font-bold text-ink mb-3">Direct Workspace Links</h3>
            <div className="space-y-2 text-xs">
              <Link
                href="/invoices"
                className="flex items-center justify-between rounded-xl p-2 font-medium text-ink/70 hover:bg-ink/5 hover:text-ink transition"
              >
                <span>Invoice Management</span>
                <ArrowTopRightOnSquareIcon className="size-3.5" />
              </Link>
              <Link
                href="/clients"
                className="flex items-center justify-between rounded-xl p-2 font-medium text-ink/70 hover:bg-ink/5 hover:text-ink transition"
              >
                <span>Client Financial Segregation</span>
                <ArrowTopRightOnSquareIcon className="size-3.5" />
              </Link>
              <Link
                href="/guide"
                className="flex items-center justify-between rounded-xl p-2 font-medium text-ink/70 hover:bg-ink/5 hover:text-ink transition"
              >
                <span>Learn to Use & Docs</span>
                <ArrowTopRightOnSquareIcon className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-ink/10 bg-white p-7 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-lime text-ink">
                  <KeyIcon className="size-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-ink">LLM Model Settings</h3>
                  <p className="text-xs text-ink/55">Configure your free AI API key</p>
                </div>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="rounded-xl p-2 text-ink/40 hover:bg-ink/5 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveKey} className="mt-6 space-y-4">
              <div>
                <label className="label">AI Model & Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="input cursor-pointer"
                >
                  <optgroup label="🌟 Google Gemini Models">
                    <option value="gemini-3.5-flash">Google Gemini 3.5 Flash (Active — Recommended Free Tier)</option>
                    <option value="gemini-3.6-flash">Google Gemini 3.6 Flash (Latest Generation Flash)</option>
                    <option value="gemini-2.0-flash">Google Gemini 2.0 Flash (Multimodal Fast)</option>
                    <option value="gemini-1.5-flash">Google Gemini 1.5 Flash (Standard Fast)</option>
                    <option value="gemini-1.5-pro">Google Gemini 1.5 Pro (Large Context Architecture)</option>
                  </optgroup>
                  <optgroup label="⚡ Other Providers">
                    <option value="groq">Groq Llama 3.3 70B (Free Tier — Instant)</option>
                    <option value="openai">OpenAI (GPT-4o-mini / GPT-4o)</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="label">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    provider === "gemini"
                      ? "AIzaSy..."
                      : provider === "groq"
                      ? "gsk_..."
                      : "sk-..."
                  }
                  className="input font-mono text-xs"
                />
                <p className="mt-1.5 text-[11px] text-ink/50">
                  {provider === "gemini" ? (
                    <span>
                      Get a free Gemini API key at{" "}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-cobalt font-bold underline"
                      >
                        aistudio.google.com ↗
                      </a>
                    </span>
                  ) : provider === "groq" ? (
                    <span>
                      Get a free Groq API key at{" "}
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-cobalt font-bold underline"
                      >
                        console.groq.com ↗
                      </a>
                    </span>
                  ) : (
                    "Enter your OpenAI key from platform.openai.com."
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-paper p-3.5 border border-ink/5 text-xs text-ink/70">
                <p className="font-bold text-ink">🔒 Privacy & Storage Notice</p>
                <p className="mt-0.5 text-[11px] text-ink/55 leading-relaxed">
                  Your key is saved locally in your browser session and sent encrypted via HTTPS directly to execute workspace tools.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="btn-light !px-4 !py-2.5 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-dark !px-5 !py-2.5 text-xs font-bold">
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
