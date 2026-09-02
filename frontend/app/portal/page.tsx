"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BuildingOffice2Icon,
  CheckBadgeIcon,
  CheckCircleIcon,
  CreditCardIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  XMarkIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { api, formatDate, money, toast } from "@/lib/api";

interface PortalInvoiceItem {
  id: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface PortalInvoice {
  id: number;
  number: string;
  issue_date: string;
  due_date: string;
  status: string;
  tax_rate: number;
  discount: number;
  subtotal: number;
  total: number;
  notes?: string;
  public_token: string;
  paid_at?: string;
  created_at: string;
  items: PortalInvoiceItem[];
  business_name: string;
  business_logo?: string;
  currency: string;
}

interface PortalMetrics {
  total_due: number;
  total_paid: number;
  unpaid_count: number;
  paid_count: number;
  brands_count: number;
}

interface PortalData {
  client_name: string;
  client_email: string;
  client_company?: string;
  metrics: PortalMetrics;
  brands: string[];
  invoices: PortalInvoice[];
}

const DEMO_PROFILES = [
  { name: "Maya Chen", email: "maya@lumencollective.com", company: "Lumen Collective" },
  { name: "David Sterling", email: "david@sterlingventures.io", company: "Sterling Ventures" },
  { name: "Elena Rostova", email: "elena@aurorabrand.co", company: "Aurora Creative Labs" },
  { name: "Marcus Vance", email: "marcus@vancemedia.com", company: "Vance Media Group" },
];

function ClientPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlEmail = searchParams.get("email");
  const urlToken = searchParams.get("token");

