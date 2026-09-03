"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, money, toast } from "@/lib/api";
import {
  PlusIcon,
  TrashIcon,
  SparklesIcon,
  ArrowLeftIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type Client = {
  id: number;
  name: string;
  company: string | null;
  email: string;
};

type Item = {
  description: string;
  quantity: number;
  rate: number;
};

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [currency, setCurrency] = useState<string>("USD");
  const [items, setItems] = useState<Item[]>([
    { description: "", quantity: 1, rate: 0 },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // AI Assistant Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    // Initial dates
    const today = new Date();
    setIssueDate(today.toISOString().slice(0, 10));
    const due = new Date();
    due.setDate(today.getDate() + 14);
    setDueDate(due.toISOString().slice(0, 10));

    // Load clients & business settings
    api<Client[]>("/clients")
      .then((data) => {
        setClients(data);
        if (data.length > 0) {
          setClientId(String(data[0].id));
        }
      })
      .catch(() => router.push("/login"));

    api("/settings")
      .then((s) => s.currency && setCurrency(s.currency))
      .catch(() => {});
  }, [router]);

  // Calculations
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
    0
  );
  const effectiveDiscount =
    discountType === "percent"
      ? Math.round(((subtotal * (Number(discountValue) || 0)) / 100) * 100) / 100
      : Number(discountValue) || 0;
  const discountedBase = Math.max(0, subtotal - effectiveDiscount);
  const calculatedTax = discountedBase * ((Number(taxRate) || 0) / 100);
  const total = discountedBase + calculatedTax;

  function updateItem(index: number, field: keyof Item, value: any) {
    setItems(
      items.map((it, idx) => {
        if (idx !== index) return it;
        if (field === "description") return { ...it, description: value };
        return { ...it, [field]: Number(value) };
      })
    );
  }

  function addItem() {
    setItems([...items, { description: "", quantity: 1, rate: 0 }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) {
      toast.info("Invoice must have at least one line item.");
      return;
    }
    setItems(items.filter((_, idx) => idx !== index));
  }

  async function handleAiDraft() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);

    try {
      const res = await api<{
        client_name: string | null;
        notes: string | null;
        items: Item[];
      }>("/ai/draft-invoice", {
        method: "POST",
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });

      if (res.items && res.items.length > 0) {
        setItems(res.items);
      }
      if (res.notes) {
        setNotes(res.notes);
      }
      if (res.client_name) {
        // match client if possible
        const matched = clients.find(
          (c) =>
            c.name.toLowerCase().includes(res.client_name!.toLowerCase()) ||
            (c.company && c.company.toLowerCase().includes(res.client_name!.toLowerCase()))
        );
        if (matched) {
          setClientId(String(matched.id));
        }
      }
      toast.success("AI drafted your line items! Review and customize them below.");
      setIsAiModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate draft with AI.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit() {
    if (!clientId) {
      setError("Please select or create a client.");
      return;
    }
    if (items.some((it) => !it.description.trim())) {
      setError("Please add a description for every line item.");
      return;
    }
    if (items.some((it) => Number(it.quantity) <= 0)) {
      setError("Quantity must be greater than zero for all line items.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const created = await api("/invoices", {
        method: "POST",
        body: JSON.stringify({
          client_id: Number(clientId),
          issue_date: issueDate,
          due_date: dueDate,
          notes: notes.trim() || null,
          tax_rate: Number(taxRate) || 0,
          discount: Number(effectiveDiscount) || 0,
          items: items.map((it) => ({
            description: it.description.trim(),
            quantity: Number(it.quantity),
            rate: Number(it.rate),
          })),
        }),
      });

      toast.success(`Invoice ${created.number} created successfully.`);
      router.push(`/invoices/${created.id}`);
    } catch (err: any) {
      setError(err.message || "Could not save invoice.");
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/invoices"
            className="inline-flex items-center gap-1 text-xs font-bold text-ink/50 hover:text-ink transition"
          >
            <ArrowLeftIcon className="size-3.5" />
            Back to invoices
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Create new invoice.
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setIsAiModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-cobalt/20 bg-cobalt/10 px-4 py-2 text-xs font-bold text-cobalt hover:bg-cobalt/20 transition"
        >
          <SparklesIcon className="size-4" />
          <span>Draft with AI</span>
        </button>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_360px]">
        {/* Main Editor Section */}
        <section className="space-y-6">
          {/* Client & Date Card */}
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-bold">Invoice Details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="label">Client *</label>
                {clients.length > 0 ? (
                  <select
                    className="input mt-1.5"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-1.5">
                    <Link
                      href="/clients"
                      className="btn-light w-full !py-2.5 text-xs font-bold text-cobalt"
                    >
                      + Add client first
                    </Link>
                  </div>
                )}
              </div>

              <div>
                <label className="label">Issue Date</label>
                <input
                  type="date"
                  className="input mt-1.5"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Due Date</label>
                <input
                  type="date"
                  className="input mt-1.5"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Line Items Card */}
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Line Items</h2>
              <span className="text-xs font-medium text-ink/45">
                Amounts in {currency}
              </span>
            </div>

            <div className="mt-4">
              <div className="mb-2 hidden grid-cols-[1fr_90px_110px_100px_40px] gap-3 text-[10px] font-bold uppercase tracking-wider text-ink/45 md:grid">
                <span>Description</span>
                <span>Qty</span>
                <span>Rate ({currency})</span>
                <span className="text-right">Line Total</span>
                <span />
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => {
                  const lineTotal = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-1 gap-2 rounded-2xl border border-ink/8 p-3 md:grid-cols-[1fr_90px_110px_100px_40px] md:items-center md:border-0 md:p-0"
                    >
                      <input
                        className="input"
                        placeholder="Description of service or deliverable…"
                        value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                      />
                      <div className="flex items-center gap-2 md:block">
                        <span className="text-xs font-bold text-ink/50 md:hidden">Qty:</span>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          className="input"
                          value={item.quantity || ""}
                          onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2 md:block">
                        <span className="text-xs font-bold text-ink/50 md:hidden">Rate:</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="input"
                          value={item.rate || ""}
                          onChange={(e) => updateItem(idx, "rate", e.target.value)}
                        />
                      </div>
                      <div className="flex items-center justify-between font-mono text-sm font-bold text-ink md:justify-end">
                        <span className="text-xs font-sans font-bold text-ink/50 md:hidden">Amount:</span>
                        <span>{money(lineTotal, currency)}</span>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="rounded-lg p-2 text-ink/30 hover:bg-red-50 hover:text-red-600 transition"
                          title="Remove item"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={addItem}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-cobalt hover:underline"
              >
                <PlusIcon className="size-4" />
                Add another item
              </button>
            </div>
          </div>

          {/* Notes Card */}
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
            <label className="label">Notes / Payment Terms (Optional)</label>
            <textarea
              className="input mt-2 min-h-24 leading-relaxed"
              placeholder="e.g. Thank you for your business! Payment is due within 14 days via bank wire or credit card."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </section>

        {/* Sidebar Summary & Save Card */}
        <aside className="space-y-6">
          <div className="rounded-3xl bg-ink p-7 text-white shadow-xl">
            <p className="eyebrow text-lime">Invoice Summary</p>

            <div className="mt-6 space-y-3.5 text-sm text-white/75">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-white">
                  {money(subtotal, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">Discount</span>
                  <div className="inline-flex rounded-md bg-white/10 p-0.5 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setDiscountType("percent")}
                      className={`px-1.5 py-0.5 rounded transition ${
                        discountType === "percent"
                          ? "bg-lime text-ink font-extrabold"
                          : "text-white/60 hover:text-white"
                      }`}
                      title="Discount as percentage"
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("fixed")}
                      className={`px-1.5 py-0.5 rounded transition ${
                        discountType === "fixed"
                          ? "bg-lime text-ink font-extrabold"
                          : "text-white/60 hover:text-white"
                      }`}
                      title="Discount as fixed amount"
                    >
                      {currency === "USD" ? "$" : currency}
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  max={discountType === "percent" ? "100" : undefined}
                  step="any"
                  className="w-24 rounded-lg bg-white/10 px-2.5 py-1 text-right font-mono text-sm text-white outline-none focus:bg-white/20"
                  value={discountValue || ""}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  placeholder={discountType === "percent" ? "0%" : "0.00"}
                />
              </div>

              {effectiveDiscount > 0 && (
                <div className="flex justify-between text-xs text-green-400">
                  <span>
                    Discount applied {discountType === "percent" && `(${discountValue}%)`}
                  </span>
                  <span className="font-mono">-{money(effectiveDiscount, currency)}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs">Tax (%)</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="w-24 rounded-lg bg-white/10 px-2.5 py-1 text-right font-mono text-sm text-white outline-none focus:bg-white/20"
                  value={taxRate || ""}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  placeholder="0%"
                />
              </div>

              {calculatedTax > 0 && (
                <div className="flex justify-between text-xs text-white/60">
                  <span>Calculated Tax</span>
                  <span className="font-mono">{money(calculatedTax, currency)}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/15 pt-5">
              <span className="font-display text-lg font-bold">Total Due</span>
              <span className="font-display text-2xl font-bold text-lime">
                {money(total, currency)}
              </span>
            </div>

            {error && (
              <div className="mt-4 rounded-xl bg-red-500/20 border border-red-400/30 p-3 text-xs font-semibold text-red-200">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="mt-6 w-full rounded-full bg-lime py-3.5 text-center text-sm font-bold text-ink transition hover:bg-[#c9f548] active:scale-[0.98]"
            >
              {saving ? "Creating invoice…" : "Save & View Invoice"}
            </button>
          </div>
        </aside>
      </div>

      {/* AI Draft Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-ink/10 bg-white p-7 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cobalt">
                <SparklesIcon className="size-6" />
                <h3 className="font-display text-xl font-bold text-ink">
                  AI Invoice Assistant
                </h3>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="rounded-xl p-2 text-ink/40 hover:bg-ink/5"
              >
                <XMarkIcon className="size-5" />
              </button>
            </div>

            <p className="mt-2 text-xs text-ink/60">
              Describe what work you did, quantities, rates, and for whom in plain English.
            </p>

            <div className="mt-4">
              <textarea
                className="input min-h-28 text-sm"
                placeholder="e.g. Invoice Acme Corp for website redesign with 20 hours at $100/hr, plus brand identity guide for $1500"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
            </div>

            <div className="mt-5 flex justify-end gap-3 border-t border-ink/10 pt-4">
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="btn-light !px-4 !py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAiDraft}
                disabled={aiLoading || !aiPrompt.trim()}
                className="btn-dark !px-5 !py-2 text-xs"
              >
                {aiLoading ? "Generating draft…" : "Populate Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

