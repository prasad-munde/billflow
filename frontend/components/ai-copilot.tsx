"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  SparklesIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  CommandLineIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  UsersIcon,
  BanknotesIcon,
  ArrowRightIcon,
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
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Show me Maya Chen's overdue balance",
  "Who owes me money right now?",
  "Create invoice for David Sterling for $1,200 Web Handover",
  "Add client Acme Corp with email contact@acme.com",
  "What are my overall studio metrics?",
];

export function AICopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hi! I am your **BillFlow AI Copilot** equipped with live tool calling.\n\nAsk me to query client financials, check overdue balances, add clients, or generate real invoices automatically!",
      timestamp: "Just now",
    },
  ]);

  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const toggleToolExpand = (id: string) => {
    setExpandedTools((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSend = async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await api<{ text: string; tool_calls: ToolCall[] }>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: trimmed }),
      });

      const assistantMessage: Message = {
        id: `a-${Date.now()}`,
        sender: "assistant",
        text: res.text,
        tool_calls: res.tool_calls,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to communicate with AI Assistant.");
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "assistant",
          text: "⚠️ Sorry, I encountered an error executing that request. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 rounded-full border border-ink/10 bg-ink px-4 py-3 text-white shadow-soft transition-all hover:scale-105 hover:bg-black"
        >
          <span className="grid size-6 place-items-center rounded-full bg-lime text-ink">
            <SparklesIcon className="size-4 stroke-[2.5]" />
          </span>
          <span className="text-xs font-bold font-display tracking-tight pr-1">
            AI Tool Copilot
          </span>
        </button>
      </div>

      {/* Slide-out Drawer / Chat Window */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6 backdrop-blur-xs bg-black/20 pointer-events-auto">
          <div className="flex h-[88vh] w-full max-w-lg flex-col rounded-[2.5rem] border border-ink/10 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ink/10 bg-[#fafaf9] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-xl bg-lime text-ink shadow-xs">
                  <SparklesIcon className="size-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                    BillFlow AI Copilot
                    <span className="rounded-full bg-cobalt/10 px-2 py-0.5 text-[10px] font-bold text-cobalt">
                      Tool Agent
                    </span>
                  </h3>
                  <p className="text-[11px] text-ink/50">Autonomous workspace tool executor</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ink transition"
              >
                <XMarkIcon className="size-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs bg-paper/40">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl p-4 leading-relaxed ${
                      m.sender === "user"
                        ? "bg-ink text-white shadow-xs rounded-br-xs"
                        : "bg-white text-ink border border-ink/10 shadow-xs rounded-bl-xs"
                    }`}
                  >
                    {/* Message Text with markdown linebreaks */}
                    <div className="whitespace-pre-line space-y-1">
                      {m.text}
                    </div>

                    {/* Tool Calls Inspector */}
                    {m.tool_calls && m.tool_calls.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-ink/10 pt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-cobalt flex items-center gap-1">
                          <CommandLineIcon className="size-3.5" />
                          Tool Execution Dispatched
                        </p>
                        {m.tool_calls.map((tc, idx) => {
                          const toolKey = `${m.id}-tool-${idx}`;
                          const isExpanded = expandedTools[toolKey];

                          return (
                            <div
                              key={idx}
                              className="rounded-xl border border-ink/10 bg-paper p-2.5 text-[11px]"
                            >
                              <div
                                onClick={() => toggleToolExpand(toolKey)}
                                className="flex items-center justify-between cursor-pointer text-ink font-mono font-bold"
                              >
                                <span className="text-cobalt">⚡ {tc.tool}()</span>
                                {isExpanded ? (
                                  <ChevronUpIcon className="size-3 text-ink/40" />
                                ) : (
                                  <ChevronDownIcon className="size-3 text-ink/40" />
                                )}
                              </div>

                              {isExpanded && (
                                <div className="mt-2 space-y-1.5 border-t border-ink/5 pt-2 text-[10px] text-ink/70">
                                  <div>
                                    <span className="font-bold text-ink/50">Arguments:</span>
                                    <pre className="mt-0.5 rounded-lg bg-white p-1.5 font-mono overflow-x-auto border border-ink/5">
                                      {JSON.stringify(tc.args, null, 2)}
                                    </pre>
                                  </div>
                                  <div>
                                    <span className="font-bold text-ink/50">Output:</span>
                                    <pre className="mt-0.5 rounded-lg bg-white p-1.5 font-mono overflow-x-auto border border-ink/5">
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
                <div className="flex items-center gap-2 rounded-2xl border border-ink/10 bg-white p-3.5 text-xs text-ink/60 w-fit">
                  <ArrowPathIcon className="size-4 animate-spin text-cobalt" />
                  <span>Agent is executing tools & synthesizing data…</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="border-t border-ink/5 bg-white px-4 py-2.5 overflow-x-auto flex items-center gap-2 no-scrollbar">
              <span className="text-[10px] font-bold text-ink/40 uppercase tracking-wider shrink-0">
                Try:
              </span>
              {QUICK_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(p)}
                  className="rounded-full border border-ink/10 bg-paper px-3 py-1 text-[11px] font-medium text-ink/70 hover:border-cobalt hover:text-cobalt transition whitespace-nowrap shrink-0"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex items-center gap-2 border-t border-ink/10 bg-white p-3.5"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask to create client, get overdue, generate invoice..."
                className="input !py-2.5 !px-3.5 text-xs flex-1"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="btn-dark !py-2.5 !px-4 text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                <span>Send</span>
                <PaperAirplaneIcon className="size-3.5 -rotate-45" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
