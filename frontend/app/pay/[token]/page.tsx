"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, apiUrl, formatDate, money, toast } from "@/lib/api";
import {
  CheckCircleIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  BuildingOfficeIcon,
  XMarkIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

type PublicInvoice = {
  id: number;
  number: string;
  status: "draft" | "sent" | "paid" | "overdue";
  issue_date: string;
  due_date: string;
  notes: string | null;
  tax_rate: number;
  discount: number;
  subtotal: number;
  total: number;
  public_token: string;
  paid_at: string | null;
  client: {
    id: number;
    name: string;
    email: string;
    company: string | null;
    address: string | null;
    phone: string | null;
  };
  business: {
    business_name: string;
    logo_url: string | null;
    currency: string;
    invoice_prefix: string;
  };
  items: Array<{
    id: number;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
};

export default function PublicInvoicePage() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<PublicInvoice | null | false>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!token) return;
    api<PublicInvoice>(`/public/invoices/${token}`)
      .then(setInvoice)
      .catch(() => setInvoice(false));
  }, [token]);

  async function handleConfirmPayment() {
    if (!token || !invoice) return;
    setPaying(true);

    try {
      const res = await api<{ status: string; message: string }>(
        `/public/invoices/${token}/pay`,
        { method: "POST" }
      );
      setInvoice({
        ...invoice,
        status: "paid",
        paid_at: new Date().toISOString(),
      });
      setIsPayModalOpen(false);
      toast.success("Payment simulated successfully! Invoice marked as PAID.");
    } catch (err: any) {
      toast.error(err.message || "Simulated payment failed.");
    } finally {
      setPaying(false);
    }
  }

  if (invoice === null) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper p-6">
        <div className="text-center space-y-3">
          <div className="skeleton mx-auto size-12 rounded-2xl" />
          <p className="font-display text-xl font-bold text-ink">Loading invoice…</p>
          <p className="text-xs text-ink/50">Fetching secure payment details</p>
        </div>
      </main>
    );
  }

  if (invoice === false) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper p-6">
        <div className="max-w-md rounded-3xl border border-ink/10 bg-white p-8 text-center shadow-soft">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-50 text-red-600">
            <XMarkIcon className="size-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-ink">Invoice Not Found</h1>
          <p className="mt-2 text-sm text-ink/60">
            This invoice link may be invalid, closed, or no longer available. Please check with the sender.
          </p>
        </div>
      </main>
    );
  }

  const currency = invoice.business.currency || "USD";
  const isPaid = invoice.status === "paid";

  return (
    <main className="gridline min-h-screen p-4 md:p-12">
      {/* Top action bar */}
      <div className="no-print mx-auto mb-6 flex max-w-4xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-lime text-xs font-sans font-bold text-ink">
            B
          </span>
          <span className="font-display font-bold text-ink">BillFlow Secure Invoice</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/portal?token=${token}`}
            className="btn-light !px-3.5 !py-2 text-xs font-bold text-cobalt hover:bg-cobalt/5"
          >
            <span>View All My Invoices (Portal) →</span>
          </Link>
          <button
            onClick={() => window.print()}
            className="btn-light !px-3.5 !py-2 text-xs font-bold"
          >
            <ArrowDownTrayIcon className="size-4" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>


      <article className="print-container mx-auto max-w-4xl rounded-[2.5rem] border border-ink/10 bg-white p-6 shadow-soft md:p-12">
        {/* Header with Business Name & Status */}
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-ink/10 pb-8">
          <div>
            {invoice.business.logo_url ? (
              <img
                src={
                  invoice.business.logo_url.startsWith("http")
                    ? invoice.business.logo_url
                    : `${apiUrl}${invoice.business.logo_url}`
                }
                alt={invoice.business.business_name}
                className="h-12 max-w-[200px] object-contain"
              />
            ) : (
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
                {invoice.business.business_name}
              </h1>
            )}
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-ink/45">
              Invoice #{invoice.number}
            </p>
          </div>

          <div className="text-left md:text-right">
            <span
              className={`inline-flex items-center rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider ${
                isPaid
                  ? "bg-lime text-ink"
                  : invoice.status === "overdue"
                  ? "bg-red-100 text-red-700"
                  : "bg-cobalt/10 text-cobalt"
              }`}
            >
              {invoice.status}
            </span>
            <div className="mt-3 space-y-1 text-xs text-ink/65">
              <p>
                Issued: <strong className="text-ink">{formatDate(invoice.issue_date)}</strong>
              </p>
              <p>
                Due: <strong className="text-ink">{formatDate(invoice.due_date)}</strong>
              </p>
              {invoice.paid_at && (
                <p className="font-bold text-green-700">
                  Paid On: {formatDate(invoice.paid_at)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Client Billing Info */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="label text-[10px] text-ink/40">Billed To</p>
            <h3 className="mt-1.5 font-display text-xl font-bold text-ink">
              {invoice.client.name}
            </h3>
            {invoice.client.company && (
              <p className="text-sm font-semibold text-ink/75">{invoice.client.company}</p>
            )}
            {invoice.client.address && (
              <p className="mt-1 text-xs leading-relaxed text-ink/60 whitespace-pre-line">
                {invoice.client.address}
              </p>
            )}
            <p className="mt-1 text-xs text-ink/50">{invoice.client.email}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mt-10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-[10px] font-bold uppercase tracking-wider text-ink/45">
                <th className="pb-3 font-bold">Description</th>
                <th className="pb-3 text-center font-bold w-16">Qty</th>
                <th className="pb-3 text-right font-bold w-28">Rate</th>
                <th className="pb-3 text-right font-bold w-32">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/8">
              {invoice.items.map((it) => (
                <tr key={it.id}>
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-ink">{it.description}</p>
                  </td>
                  <td className="py-4 text-center text-xs text-ink/70">
                    {it.quantity}
                  </td>
                  <td className="py-4 text-right font-mono text-xs text-ink/70">
                    {money(it.rate, currency)}
                  </td>
                  <td className="py-4 text-right font-mono font-bold text-ink">
                    {money(it.amount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown */}
        <div className="mt-8 flex justify-end border-t border-ink/10 pt-6">
          <div className="w-full max-w-xs space-y-2.5 text-xs text-ink/70">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono font-semibold text-ink">
                {money(invoice.subtotal, currency)}
              </span>
            </div>

            {invoice.discount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Discount</span>
                <span className="font-mono font-semibold">
                  -{money(invoice.discount, currency)}
                </span>
              </div>
            )}

            {invoice.tax_rate > 0 && (
              <div className="flex justify-between">
                <span>Tax ({invoice.tax_rate}%)</span>
                <span className="font-mono font-semibold text-ink">
                  {money(
                    Math.max(0, invoice.subtotal - invoice.discount) *
                      (invoice.tax_rate / 100),
                    currency
                  )}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-ink pt-4 font-display text-xl font-bold text-ink">
              <span>Total Due</span>
              <span className="text-2xl font-bold">
                {money(invoice.total, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8 rounded-2xl bg-paper/70 p-5 border border-ink/8 text-xs text-ink/70">
            <p className="label text-[10px] text-ink/40 mb-1">Notes from {invoice.business.business_name}</p>
            <p className="leading-relaxed whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}

        {/* Payment CTA or Paid Receipt Box */}
        <div className="no-print mt-10">
          {isPaid ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-lime p-6 text-center shadow-sm">
              <CheckCircleIcon className="size-9 text-ink" />
              <h3 className="font-display text-xl font-bold text-ink">
                This invoice has been paid in full
              </h3>
              <p className="text-xs font-semibold text-ink/70">
                Thank you for your business! A confirmation record has been logged.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl bg-ink p-7 text-center text-white shadow-xl">
              <div className="mx-auto flex max-w-sm flex-col items-center">
                <ShieldCheckIcon className="size-8 text-lime" />
                <h3 className="mt-3 font-display text-2xl font-bold">
                  Pay {money(invoice.total, currency)}
                </h3>
                <p className="mt-1 text-xs text-white/65">
                  Instant simulated checkout · No credit card charge
                </p>

                <button
                  onClick={() => setIsPayModalOpen(true)}
                  className="btn mt-6 w-full rounded-full bg-lime py-4 text-sm font-bold text-ink transition hover:bg-[#c9f548] active:scale-[0.98]"
                >
                  <CreditCardIcon className="size-5" />
                  <span>Pay Invoice (Test Mode)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </article>

      {/* Simulated Payment Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-ink/10 bg-white p-7 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCardIcon className="size-6 text-cobalt" />
                <h3 className="font-display text-xl font-bold text-ink">
                  Simulated Checkout
                </h3>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="rounded-xl p-2 text-ink/40 hover:bg-ink/5"
              >
                <XMarkIcon className="size-5" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-paper p-4 text-xs">
              <div className="flex items-center gap-2 text-cobalt font-bold">
                <SparklesIcon className="size-4" />
                <span>Test Mode Simulation</span>
              </div>
              <p className="mt-1 text-ink/65 leading-relaxed">
                Clicking confirm will process this demo transaction and immediately mark invoice{" "}
                <strong>{invoice.number}</strong> as PAID in the backend database.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label className="label text-[10px]">Paying to</label>
                <p className="font-bold text-sm text-ink">{invoice.business.business_name}</p>
              </div>

              <div>
                <label className="label text-[10px]">Test Card</label>
                <div className="mt-1 flex items-center justify-between rounded-xl border border-ink/15 bg-paper/50 px-3.5 py-2.5 text-sm font-mono">
                  <span>•••• •••• •••• 4242</span>
                  <span className="text-xs font-sans font-bold text-ink/50">12/28</span>
                </div>
              </div>

              <div className="flex justify-between border-t border-ink/10 pt-3">
                <span className="text-sm font-bold text-ink">Total Amount</span>
                <span className="font-display text-lg font-bold text-ink">
                  {money(invoice.total, currency)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-ink/10 pt-4">
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="btn-light !px-4 !py-2 text-xs"
                disabled={paying}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={paying}
                className="btn-dark !px-5 !py-2 text-xs"
              >
                {paying ? "Processing Payment…" : `Pay ${money(invoice.total, currency)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

