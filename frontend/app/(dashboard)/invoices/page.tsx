"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, formatDate, money, toast } from "@/lib/api";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  DocumentTextIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

type ClientOption = {
  id: number;
  name: string;
  company: string | null;
};

type InvoiceListItem = {
  id: number;
  number: string;
  status: "draft" | "sent" | "paid" | "overdue";
  issue_date: string;
  due_date: string;
  total: number;
  public_token: string;
  client: {
    id: number;
    name: string;
    email: string;
    company: string | null;
  };
};

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("USD");

  // Server-side filter states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [clientIdFilter, setClientIdFilter] = useState("");
  const [sortKey, setSortKey] = useState("newest");

  // Load clients and user settings once
  useEffect(() => {
    api<ClientOption[]>("/clients")
      .then(setClients)
      .catch(() => {});
    api("/settings")
      .then((s) => s.currency && setCurrency(s.currency))
      .catch(() => {});
  }, []);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (clientIdFilter) params.set("client_id", clientIdFilter);
      if (sortKey) params.set("sort", sortKey);

      const data = await api<InvoiceListItem[]>(`/invoices?${params.toString()}`);
      setInvoices(data);
    } catch (err: any) {
      if (err.message?.includes("Invalid session") || err.message?.includes("unauthorized")) {
        router.push("/login");
      } else {
        toast.error("Could not load invoices.");
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, clientIdFilter, sortKey, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInvoices();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadInvoices]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="badge badge-paid">Paid</span>;
      case "overdue":
        return <span className="badge badge-overdue">Overdue</span>;
      case "sent":
        return <span className="badge badge-sent">Sent</span>;
      default:
        return <span className="badge badge-draft">Draft</span>;
    }
  };

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-cobalt">Invoices</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Keep the money moving.
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            Create, track, send, and collect on all client invoices.
          </p>
        </div>
        <Link href="/invoices/new" className="btn-dark shadow-sm">
          <PlusIcon className="size-4 stroke-[2.5]" />
          <span>New invoice</span>
        </Link>
      </header>

      {/* Filter & Search Toolbar (Server-side) */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3.5 top-3.5 size-4 text-ink/40" />
          <input
            className="input pl-10"
            placeholder="Search invoice or client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            className="input cursor-pointer appearance-none bg-white pr-8"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <FunnelIcon className="pointer-events-none absolute right-3.5 top-3.5 size-4 text-ink/40" />
        </div>

        {/* Client Filter */}
        <div className="relative">
          <select
            className="input cursor-pointer appearance-none bg-white pr-8"
            value={clientIdFilter}
            onChange={(e) => setClientIdFilter(e.target.value)}
          >
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.company ? `(${c.company})` : ""}
              </option>
            ))}
          </select>
          <FunnelIcon className="pointer-events-none absolute right-3.5 top-3.5 size-4 text-ink/40" />
        </div>

        {/* Sorting */}
        <div className="relative">
          <select
            className="input cursor-pointer appearance-none bg-white pr-8"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
          >
            <option value="newest">Sort: Newest created</option>
            <option value="oldest">Sort: Oldest created</option>
            <option value="due">Sort: Due date</option>
            <option value="amount_desc">Sort: Amount (High → Low)</option>
            <option value="amount_asc">Sort: Amount (Low → High)</option>
            <option value="number">Sort: Invoice number</option>
          </select>
          <ArrowsUpDownIcon className="pointer-events-none absolute right-3.5 top-3.5 size-4 text-ink/40" />
        </div>
      </div>

      {/* Invoice Table / Cards */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-sm">
        <div className="hidden grid-cols-[1.4fr_1fr_1.1fr_1fr_1.1fr] items-center gap-4 border-b border-ink/10 bg-paper/60 px-6 py-4 text-xs font-bold uppercase tracking-wider text-ink/45 md:grid">
          <span>Client</span>
          <span>Invoice #</span>
          <span>Issue / Due Date</span>
          <span>Status</span>
          <span className="text-right">Total Amount</span>
        </div>

        {loading ? (
          <div className="divide-y divide-ink/8">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex items-center justify-between p-6">
                <div className="space-y-2">
                  <div className="skeleton h-5 w-40" />
                  <div className="skeleton h-4 w-28" />
                </div>
                <div className="skeleton h-6 w-20" />
                <div className="skeleton h-6 w-24" />
              </div>
            ))}
          </div>
        ) : invoices.length > 0 ? (
          <div className="divide-y divide-ink/8">
            {invoices.map((i) => (
              <Link
                key={i.id}
                href={`/invoices/${i.id}`}
                className="group grid grid-cols-1 gap-3 p-5 transition hover:bg-paper/80 md:grid-cols-[1.4fr_1fr_1.1fr_1fr_1.1fr] md:items-center md:px-6 md:py-5"
              >
                {/* Client Info */}
                <div>
                  <p className="font-display font-bold text-ink group-hover:text-cobalt transition">
                    {i.client.name}
                  </p>
                  <p className="text-xs text-ink/50">
                    {i.client.company || i.client.email}
                  </p>
                </div>

                {/* Number */}
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm font-bold text-ink">
                    {i.number}
                  </span>
                </div>

                {/* Dates */}
                <div className="text-xs text-ink/65">
                  <p>Due: <span className="font-medium text-ink">{formatDate(i.due_date)}</span></p>
                  <p className="text-[11px] text-ink/45">Issued: {formatDate(i.issue_date)}</p>
                </div>

                {/* Status */}
                <div>
                  {getStatusBadge(i.status)}
                </div>

                {/* Amount & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-3">
                  <div className="text-right">
                    <p className="font-display text-lg font-bold text-ink">
                      {money(i.total, currency)}
                    </p>
                  </div>
                  <ArrowTopRightOnSquareIcon className="hidden size-4 text-ink/30 group-hover:text-ink md:block transition" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-ink/5 text-ink/40">
              <DocumentTextIcon className="size-6" />
            </div>
            <h3 className="mt-4 font-display text-xl font-bold">
              {search || statusFilter || clientIdFilter ? "No matching invoices found" : "No invoices created yet"}
            </h3>
            <p className="mt-1.5 text-sm text-ink/55 max-w-sm mx-auto">
              {search || statusFilter || clientIdFilter
                ? "Try adjusting your search filters or clear them to see all invoices."
                : "Create an invoice for any client and share a direct payment link in seconds."}
            </p>
            {!search && !statusFilter && !clientIdFilter && (
              <Link href="/invoices/new" className="btn-dark mt-6 inline-flex">
                <PlusIcon className="size-4" />
                <span>Create first invoice</span>
              </Link>
            )}
          </div>
        )}
      </section>
    </>
  );
}

