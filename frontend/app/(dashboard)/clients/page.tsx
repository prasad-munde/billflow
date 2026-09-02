"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, toast } from "@/lib/api";
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
} from "@heroicons/react/24/outline";

type Client = {
  id: number;
  name: string;
  email: string;
  company: string | null;
  address: string | null;
  phone: string | null;
  created_at: string;
};

export default function Clients() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      company: company.trim() || null,
      address: address.trim() || null,
      phone: phone.trim() || null,
    };

    try {
      if (editingClient) {
        await api(`/clients/${editingClient.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success(`Client "${name}" updated successfully.`);
      } else {
        await api("/clients", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(`Client "${name}" added.`);
      }
      setIsModalOpen(false);
      loadClients();
    } catch (err: any) {
      setFormError(err.message || "Failed to save client.");
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
      toast.success(`Client "${clientToDelete.name}" deleted.`);
      setClientToDelete(null);
      loadClients();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete client.");
    } finally {
      setDeleting(false);
    }
  }

  const filteredClients = clients.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      (c.company && c.company.toLowerCase().includes(term))
    );
  });

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-cobalt">Clients</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
            People behind the projects.
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            Keep every client detail, address, and invoice history in one place.
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-dark shadow-sm">
          <PlusIcon className="size-4 stroke-[2.5]" />
          <span>Add client</span>
        </button>
      </header>

      {/* Search Bar */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3.5 top-3.5 size-4 text-ink/40" />
          <input
            className="input pl-10"
            placeholder="Search by name, company, or email…"
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
              <div key={n} className="skeleton h-48 rounded-3xl" />
            ))}
          </div>
        ) : filteredClients.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredClients.map((c) => (
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

                  <div className="mt-4 space-y-2 border-t border-ink/8 pt-4 text-xs text-ink/65">
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
                    {c.address && (
                      <div className="flex items-start gap-2">
                        <MapPinIcon className="size-3.5 text-ink/40 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed whitespace-pre-line">
                          {c.address}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-ink/20 bg-white/60 p-12 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-ink/5 text-ink/40">
              <BuildingOfficeIcon className="size-6" />
            </div>
            <p className="mt-4 font-display text-xl font-bold">
              {search ? "No clients match your search" : "No clients added yet"}
            </p>
            <p className="mt-1.5 text-sm text-ink/55">
              {search
                ? "Try searching for another name, company, or email."
                : "Add your first client to start sending invoices in minutes."}
            </p>
            {!search && (
              <button onClick={openCreateModal} className="btn-dark mt-5">
                <PlusIcon className="size-4" />
                <span>Add first client</span>
              </button>
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
    </>
  );
}

