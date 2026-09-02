"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, money, toast } from "@/lib/api";
import {
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

type Client = {
  id: number;
  name: string;
  company: string | null;
  email: string;
};

type Item = {
  id?: number;
  description: string;
  quantity: number;
  rate: number;
};

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [status, setStatus] = useState<string>("draft");
  const [notes, setNotes] = useState<string>("");
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [currency, setCurrency] = useState<string>("USD");
  const [items, setItems] = useState<Item[]>([
    { description: "", quantity: 1, rate: 0 },
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<Client[]>("/clients"),
      api(`/invoices/${id}`),
      api("/settings").catch(() => ({ currency: "USD" })),
    ])
      .then(([clientsData, invoiceData, settingsData]) => {
        setClients(clientsData);
        setClientId(String(invoiceData.client.id));
        setInvoiceNumber(invoiceData.number);
        setIssueDate(invoiceData.issue_date);
        setDueDate(invoiceData.due_date);
        setStatus(invoiceData.status);
        setNotes(invoiceData.notes || "");
        setTaxRate(invoiceData.tax_rate || 0);
        setDiscount(invoiceData.discount || 0);
        if (settingsData?.currency) setCurrency(settingsData.currency);
        if (invoiceData.items && invoiceData.items.length > 0) {
          setItems(
            invoiceData.items.map((it: any) => ({
              description: it.description,
              quantity: it.quantity,
              rate: it.rate,
            }))
          );
        }
      })
      .catch((err: any) => {
        toast.error("Could not load invoice.");
        router.push("/invoices");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
    0
  );
  const discountedBase = Math.max(0, subtotal - (Number(discount) || 0));
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

  async function handleSave() {
    if (!clientId) {
      setError("Please select a client.");
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
      await api(`/invoices/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          client_id: Number(clientId),
          issue_date: issueDate,
          due_date: dueDate,
          notes: notes.trim() || null,
          tax_rate: Number(taxRate) || 0,
          discount: Number(discount) || 0,
          status: status,
          items: items.map((it) => ({
            description: it.description.trim(),
            quantity: Number(it.quantity),
            rate: Number(it.rate),
          })),
        }),
      });

      toast.success(`Invoice ${invoiceNumber} updated.`);
      router.push(`/invoices/${id}`);
    } catch (err: any) {
      setError(err.message || "Could not update invoice.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-80 rounded-3xl" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`/invoices/${id}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-ink/50 hover:text-ink transition"
          >
            <ArrowLeftIcon className="size-3.5" />
            Back to invoice
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Edit {invoiceNumber}
          </h1>
        </div>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_360px]">
        {/* Main Editor Section */}
        <section className="space-y-6">
          {/* Client & Date Card */}
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-bold">Invoice Details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Client *</label>
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
            <label className="label">Notes / Payment Terms</label>
            <textarea
              className="input mt-2 min-h-24 leading-relaxed"
              placeholder="e.g. Thanks for your business!"
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
                <span className="text-xs">Discount ({currency})</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="w-24 rounded-lg bg-white/10 px-2.5 py-1 text-right font-mono text-sm text-white outline-none focus:bg-white/20"
                  value={discount || ""}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>

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
              <span className="font-display text-lg font-bold">Total</span>
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
              onClick={handleSave}
              disabled={saving}
              className="mt-6 w-full rounded-full bg-lime py-3.5 text-center text-sm font-bold text-ink transition hover:bg-[#c9f548] active:scale-[0.98]"
            >
              {saving ? "Saving changes…" : "Save changes"}
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}

