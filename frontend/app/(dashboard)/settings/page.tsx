"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, apiUrl, toast } from "@/lib/api";
import {
  PhotoIcon,
  CheckIcon,
  TrashIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";

type SettingsData = {
  business_name: string;
  logo_url: string | null;
  currency: string;
  invoice_prefix: string;
};

const CURRENCIES = [
  { code: "USD", label: "USD ($) - US Dollar" },
  { code: "EUR", label: "EUR (€) - Euro" },
  { code: "GBP", label: "GBP (£) - British Pound" },
  { code: "CAD", label: "CAD ($) - Canadian Dollar" },
  { code: "AUD", label: "AUD ($) - Australian Dollar" },
  { code: "INR", label: "INR (₹) - Indian Rupee" },
  { code: "JPY", label: "JPY (¥) - Japanese Yen" },
  { code: "CHF", label: "CHF (Fr) - Swiss Franc" },
  { code: "SGD", label: "SGD ($) - Singapore Dollar" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api<SettingsData>("/settings")
      .then(setSettings)
      .catch((err) => {
        if (err.message?.includes("Invalid session") || err.message?.includes("unauthorized")) {
          router.push("/login");
        } else {
          toast.error("Could not load settings.");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);

    try {
      const updated = await api<SettingsData>("/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setSettings(updated);
      toast.success("Business settings saved successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file must be under 5MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api<{ logo_url: string }>("/settings/logo", {
        method: "POST",
        body: formData,
      });

      if (settings) {
        setSettings({ ...settings, logo_url: res.logo_url });
      }
      toast.success("Logo uploaded! Remember to save changes.");
    } catch (err: any) {
      toast.error(err.message || "Could not upload logo.");
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveLogo() {
    if (!settings) return;
    setSettings({ ...settings, logo_url: null });
    toast.info("Logo removed. Save changes to confirm.");
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-96 rounded-3xl" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <>
      <header>
        <p className="eyebrow text-cobalt">Settings</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Make BillFlow yours.
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Configure your studio branding, currency, and invoice numbering prefix.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-8 max-w-3xl space-y-6">
        {/* Business Details Card */}
        <div className="rounded-3xl border border-ink/10 bg-white p-7 shadow-sm">
          <div className="flex items-center gap-2 border-b border-ink/10 pb-4">
            <BuildingOffice2Icon className="size-5 text-cobalt" />
            <h2 className="font-display text-lg font-bold">Studio & Branding</h2>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label className="label">Business / Studio Name</label>
              <input
                required
                className="input mt-1.5"
                value={settings.business_name}
                onChange={(e) =>
                  setSettings({ ...settings, business_name: e.target.value })
                }
                placeholder="e.g. Northstar Design Studio"
              />
            </div>

            {/* Logo Upload Section */}
            <div>
              <label className="label">Business Logo</label>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                {settings.logo_url ? (
                  <div className="relative group size-20 rounded-2xl border border-ink/15 bg-paper p-2 flex items-center justify-center">
                    <img
                      src={
                        settings.logo_url.startsWith("http")
                          ? settings.logo_url
                          : `${apiUrl}${settings.logo_url}`
                      }
                      alt="Logo preview"
                      className="max-h-full max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-red-600 text-white shadow hover:bg-red-700"
                      title="Remove logo"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="grid size-20 place-items-center rounded-2xl border border-dashed border-ink/25 bg-paper/50 text-ink/35">
                    <PhotoIcon className="size-8" />
                  </div>
                )}

                <div>
                  <label className="btn-light cursor-pointer !py-2.5 !px-4 text-xs font-bold">
                    <span>{uploading ? "Uploading…" : "Choose logo file"}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                    />
                  </label>
                  <p className="mt-1.5 text-[11px] text-ink/45">
                    PNG, JPG, SVG, or WebP. Max 5MB.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Currency & Invoice Numbering Card */}
        <div className="rounded-3xl border border-ink/10 bg-white p-7 shadow-sm">
          <h2 className="font-display text-lg font-bold border-b border-ink/10 pb-4">
            Invoicing Preferences
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label">Default Currency</label>
              <select
                className="input mt-1.5"
                value={settings.currency}
                onChange={(e) =>
                  setSettings({ ...settings, currency: e.target.value })
                }
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Invoice Number Prefix</label>
              <input
                required
                className="input mt-1.5 font-mono uppercase"
                value={settings.invoice_prefix}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    invoice_prefix: e.target.value.toUpperCase().trim(),
                  })
                }
                placeholder="INV"
                maxLength={10}
              />
              <p className="mt-1.5 text-[11px] text-ink/50">
                Preview next invoice:{" "}
                <span className="font-mono font-bold text-ink">
                  {settings.invoice_prefix || "INV"}-0001
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-dark shadow-sm !px-6 !py-3"
          >
            <CheckIcon className="size-4 stroke-[2.5]" />
            <span>{saving ? "Saving changes…" : "Save all settings"}</span>
          </button>
        </div>
      </form>
    </>
  );
}

