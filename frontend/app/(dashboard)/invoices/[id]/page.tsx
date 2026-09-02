"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, apiUrl, formatDate, money, toast } from "@/lib/api";
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  TrashIcon,
  LinkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

type InvoiceItem = {
  id: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
};

type InvoiceData = {
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
  items: InvoiceItem[];
};

type BusinessSettings = {
  business_name: string;
  logo_url: string | null;
  currency: string;
  invoice_prefix: string;
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [business, setBusiness] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      api<InvoiceData>(`/invoices/${id}`),
      api<BusinessSettings>("/settings").catch(() => ({
        business_name: "BillFlow Studio",
        logo_url: null,
        currency: "USD",
        invoice_prefix: "INV",
      })),
    ])
      .then(([invData, bizData]) => {
        setInvoice(invData);
        setBusiness(bizData);
      })
      .catch((err) => {
        toast.error("Could not load invoice.");
        router.push("/invoices");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const currency = business?.currency || "USD";

  async function handleSend() {
    if (!invoice) return;
    setSending(true);

    try {
      const res = await api<{
        share_url: string;
        public_token: string;
        status: "draft" | "sent" | "paid" | "overdue";
        message: string;
      }>(`/invoices/${invoice.id}/send`, { method: "POST" });

      const fullShareUrl = `${window.location.origin}/pay/${res.public_token}`;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullShareUrl);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      setInvoice({ ...invoice, status: res.status });
      toast.success("Public link copied to clipboard & invoice marked as sent!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate share link.");
    } finally {
      setSending(false);
    }
  }

  async function handleCopyLinkOnly() {
    if (!invoice) return;
    const fullShareUrl = `${window.location.origin}/pay/${invoice.public_token}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(fullShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast.success("Public payment link copied to clipboard!");
    }
  }

  async function handleDelete() {
    if (!invoice) return;
    setDeleting(true);

    try {
      await api(`/invoices/${invoice.id}`, { method: "DELETE" });
      toast.success(`Invoice ${invoice.number} deleted.`);
      router.push("/invoices");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete invoice.");
      setDeleting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="badge badge-paid">PAID</span>;
      case "overdue":
        return <span className="badge badge-overdue">OVERDUE</span>;
      case "sent":
        return <span className="badge badge-sent">SENT</span>;
      default:
        return <span className="badge badge-draft">DRAFT</span>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-[600px] rounded-[2.5rem]" />
      </div>
    );
  }

  if (!invoice) return null;

  const publicUrl = `/pay/${invoice.public_token}`;

  return (
    <>
      {/* Top Header & Actions (hidden during print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/invoices"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/50 hover:text-ink transition"
          >
            <ArrowLeftIcon className="size-3.5" />
            Back to invoices
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              {invoice.number}
            </h1>
            {getStatusBadge(invoice.status)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Public Page */}
          <Link
            href={publicUrl}
            target="_blank"
            className="btn-light !px-3.5 !py-2.5 text-xs font-bold"
            title="Open public payment page"
          >
            <EyeIcon className="size-4" />
            <span>Public Page</span>
          </Link>

          {/* Edit Invoice */}
          <Link
            href={`/invoices/${invoice.id}/edit`}
            className="btn-light !px-3.5 !py-2.5 text-xs font-bold"
          >
            <PencilSquareIcon className="size-4" />
            <span>Edit</span>
          </Link>

          {/* Print / PDF */}
          <button
            onClick={handlePrint}
            className="btn-light !px-3.5 !py-2.5 text-xs font-bold"
          >
            <ArrowDownTrayIcon className="size-4" />
            <span>Print / PDF</span>
          </button>

          {/* Send / Copy Link Button */}
          <button
            onClick={invoice.status === "draft" ? handleSend : handleCopyLinkOnly}
            disabled={sending}
            className="btn-dark !px-4 !py-2.5 text-xs font-bold shadow-sm"
          >
            {copied ? (
              <>
                <CheckIcon className="size-4 text-lime" />
                <span>Link Copied!</span>
              </>
            ) : invoice.status === "draft" ? (
              <>
                <PaperAirplaneIcon className="size-4" />
                <span>Send & Copy Link</span>
              </>
            ) : (
              <>
                <LinkIcon className="size-4" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          {/* Delete Invoice */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="rounded-xl border border-ink/10 p-2 text-ink/40 hover:bg-red-50 hover:text-red-600 transition"
            title="Delete invoice"
          >
            <TrashIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* Main Invoice Card (Prints cleanly as high-quality document) */}
      <article className="print-container mx-auto mt-8 max-w-4xl rounded-[2.5rem] border border-ink/10 bg-white p-8 shadow-soft md:p-14">
        {/* Invoice Header */}
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-ink/10 pb-8">
          <div>
            {business?.logo_url ? (
              <img
                src={
                  business.logo_url.startsWith("http")
                    ? business.logo_url
                    : `${apiUrl}${business.logo_url}`
                }
                alt={business.business_name}
                className="h-12 max-w-[200px] object-contain"
              />
            ) : (
              <div className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
                {business?.business_name || "BillFlow Studio"}
              </div>
            )}
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-ink/45">
              Invoice #{invoice.number}
            </p>
          </div>

          <div className="text-left md:text-right">
            <div className="inline-block">{getStatusBadge(invoice.status)}</div>
            <div className="mt-3 space-y-1 text-xs text-ink/65">
              <p>
                Issue Date: <strong className="text-ink">{formatDate(invoice.issue_date)}</strong>
              </p>
              <p>
                Due Date: <strong className="text-ink">{formatDate(invoice.due_date)}</strong>
              </p>
              {invoice.paid_at && (
                <p className="text-green-700 font-bold">
                  Paid On: {formatDate(invoice.paid_at)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Client & Billing Info */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="label text-[10px] text-ink/40">Billed To</p>
            <h3 className="mt-2 font-display text-xl font-bold text-ink">
              {invoice.client.name}
            </h3>
            {invoice.client.company && (
              <p className="text-sm font-semibold text-ink/75">{invoice.client.company}</p>
            )}
            {invoice.client.address && (
              <p className="mt-1 text-xs text-ink/60 whitespace-pre-line leading-relaxed">
                {invoice.client.address}
              </p>
            )}
            <p className="mt-1 text-xs text-ink/50">{invoice.client.email}</p>
            {invoice.client.phone && (
              <p className="text-xs text-ink/50">{invoice.client.phone}</p>
            )}
          </div>
        </div>

        {/* Line Items Table */}
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

        {/* Totals Calculation */}
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

        {/* Notes / Footer */}
        {invoice.notes && (
          <div className="mt-12 rounded-2xl bg-paper/70 p-5 border border-ink/8 text-xs text-ink/70">
            <p className="label text-[10px] text-ink/40 mb-1">Payment Instructions & Notes</p>
            <p className="leading-relaxed whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
      </article>

      {/* Delete Invoice Modal */}
      {showDeleteModal && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-7 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <div className="grid size-10 place-items-center rounded-2xl bg-red-50">
                <ExclamationTriangleIcon className="size-6" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-ink">Delete Invoice</h3>
                <p className="text-xs text-ink/55">This action cannot be undone.</p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-ink/75">
              Are you sure you want to delete invoice <strong className="text-ink">{invoice.number}</strong> for {invoice.client.name}?
            </p>

            <div className="mt-6 flex justify-end gap-3 border-t border-ink/10 pt-4">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="btn-light !px-4 !py-2 text-xs"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="btn bg-red-600 text-white hover:bg-red-700 !px-5 !py-2 text-xs font-bold"
              >
                {deleting ? "Deleting…" : "Yes, delete invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