  const [emailInput, setEmailInput] = useState(urlEmail || "");
  const [activeEmail, setActiveEmail] = useState(urlEmail || "");
  const [activeToken, setActiveToken] = useState(urlToken || "");

  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & selection
  const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());

  // Payment modal state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  const loadPortal = async (email?: string, token?: string) => {
    const targetEmail = email !== undefined ? email : activeEmail;
    const targetToken = token !== undefined ? token : activeToken;

    if (!targetEmail && !targetToken) return;

    setLoading(true);
    setError(null);
    try {
      const query = targetToken
        ? `token=${encodeURIComponent(targetToken)}`
        : `email=${encodeURIComponent(targetEmail)}`;
      const res = await api.get<PortalData>(`/public/portal?${query}`);
      setPortalData(res);
      if (res.client_email) {
        setActiveEmail(res.client_email);
        setEmailInput(res.client_email);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load invoices. Please check the email address or link.");
      setPortalData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlToken) {
      loadPortal(undefined, urlToken);
    } else if (urlEmail) {
      loadPortal(urlEmail);
    } else {
      // Default to Maya Chen demo profile for instant preview
      setActiveEmail("maya@lumencollective.com");
      setEmailInput("maya@lumencollective.com");
      loadPortal("maya@lumencollective.com");
    }
  }, [urlEmail, urlToken]);

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setActiveEmail(emailInput.trim());
    setActiveToken("");
    setSelectedTokens(new Set());
    loadPortal(emailInput.trim(), "");
  };

  const selectDemoProfile = (email: string) => {
    setEmailInput(email);
    setActiveEmail(email);
    setActiveToken("");
    setSelectedTokens(new Set());
    loadPortal(email, "");
  };

  // Filtered invoices
  const filteredInvoices = (portalData?.invoices || []).filter((inv) => {
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "paid"
        ? inv.status === "paid"
        : inv.status !== "paid";

    const matchesBrand =
      selectedBrand === "all" ? true : inv.business_name === selectedBrand;

    const matchesSearch =
      searchQuery.trim() === ""
        ? true
        : inv.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inv.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inv.items.some((it) => it.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesBrand && matchesSearch;
  });

  const unpaidInvoices = (portalData?.invoices || []).filter((inv) => inv.status !== "paid");

  // Selection handlers
  const toggleSelect = (token: string) => {
    const next = new Set(selectedTokens);
    if (next.has(token)) {
      next.delete(token);
    } else {
      next.add(token);
    }
    setSelectedTokens(next);
  };

  const toggleSelectAllUnpaid = () => {
    if (selectedTokens.size === unpaidInvoices.length && unpaidInvoices.length > 0) {
      setSelectedTokens(new Set());
    } else {
      setSelectedTokens(new Set(unpaidInvoices.map((inv) => inv.public_token)));
    }
  };

  const selectedInvoicesList = (portalData?.invoices || []).filter((inv) =>
    selectedTokens.has(inv.public_token)
  );
  const selectedTotalAmount = selectedInvoicesList.reduce((sum, inv) => sum + inv.total, 0);

  // Batch Payment Execution
  const handleExecuteBatchPayment = async () => {
    if (selectedTokens.size === 0) return;
    setIsPaying(true);
    try {
      const res = await api.post<{ success: boolean; paid_count: number; total_amount: number; message: string }>(
        "/public/portal/batch-pay",
        {
          invoice_tokens: Array.from(selectedTokens),
          payment_method: "simulated_corporate_card",
        }
      );

      setPaymentSuccess(res.message);
      toast.success(res.message);
      setSelectedTokens(new Set());
      await loadPortal();
    } catch (err: any) {
      toast.error(err?.message || "Payment processing failed. Please try again.");
    } finally {
      setIsPaying(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("billflow_client_email");
    }
    toast.info("Logged out of client portal.");
    router.push("/login?role=client");
  };

  return (
    <main className="min-h-screen bg-[#fafaf9] text-ink pb-32">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
              <span className="grid size-7 place-items-center rounded-lg bg-lime text-sm font-sans font-bold text-ink">
                B
              </span>
              BillFlow
            </Link>
            <span className="rounded-full bg-cobalt/10 px-2.5 py-0.5 text-[11px] font-bold text-cobalt">
              Client Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            {portalData?.client_email && (
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-ink/10 bg-paper px-3 py-1 text-xs">
                <span className="size-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-bold text-ink">{portalData.client_name}</span>
                <span className="text-ink/40">({portalData.client_email})</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-ink/10 bg-white px-3 py-1.5 text-xs font-bold text-ink/70 hover:text-red-600 hover:border-red-200 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Hero & Profile Strip */}
      <div className="border-b border-ink/10 bg-white px-5 py-8 shadow-xs">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-cobalt/10 px-3 py-1 text-xs font-bold text-cobalt">
                <ShieldCheckIcon className="size-4" />
                Private Client Workspace
              </div>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink md:text-4xl">
                {portalData?.client_name ? `${portalData.client_name}'s Billing Hub` : "Client Billing Hub"}
              </h1>
              {portalData?.client_company && (
                <p className="mt-1 text-sm font-medium text-ink/60 flex items-center gap-1.5">
                  <BuildingOffice2Icon className="size-4 text-ink/40" />
                  {portalData.client_company} • <span className="text-ink/40">{portalData.client_email}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login?role=client"
                className="btn-light !py-2 !px-4 text-xs font-bold"
              >
                Switch Client Account
              </Link>
            </div>
          </div>
        </div>
      </div>


      <div className="mx-auto max-w-6xl px-5 pt-8">
        {/* Error Notification */}
        {error && (
          <div className="mb-8 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center gap-3">
            <ExclamationCircleIcon className="size-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="h-28 rounded-2xl bg-black/5 animate-pulse" />
              <div className="h-28 rounded-2xl bg-black/5 animate-pulse" />
              <div className="h-28 rounded-2xl bg-black/5 animate-pulse" />
            </div>
            <div className="h-64 rounded-2xl bg-black/5 animate-pulse" />
          </div>
        )}

        {/* Portal Dashboard Content */}
        {!loading && portalData && (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="card p-6 border-l-4 border-l-cobalt shadow-soft">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-ink/40">
                  <span>Balance Due</span>
                  <span className="rounded-full bg-cobalt/10 px-2 py-0.5 text-[10px] text-cobalt font-bold">
                    {portalData.metrics.unpaid_count} Pending
                  </span>
                </div>
                <p className="mt-3 font-display text-3xl font-bold text-ink">
                  {money(portalData.metrics.total_due)}
                </p>
                <p className="mt-1 text-xs text-ink/50">
                  Across {portalData.metrics.brands_count} freelance studios / brands
                </p>
              </div>

              <div className="card p-6 border-l-4 border-l-green-500 shadow-soft">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-ink/40">
                  <span>Total Paid & Settled</span>
                  <CheckBadgeIcon className="size-4 text-green-600" />
                </div>
                <p className="mt-3 font-display text-3xl font-bold text-ink">
                  {money(portalData.metrics.total_paid)}
                </p>
                <p className="mt-1 text-xs text-green-700 font-medium">
                  {portalData.metrics.paid_count} invoices completed
                </p>
              </div>

              <div className="card p-6 border-l-4 border-l-lime shadow-soft">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-ink/40">
                  <span>Billing Studios</span>
                  <BuildingOffice2Icon className="size-4 text-ink/40" />
                </div>
                <p className="mt-3 font-display text-3xl font-bold text-ink">
                  {portalData.metrics.brands_count}{" "}
                  <span className="text-sm font-sans font-normal text-ink/50">Brands</span>
                </p>
                <p className="mt-1 text-xs text-ink/50 truncate">
                  {portalData.brands.join(", ") || "No active brands"}
                </p>
              </div>
            </div>

            {/* Invoices List Section */}
            <div className="mt-8 space-y-4">
              {/* Filter Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-xs">
                {/* Status Tabs */}
                <div className="flex items-center gap-1.5 bg-paper p-1 rounded-xl border border-ink/5">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      statusFilter === "all" ? "bg-white text-ink shadow-xs" : "text-ink/60 hover:text-ink"
                    }`}
                  >
                    All ({portalData.invoices.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("unpaid")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      statusFilter === "unpaid" ? "bg-white text-ink shadow-xs" : "text-ink/60 hover:text-ink"
                    }`}
                  >
                    Unpaid Due ({portalData.metrics.unpaid_count})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("paid")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      statusFilter === "paid" ? "bg-white text-ink shadow-xs" : "text-ink/60 hover:text-ink"
                    }`}
                  >
                    Paid ({portalData.metrics.paid_count})
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Brand Filter */}
                  {portalData.brands.length > 1 && (
                    <div className="flex items-center gap-2 text-xs">
                      <FunnelIcon className="size-4 text-ink/40" />
                      <select
                        value={selectedBrand}
                        onChange={(e) => setSelectedBrand(e.target.value)}
                        className="rounded-xl border border-ink/10 bg-paper px-3 py-1.5 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                      >
                        <option value="all">
                          All Studios / Brands ({portalData.brands.length})
                        </option>
                        {portalData.brands.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Search Query */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search invoices..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-xl border border-ink/10 bg-paper py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-ink"
                    />
                    <MagnifyingGlassIcon className="absolute left-2.5 top-2 size-3.5 text-ink/40" />
                  </div>

                  {/* Select All Unpaid Toggle */}
                  {unpaidInvoices.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAllUnpaid}
                      className="rounded-xl border border-ink/10 bg-white px-3 py-1.5 text-xs font-bold text-ink hover:bg-paper transition"
                    >
                      {selectedTokens.size === unpaidInvoices.length
                        ? "Deselect All"
                        : "Select All Unpaid"}
                    </button>
                  )}
                </div>
              </div>

              {/* Invoices List Cards */}
              {filteredInvoices.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-ink/15 bg-white p-12 text-center">
                  <DocumentTextIcon className="mx-auto size-12 text-ink/20" />
                  <h3 className="mt-3 text-base font-bold text-ink">No invoices found</h3>
                  <p className="mt-1 text-xs text-ink/50">
                    No matching invoices for this filter criteria or client email.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredInvoices.map((inv) => {
                    const isPaid = inv.status === "paid";
                    const isSelected = selectedTokens.has(inv.public_token);

                    return (
                      <div
                        key={inv.id}
                        className={`card relative p-5 transition-all ${
                          isSelected
                            ? "ring-2 ring-cobalt bg-cobalt/[0.02]"
                            : "hover:border-ink/20"
                        }`}
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          {/* Checkbox & Details */}
                          <div className="flex items-start gap-4">
                            {!isPaid && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(inv.public_token)}
                                className="mt-1 size-5 rounded-md border-ink/20 text-cobalt focus:ring-cobalt cursor-pointer"
                              />
                            )}

                            <div>
                              <div className="flex flex-wrap items-center gap-2.5">
                                <span className="font-mono text-sm font-bold text-ink">
                                  {inv.number}
                                </span>
                                <span
                                  className={`badge ${
                                    inv.status === "paid"
                                      ? "badge-paid"
                                      : inv.status === "overdue"
                                      ? "badge-overdue"
                                      : "badge-sent"
                                  }`}
                                >
                                  {inv.status}
                                </span>
                                <span className="rounded-md bg-paper px-2 py-0.5 text-[11px] font-bold text-ink/70">
                                  {inv.business_name}
                                </span>
                              </div>

                              <p className="mt-1 text-xs text-ink/50">
                                Issued: {formatDate(inv.issue_date)} • Due:{" "}
                                <span className={inv.status === "overdue" ? "text-rose-600 font-bold" : ""}>
                                  {formatDate(inv.due_date)}
                                </span>
                              </p>

                              {/* Deliverables summary */}
                              <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {inv.items.map((it) => (
                                  <span
                                    key={it.id}
                                    className="inline-block rounded-md border border-ink/5 bg-paper px-2 py-0.5 text-[10px] text-ink/70"
                                  >
                                    {it.description} ({it.quantity}x @ ${it.rate})
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Price & Action Buttons */}
                          <div className="flex items-center justify-between gap-4 border-t border-ink/5 pt-3 md:border-0 md:pt-0">
                            <div className="text-right">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">
                                Total
                              </p>
                              <p className="font-display text-xl font-bold text-ink">
                                {money(inv.total, inv.currency)}
                              </p>
                              {isPaid && (
                                <p className="text-[10px] font-medium text-green-700 flex items-center justify-end gap-1">
                                  <CheckCircleIcon className="size-3" /> Paid {inv.paid_at ? formatDate(inv.paid_at) : "Settled"}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <Link
                                href={`/pay/${inv.public_token}`}
                                target="_blank"
                                className="btn-light !py-2 !px-3 text-xs font-semibold flex items-center gap-1.5"
                              >
                                <EyeIcon className="size-3.5" />
                                <span>View & PDF</span>
                              </Link>

                              {!isPaid && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTokens(new Set([inv.public_token]));
                                    setIsPayModalOpen(true);
                                  }}
                                  className="btn-dark !py-2 !px-3 text-xs font-bold flex items-center gap-1.5"
                                >
                                  <CreditCardIcon className="size-3.5" />
                                  <span>Pay Single</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Floating Sticky Batch Payment Toolbar */}
      {selectedTokens.size > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-50 px-5 pointer-events-none">
          <div className="mx-auto flex max-w-2xl items-center justify-between rounded-2xl border border-ink/10 bg-ink px-6 py-4 text-white shadow-soft pointer-events-auto backdrop-blur-md">
            <div>
              <p className="text-xs font-bold text-lime uppercase tracking-wider">
                {selectedTokens.size} {selectedTokens.size === 1 ? "Invoice" : "Invoices"} Selected
              </p>
              <p className="font-display text-2xl font-bold text-white">
                {money(selectedTotalAmount)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedTokens(new Set())}
                className="text-xs font-semibold text-white/60 hover:text-white"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsPayModalOpen(true)}
                className="btn bg-lime text-ink font-bold hover:bg-[#c9f548] !py-2.5 !px-5 text-sm shadow-md flex items-center gap-2"
              >
                <CreditCardIcon className="size-4 stroke-[2.5]" />
                <span>Pay Selected Invoices</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Invoice Batch Payment Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-lg p-6 shadow-soft animate-scale-in">
            {paymentSuccess ? (
              <div className="py-6 text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-full bg-green-100 text-green-700">
                  <CheckBadgeIcon className="size-8" />
                </div>
                <h3 className="mt-4 font-display text-2xl font-bold text-ink">
                  Payment Successful!
                </h3>
                <p className="mt-2 text-sm text-ink/70">{paymentSuccess}</p>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentSuccess(null);
                    setIsPayModalOpen(false);
                  }}
                  className="btn-dark mt-6 !py-2.5 !px-6 text-sm font-bold"
                >
                  Return to Portal
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-ink/10 pb-4">
                  <div>
                    <h3 className="font-display text-xl font-bold text-ink">
                      Batch Invoice Payment
                    </h3>
                    <p className="text-xs text-ink/50">
                      Settling {selectedInvoicesList.length} invoice(s) in a single transaction
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPayModalOpen(false)}
                    className="text-ink/40 hover:text-ink"
                  >
                    <XMarkIcon className="size-5" />
                  </button>
                </div>

                {/* Selected Invoices Breakdown */}
                <div className="mt-4 max-h-48 overflow-y-auto space-y-2 border border-ink/5 rounded-xl bg-paper p-3 text-xs">
                  {selectedInvoicesList.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between py-1 border-b border-ink/5 last:border-0">
                      <div>
                        <span className="font-mono font-bold text-ink">{inv.number}</span>
                        <span className="ml-2 text-ink/50">({inv.business_name})</span>
                      </div>
                      <span className="font-bold text-ink">{money(inv.total, inv.currency)}</span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-4 flex items-baseline justify-between rounded-xl bg-ink/5 px-4 py-3">
                  <span className="font-bold text-ink text-sm">Total Charge</span>
                  <span className="font-display text-2xl font-bold text-ink">
                    {money(selectedTotalAmount)}
                  </span>
                </div>

                {/* Simulated Payment Details */}
                <div className="mt-4 space-y-3 rounded-xl border border-ink/10 bg-white p-4 text-xs">
                  <div className="flex items-center justify-between text-ink/60">
                    <span className="font-semibold text-ink">Payment Method (Test Mode)</span>
                    <span className="rounded-md bg-lime/80 px-2 py-0.5 text-[10px] font-bold text-ink">
                      Simulated Checkout
                    </span>
                  </div>
                  <div className="rounded-lg border border-ink/10 bg-paper p-2.5 font-mono text-xs text-ink/80 flex items-center justify-between">
                    <span>4242 •••• •••• 4242</span>
                    <span>12/28 • 123</span>
                  </div>
                  <p className="text-[11px] text-ink/40 flex items-center gap-1">
                    <ShieldCheckIcon className="size-3.5 text-green-600" />
                    No real credit card will be charged. Instantly marks invoices as paid.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={isPaying}
                    onClick={() => setIsPayModalOpen(false)}
                    className="btn-light !py-2.5 !px-4 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isPaying}
                    onClick={handleExecuteBatchPayment}
                    className="btn-dark !py-2.5 !px-6 text-sm font-bold flex items-center gap-2"
                  >
                    {isPaying ? (
                      <>
                        <ArrowPathIcon className="size-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <CreditCardIcon className="size-4 stroke-[2.5]" />
                        <span>Confirm & Pay {money(selectedTotalAmount)}</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function ClientPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center bg-[#fafaf9]">
          <ArrowPathIcon className="size-8 animate-spin text-ink/40" />
        </div>
      }
    >
      <ClientPortalContent />
    </Suspense>
  );
}
