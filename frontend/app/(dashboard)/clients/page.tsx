"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, money, toast } from "@/lib/api";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  ClockIcon,
  CheckBadgeIcon,
  DocumentPlusIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

type Client = {
  id: number;
  name: string;
  email: string;
  company: string | null;
  address: string | null;
  phone: string | null;
  created_at: string;
  total_billed?: number;
  total_paid?: number;
  total_overdue?: number;
  total_outstanding?: number;
  invoices_count?: number;
  overdue_count?: number;
};

export default function Clients() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "overdue" | "outstanding" | "paid">("all");

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete Confirmation Modal State
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadClients() {
    try {
      const data = await api<Client[]>("/clients");
      setClients(data);
    } catch (err: any) {
      if (err.message?.includes("Invalid session") || err.message?.includes("unauthorized")) {
        router.push("/login");
      } else {
        toast.error("Could not load clients.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  function openCreateModal() {
    setEditingClient(null);
    setName("");
    setEmail("");
    setCompany("");
    setAddress("");
    setPhone("");
    setFormError("");
    setIsModalOpen(true);
  }

  function openEditModal(c: Client) {
    setEditingClient(c);
    setName(c.name || "");
    setEmail(c.email || "");
    setCompany(c.company || "");
    setAddress(c.address || "");
    setPhone(c.phone || "");
    setFormError("");
    setIsModalOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setFormError("Name and Email are required.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      if (editingClient) {
        await api(`/clients/${editingClient.id}`, {
          method: "PUT",
          body: JSON.stringify({ name, email, company, address, phone }),
        });
        toast.success("Client updated successfully.");
      } else {
        await api("/clients", {
          method: "POST",
          body: JSON.stringify({ name, email, company, address, phone }),
        });
        toast.success("Client added successfully.");
      }
      setIsModalOpen(false);
      loadClients();
    } catch (err: any) {
      setFormError(err instanceof Error ? err.message : "Failed to save client.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!clientToDelete) return;
    setDeleting(true);
    try {
      await api(`/clients/${clientToDelete.id}`, {
        method: "DELETE",
      });
      toast.success("Client deleted.");
      setClientToDelete(null);
      loadClients();
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : "Could not delete client.");
    } finally {
      setDeleting(false);
    }
  }

  // Aggregate Metrics Across Clients
  const totalClientsCount = clients.length;
  const totalRevenueCollected = clients.reduce((sum, c) => sum + (c.total_paid || 0), 0);
  const totalOutstandingReceivables = clients.reduce((sum, c) => sum + (c.total_outstanding || 0), 0);
  const totalOverdueReceivables = clients.reduce((sum, c) => sum + (c.total_overdue || 0), 0);

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterMode === "overdue") return (c.total_overdue || 0) > 0;
    if (filterMode === "outstanding") return (c.total_outstanding || 0) > 0;
    if (filterMode === "paid") return (c.total_paid || 0) > 0 && (c.total_outstanding || 0) === 0;

    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Clients</h1>
          <p className="mt-1 text-sm text-ink/60">
            Client directory, contact details, and segregated financial performance.
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-dark !py-2.5 !px-5 text-xs font-bold">
          <PlusIcon className="size-4 stroke-[2.5]" />
          <span>New Client</span>
        </button>
      </div>

      {/* High-Level Segregation Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5 border-l-4 border-l-green-500 shadow-soft">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink/40">
            <span>Total Collected Revenue</span>
            <CheckBadgeIcon className="size-4 text-green-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {money(totalRevenueCollected)}
          </p>
          <p className="mt-1 text-xs text-green-700 font-medium">
            Across {totalClientsCount} clients
          </p>
        </div>

        <div className="card p-5 border-l-4 border-l-cobalt shadow-soft">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink/40">
            <span>Pending Receivables</span>
            <ClockIcon className="size-4 text-cobalt" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {money(totalOutstandingReceivables)}
          </p>
          <p className="mt-1 text-xs text-ink/50">
            Unpaid invoices currently outstanding
          </p>
        </div>

        <div className="card p-5 border-l-4 border-l-rose-500 shadow-soft">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink/40">
            <span>Overdue Amount</span>
            <ExclamationTriangleIcon className="size-4 text-rose-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {money(totalOverdueReceivables)}
          </p>
          <p className="mt-1 text-xs text-rose-600 font-semibold">
            {clients.filter(c => (c.overdue_count || 0) > 0).length} client(s) with overdue invoices
          </p>
        </div>
      </div>

      {/* Search & Segregation Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1 bg-paper p-1 rounded-xl border border-ink/5">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filterMode === "all" ? "bg-white text-ink shadow-xs" : "text-ink/60 hover:text-ink"
            }`}
          >
            All ({clients.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("outstanding")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filterMode === "outstanding" ? "bg-white text-ink shadow-xs" : "text-ink/60 hover:text-ink"
            }`}
          >
            Pending ({clients.filter(c => (c.total_outstanding || 0) > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("overdue")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filterMode === "overdue" ? "bg-white text-rose-700 shadow-xs" : "text-ink/60 hover:text-ink"
            }`}
          >
            Overdue ({clients.filter(c => (c.total_overdue || 0) > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("paid")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filterMode === "paid" ? "bg-white text-ink shadow-xs" : "text-ink/60 hover:text-ink"
            }`}
          >
            Settled ({clients.filter(c => (c.total_paid || 0) > 0 && (c.total_outstanding || 0) === 0).length})
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3.5 top-3 size-4 text-ink/40" />
          <input
            className="input !py-1.5 !pl-9 text-xs"
            placeholder="Search name, company, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Client List / Grid */}
      <div className="mt-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="skeleton h-56 rounded-3xl" />
            ))}
          </div>
        ) : filteredClients.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredClients.map((c) => {
              const paid = c.total_paid || 0;
              const overdue = c.total_overdue || 0;
              const outstanding = c.total_outstanding || 0;
              const count = c.invoices_count || 0;

              return (
                <article
                  key={c.id}
                  className="group relative flex flex-col justify-between rounded-3xl border border-ink/10 bg-white p-6 shadow-sm transition hover:border-ink/25 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="grid size-11 place-items-center rounded-2xl bg-lime font-display text-lg font-bold text-ink">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={() => openEditModal(c)}
                          className="rounded-lg p-1.5 text-ink/60 hover:bg-ink/5 hover:text-cobalt transition"
                          title="Edit client"
                        >
                          <PencilSquareIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => setClientToDelete(c)}
                          className="rounded-lg p-1.5 text-ink/60 hover:bg-red-50 hover:text-red-600 transition"
                          title="Delete client"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="mt-4 font-display text-xl font-bold tracking-tight text-ink">
                      {c.name}
                    </h3>

                    {c.company ? (
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-ink/60">
                        <BuildingOfficeIcon className="size-4 text-ink/40 shrink-0" />
                        <span className="truncate font-medium">{c.company}</span>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-ink/45 font-medium italic">Individual client</p>
                    )}

                    {/* Financial Segregation Strip */}
                    <div className="mt-4 rounded-2xl border border-ink/5 bg-paper p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink/50 font-medium">Revenue Earned</span>
                        <span className="font-bold text-green-700 font-mono">{money(paid)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink/50 font-medium">Outstanding Balance</span>
                        <span className={`font-bold font-mono ${overdue > 0 ? "text-rose-600" : "text-ink"}`}>
                          {money(outstanding)}
                        </span>
                      </div>
                      {overdue > 0 && (
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-ink/5">
                          <span className="text-rose-600 font-bold flex items-center gap-1">
                            <ExclamationTriangleIcon className="size-3" /> Overdue
                          </span>
                          <span className="font-bold text-rose-600 font-mono">{money(overdue)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-ink/5 text-ink/40">
                        <span>Total Invoices</span>
                        <span className="font-bold text-ink/70">{count} {count === 1 ? "invoice" : "invoices"}</span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5 border-t border-ink/8 pt-4 text-xs text-ink/65">
                      <div className="flex items-center gap-2">
                        <EnvelopeIcon className="size-3.5 text-ink/40 shrink-0" />
                        <a href={`mailto:${c.email}`} className="truncate hover:text-cobalt hover:underline">
                          {c.email}
                        </a>
                      </div>
                      {c.phone && (
                        <div className="flex items-center gap-2">
                          <PhoneIcon className="size-3.5 text-ink/40 shrink-0" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-5 pt-3 border-t border-ink/5 flex items-center justify-between">
                    <Link
                      href={`/invoices?search=${encodeURIComponent(c.name)}`}
                      className="text-xs font-bold text-cobalt hover:underline"
                    >
                      Invoices →
                    </Link>
                    <Link
                      href={`/invoices/new?clientId=${c.id}`}
                      className="btn-dark !py-1.5 !px-3 text-[11px] font-bold flex items-center gap-1"
                    >
                      <PlusIcon className="size-3 stroke-[3]" />
                      <span>New Invoice</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-ink/20 bg-white/60 p-12 text-center">
            {clients.length === 0 ? (
              // Case 1: Brand new workspace with zero clients
              <>
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-ink/5 text-ink/40">
                  <BuildingOfficeIcon className="size-6" />
                </div>
                <p className="mt-4 font-display text-xl font-bold text-ink">
                  No clients added yet
                </p>
                <p className="mt-1.5 text-sm text-ink/55 max-w-sm mx-auto">
                  Add your first client to start sending invoices in minutes.
                </p>
                <button onClick={openCreateModal} className="btn-dark mt-5 inline-flex items-center gap-2">
                  <PlusIcon className="size-4" />
                  <span>Add first client</span>
                </button>
              </>
            ) : search.trim() ? (
              // Case 2: Active search filter with no matches
              <>
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-ink/5 text-ink/40">
                  <MagnifyingGlassIcon className="size-6" />
                </div>
                <p className="mt-4 font-display text-xl font-bold text-ink">
                  No clients match your search
                </p>
                <p className="mt-1.5 text-sm text-ink/55 max-w-sm mx-auto">
                  No results found for &ldquo;{search}&rdquo;. Try another name, company, or email address.
                </p>
                <button onClick={() => setSearch("")} className="btn-light mt-5 text-xs font-bold">
                  Clear search
                </button>
              </>
            ) : filterMode === "overdue" ? (
              // Case 3: Overdue filter with zero overdue clients
              <>
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckBadgeIcon className="size-6" />
                </div>
                <p className="mt-4 font-display text-xl font-bold text-ink">
                  Zero Overdue Balances 🎉
                </p>
                <p className="mt-1.5 text-sm text-ink/55 max-w-sm mx-auto">
                  Great news! None of your {clients.length} clients have overdue payments. All client accounts are in good standing.
                </p>
                <button onClick={() => setFilterMode("all")} className="btn-light mt-5 text-xs font-bold">
                  View all clients ({clients.length})
                </button>
              </>
            ) : filterMode === "paid" ? (
              // Case 4: Settled filter with no 100% settled clients
              <>
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-50 text-cobalt">
                  <BanknotesIcon className="size-6" />
                </div>
                <p className="mt-4 font-display text-xl font-bold text-ink">
                  No Fully Settled Clients
                </p>
                <p className="mt-1.5 text-sm text-ink/55 max-w-sm mx-auto">
                  Clients who have completed all payments and currently have zero pending invoices will appear here.
                </p>
                <button onClick={() => setFilterMode("all")} className="btn-light mt-5 text-xs font-bold">
                  View all clients ({clients.length})
                </button>
              </>
            ) : (
              // Case 5: Pending filter with no pending receivables
              <>
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-paper text-ink/40">
                  <ClockIcon className="size-6" />
                </div>
                <p className="mt-4 font-display text-xl font-bold text-ink">
                  No Pending Receivables
                </p>
                <p className="mt-1.5 text-sm text-ink/55 max-w-sm mx-auto">
                  None of your clients currently have outstanding unpaid invoices.
                </p>
                <button onClick={() => setFilterMode("all")} className="btn-light mt-5 text-xs font-bold">
                  View all clients ({clients.length})
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Client Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-ink/10 bg-white p-7 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow text-cobalt">
                  {editingClient ? "Edit Client" : "New Client"}
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold">
                  {editingClient ? "Update client details" : "Add a new client"}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-2 text-ink/40 hover:bg-ink/5 hover:text-ink"
              >
                <XMarkIcon className="size-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Full Name *</label>
                  <input
                    required
                    className="input mt-1.5"
                    placeholder="e.g. Maya Chen"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Email Address *</label>
                  <input
                    required
                    type="email"
                    className="input mt-1.5"
                    placeholder="maya@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Company</label>
                  <input
                    className="input mt-1.5"
                    placeholder="e.g. Lumen Collective"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input
                    className="input mt-1.5"
                    placeholder="+1 (555) 0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Billing Address</label>
                <textarea
                  className="input mt-1.5 min-h-20"
                  placeholder="Street address, Suite, City, State, ZIP..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-ink/10 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-light !px-4 !py-2.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-dark !px-5 !py-2.5 text-xs"
                >
                  {submitting
                    ? "Saving…"
                    : editingClient
                    ? "Save changes"
                    : "Create client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-7 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <div className="grid size-10 place-items-center rounded-2xl bg-red-50">
                <ExclamationTriangleIcon className="size-6" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-ink">Delete Client</h3>
                <p className="text-xs text-ink/55">This action cannot be undone.</p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-ink/75">
              Are you sure you want to delete <strong className="text-ink">{clientToDelete.name}</strong>?
              All associated invoices will also be removed.
            </p>

            <div className="mt-6 flex justify-end gap-3 border-t border-ink/10 pt-4">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="btn-light !px-4 !py-2.5 text-xs"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="btn bg-red-600 text-white hover:bg-red-700 !px-5 !py-2.5 text-xs font-bold"
              >
                {deleting ? "Deleting…" : "Yes, delete client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


