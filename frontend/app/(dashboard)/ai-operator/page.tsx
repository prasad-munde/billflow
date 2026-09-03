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
  KeyIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  PlusIcon,
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

const STARTER_PROMPTS = [
  {
    category: "System Knowledge",
    title: "Client Portal & Batch Pay",
    prompt: "How does the Client Portal work, and how can clients pay multiple invoices at once with Batch Pay?",
    icon: "🌐",
  },
  {
    category: "Financial Audit",
    title: "Who Owes Me Money?",
    prompt: "Who owes me money right now? Show me all clients with overdue balances and pending receivables.",
    icon: "🚨",
  },
  {
    category: "Autonomous Action",
    title: "Draft an Invoice",
    prompt: "Create an invoice for Maya Chen for $1,800 for UI/UX Design System due in 14 days.",
    icon: "📝",
  },
  {
    category: "Workflow Guide",
    title: "Print & PDF Export",
    prompt: "How do I print or export an invoice as a clean physical receipt PDF in BillFlow?",
    icon: "🖨️",
  },
];

export default function AIOperatorPage() {
  const [provider, setProvider] = useState<string>("gemini-3.5-flash");
  const [apiKey, setApiKey] = useState<string>("");
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [keySaved, setKeySaved] = useState<boolean>(true);

  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const [messages, setMessages] = useState<Message[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem("billflow_llm_key") || "";
    const savedProvider = localStorage.getItem("billflow_llm_provider") || "gemini-3.5-flash";
    setApiKey(savedKey);
    setProvider(savedProvider);
    setKeySaved(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("billflow_llm_key", apiKey.trim());
    localStorage.setItem("billflow_llm_provider", provider);
    setKeySaved(true);
    setShowKeyModal(false);
    toast.success("AI Operator model configuration saved!");
  };

  const toggleToolExpand = (id: string) => {
    setExpandedTools((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Copied to clipboard!");
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    toast.info("Started a new conversation session.");
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
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setLoading(true);

    try {
      const historyPayload = messages.slice(-8).map((m) => ({
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
        tool_calls: res.tool_calls || [],
        provider_used: res.provider_used,
        model_used: res.model_used,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to communicate with AI Operator.");
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          sender: "assistant",
          text: "I encountered an issue reaching the model. Please verify your connection or model settings.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + "px";
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col rounded-3xl border border-ink/10 bg-white shadow-sm overflow-hidden">
      {/* ChatGPT-style Header */}
      <div className="flex items-center justify-between border-b border-ink/10 bg-[#fafaf9] px-6 py-4">
        <div className="flex items-center gap-3.5">
          <div className="grid size-10 place-items-center rounded-2xl bg-lime text-ink shadow-sm">
            <SparklesIcon className="size-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-bold tracking-tight text-ink">
                AI Operator
              </h1>
              <span className="rounded-full bg-lime/30 border border-lime/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-ink">
                ChatGPT Mode
              </span>
            </div>
            <p className="text-[11px] text-ink/55">
              Natural conversational copilot & autonomous operations for BillFlow
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowKeyModal(true)}
            className="flex items-center gap-2 rounded-2xl border border-ink/10 bg-white px-3.5 py-1.5 text-xs font-bold text-ink hover:border-cobalt transition shadow-2xs"
          >
            <span className="size-2 rounded-full bg-green-500 animate-pulse" />
            <span>
              {provider.startsWith("gemini")
                ? `Google Gemini (${provider})`
                : provider === "groq"
                ? "Groq Llama 3.3"
                : "OpenAI"}
            </span>
            <ChevronDownIcon className="size-3 text-ink/40" />
          </button>

          <button
            onClick={handleNewChat}
            className="btn-light !py-1.5 !px-3 text-xs font-bold flex items-center gap-1.5"
            title="Start a new chat session"
          >
            <PlusIcon className="size-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-12 space-y-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center max-w-2xl mx-auto text-center py-8">
            <div className="grid size-16 place-items-center rounded-3xl bg-lime text-ink shadow-md mb-4 animate-in zoom-in-95">
              <SparklesIcon className="size-9 stroke-[2]" />
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-ink">
              What can I do for you today?
            </h2>
            <p className="mt-2 text-xs md:text-sm text-ink/60 max-w-md leading-relaxed">
              I know everything about BillFlow. Ask me how any feature works, audit your clients & overdue payments, or tell me to create invoices.
            </p>

            {/* 4-Card ChatGPT Prompt Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-8 text-left">
              {STARTER_PROMPTS.map((card, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(card.prompt)}
                  className="group rounded-2xl border border-ink/10 bg-paper/60 p-4 text-xs hover:border-cobalt hover:bg-white hover:shadow-sm transition"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-base">{card.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink/40 group-hover:text-cobalt">
                      {card.category}
                    </span>
                  </div>
                  <p className="font-bold text-ink group-hover:text-cobalt">{card.title}</p>
                  <p className="mt-1 text-[11px] text-ink/55 line-clamp-2 leading-relaxed">
                    {card.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3.5 ${
                  m.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.sender === "assistant" && (
                  <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-lime text-ink text-xs font-bold shadow-xs">
                    <SparklesIcon className="size-4.5 stroke-[2.5]" />
                  </div>
                )}

                <div
                  className={`relative group max-w-[85%] rounded-2xl p-4.5 text-xs md:text-sm leading-relaxed ${
                    m.sender === "user"
                      ? "bg-ink text-white rounded-br-xs shadow-xs"
                      : "bg-[#fbfbfa] text-ink border border-ink/10 rounded-bl-xs shadow-2xs"
                  }`}
                >
                  <div className="whitespace-pre-line space-y-2">
                    {m.text}
                  </div>

                  {m.tool_calls && m.tool_calls.length > 0 && (
                    <div className="mt-3.5 space-y-2 border-t border-ink/10 pt-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-cobalt flex items-center gap-1.5">
                        <CommandLineIcon className="size-3.5 stroke-[2.5]" />
                        Autonomous Database Action Executed
                      </p>

                      {m.tool_calls.map((tc, idx) => {
                        const toolKey = `${m.id}-tool-${idx}`;
                        const isExpanded = expandedTools[toolKey];

                        return (
                          <div
                            key={idx}
                            className="rounded-xl border border-ink/10 bg-white p-3 text-[11px]"
                          >
                            <div
                              onClick={() => toggleToolExpand(toolKey)}
                              className="flex items-center justify-between cursor-pointer font-mono font-bold text-ink"
                            >
                              <span className="text-cobalt">⚡ {tc.tool}()</span>
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-green-100 text-green-800 px-1.5 py-0.5 text-[9px] font-bold">
                                  SUCCESS
                                </span>
                                {isExpanded ? (
                                  <ChevronUpIcon className="size-3 text-ink/40" />
                                ) : (
                                  <ChevronDownIcon className="size-3 text-ink/40" />
                                )}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="mt-2.5 space-y-2 border-t border-ink/5 pt-2 text-[10px]">
                                <div>
                                  <span className="font-bold text-ink/50 uppercase">Parameters:</span>
                                  <pre className="mt-1 rounded-lg bg-paper p-2 font-mono overflow-x-auto border border-ink/5 text-ink/80">
                                    {JSON.stringify(tc.args, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <span className="font-bold text-ink/50 uppercase">Database Result:</span>
                                  <pre className="mt-1 rounded-lg bg-paper p-2 font-mono overflow-x-auto border border-ink/5 text-ink/80 max-h-40">
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

                  {m.sender === "assistant" && (
                    <div className="mt-3 flex items-center justify-between border-t border-ink/5 pt-2 text-[10px] text-ink/40">
                      <span>{m.provider_used || "AI Operator"}</span>
                      <button
                        onClick={() => handleCopy(m.id, m.text)}
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-ink/5 text-ink/50 hover:text-ink transition"
                        title="Copy message"
                      >
                        {copiedId === m.id ? (
                          <>
                            <CheckIcon className="size-3 text-green-600" />
                            <span className="text-green-600 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <ClipboardDocumentIcon className="size-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-[#fbfbfa] p-4 text-xs text-ink/70 w-fit shadow-2xs animate-pulse">
                <ArrowPathIcon className="size-4 animate-spin text-cobalt" />
                <span className="font-semibold">AI Operator is thinking…</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ChatGPT-style Bottom Input Box */}
      <div className="border-t border-ink/10 bg-white p-4 md:px-12">
        <div className="max-w-3xl mx-auto space-y-2.5">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-[11px]">
            <span className="text-[10px] font-black uppercase text-ink/40 shrink-0">Quick Ask:</span>
            <button
              onClick={() => handleSend("How does the Client Portal work?")}
              className="rounded-full border border-ink/10 bg-paper px-3 py-1 font-medium text-ink/70 hover:border-cobalt hover:text-cobalt transition whitespace-nowrap shrink-0"
            >
              Client Portal Guide
            </button>
            <button
              onClick={() => handleSend("Who owes me money right now?")}
              className="rounded-full border border-ink/10 bg-paper px-3 py-1 font-medium text-ink/70 hover:border-cobalt hover:text-cobalt transition whitespace-nowrap shrink-0"
            >
              Audit Overdue Balances
            </button>
            <button
              onClick={() => handleSend("How do I export or print an invoice as PDF?")}
              className="rounded-full border border-ink/10 bg-paper px-3 py-1 font-medium text-ink/70 hover:border-cobalt hover:text-cobalt transition whitespace-nowrap shrink-0"
            >
              PDF Printing
            </button>
            <button
              onClick={() => handleSend("Give me a summary of my business metrics")}
              className="rounded-full border border-ink/10 bg-paper px-3 py-1 font-medium text-ink/70 hover:border-cobalt hover:text-cobalt transition whitespace-nowrap shrink-0"
            >
              Studio KPIs
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex items-end gap-2 rounded-2xl border border-ink/15 bg-paper/50 p-2.5 focus-within:border-cobalt focus-within:bg-white focus-within:shadow-xs transition"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about BillFlow, audit clients, create invoices... (Shift+Enter for newline)"
              className="flex-1 bg-transparent px-3 py-1.5 text-xs md:text-sm text-ink placeholder:text-ink/40 outline-none resize-none max-h-40 leading-relaxed"
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={`grid size-9 shrink-0 place-items-center rounded-xl transition ${
                input.trim() && !loading
                  ? "bg-ink text-white hover:bg-black shadow-xs cursor-pointer"
                  : "bg-ink/10 text-ink/30 cursor-not-allowed"
              }`}
              title="Send message"
            >
              <PaperAirplaneIcon className="size-4 -rotate-45" />
            </button>
          </form>

          <p className="text-center text-[10px] text-ink/40">
            BillFlow AI Operator • Powered by Google Gemini 3.5 Flash • Natural Chat & Autonomous Tool Calling
          </p>
        </div>
      </div>

      {/* Model & API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-ink/10 bg-white p-7 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-lime text-ink">
                  <KeyIcon className="size-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-ink">AI Model & Settings</h3>
                  <p className="text-xs text-ink/55">Configure your free Gemini or LLM model</p>
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
                <label className="label">AI Model</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="input cursor-pointer font-medium"
                >
                  <optgroup label="🌟 Google Gemini Models (Active Key)">
                    <option value="gemini-3.5-flash">Google Gemini 3.5 Flash (Active — Recommended Free Tier)</option>
                    <option value="gemini-3.6-flash">Google Gemini 3.6 Flash (Latest Generation Flash)</option>
                    <option value="gemini-2.0-flash">Google Gemini 2.0 Flash (Multimodal Fast)</option>
                    <option value="gemini-1.5-flash">Google Gemini 1.5 Flash (Standard Fast)</option>
                    <option value="gemini-1.5-pro">Google Gemini 1.5 Pro (Large Context Architecture)</option>
                  </optgroup>
                  <optgroup label="⚡ Other Cloud Providers">
                    <option value="groq">Groq Llama 3.3 70B (Free Tier — Instant)</option>
                    <option value="openai">OpenAI (GPT-4o-mini / GPT-4o)</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="label">API Key Override (Optional)</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AQ.Ab8RN6L8... (Leave empty to use configured workspace key)"
                  className="input font-mono text-xs"
                />
                <p className="mt-1.5 text-[11px] text-ink/50">
                  Your workspace is pre-configured with your active Gemini API key.
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
