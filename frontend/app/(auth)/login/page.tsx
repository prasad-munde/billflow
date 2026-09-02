"use client";

import { FormEvent, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, setToken, toast } from "@/lib/api";
import {
  SparklesIcon,
  LockClosedIcon,
  EnvelopeIcon,
  BriefcaseIcon,
  UserCircleIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "client" ? "client" : "freelancer";

  const [role, setRole] = useState<"freelancer" | "client">(initialRole);

  // Freelancer state
  const [email, setEmail] = useState("demo@billflow.app");
  const [password, setPassword] = useState("Demo123!");

  // Client state
  const [clientEmail, setClientEmail] = useState("maya@lumencollective.com");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleFreelancerSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.access_token);
      toast.success("Welcome back to your studio dashboard!");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Could not log in");
    } finally {
      setLoading(false);
    }
  }

  async function handleClientSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!clientEmail.trim()) {
        throw new Error("Please enter your billing email.");
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("billflow_client_email", clientEmail.trim());
      }
      toast.success(`Accessing client portal for ${clientEmail}...`);
      router.push(`/portal?email=${encodeURIComponent(clientEmail.trim())}`);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Could not access client portal");
    } finally {
      setLoading(false);
    }
  }

  function fillDemoFreelancer() {
    setEmail("demo@billflow.app");
    setPassword("Demo123!");
    setError("");
  }

  function fillDemoClient() {
    setClientEmail("maya@lumencollective.com");
    setError("");
  }

  return (
    <section className="w-full max-w-md rounded-[2rem] border border-ink/10 bg-white p-7 shadow-soft md:p-10">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="grid size-7 place-items-center rounded-lg bg-lime text-xs font-sans font-bold text-ink">
            B
          </span>
          BillFlow
        </Link>

        {role === "freelancer" ? (
          <button
            type="button"
            onClick={fillDemoFreelancer}
            className="inline-flex items-center gap-1.5 rounded-full border border-lime/60 bg-lime/20 px-3 py-1 text-xs font-bold text-ink transition hover:bg-lime/40"
          >
            <SparklesIcon className="size-3.5 text-ink" />
            Demo Studio Login
          </button>
        ) : (
          <button
            type="button"
            onClick={fillDemoClient}
            className="inline-flex items-center gap-1.5 rounded-full border border-cobalt/40 bg-cobalt/10 px-3 py-1 text-xs font-bold text-cobalt transition hover:bg-cobalt/20"
          >
            <SparklesIcon className="size-3.5" />
            Demo Client (Maya)
          </button>
        )}
      </div>

      {/* Role Selector Tabs */}
      <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-paper p-1 border border-ink/5">
        <button
          type="button"
          onClick={() => {
            setRole("freelancer");
            setError("");
          }}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
            role === "freelancer"
              ? "bg-white text-ink shadow-xs"
              : "text-ink/60 hover:text-ink"
          }`}
        >
          <BriefcaseIcon className="size-4" />
          <span>Freelancer / Studio</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setRole("client");
            setError("");
          }}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
            role === "client"
              ? "bg-white text-cobalt shadow-xs"
              : "text-ink/60 hover:text-ink"
          }`}
        >
          <UserCircleIcon className="size-4" />
          <span>Client Account</span>
        </button>
      </div>

      {/* Title text */}
      <div className="mt-6">
        {role === "freelancer" ? (
          <>
            <p className="eyebrow text-cobalt">Studio Dashboard</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">Pick up the flow.</h1>
            <p className="mt-1 text-xs text-ink/60">
              Log in to manage your clients, build invoices, and track incoming payments.
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow text-cobalt">Client Billing Hub</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">Access Your Invoices</h1>
            <p className="mt-1 text-xs text-ink/60">
              View all invoices, outstanding balances, and pay across multiple freelance brands.
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Freelancer Login Form */}
      {role === "freelancer" ? (
        <form onSubmit={handleFreelancerSubmit} className="mt-5 space-y-4">
          <div>
            <label className="label flex items-center gap-1.5">
              <EnvelopeIcon className="size-3.5" />
              Email address
            </label>
            <input
              required
              className="input mt-1.5"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.com"
            />
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <LockClosedIcon className="size-3.5" />
              Password
            </label>
            <input
              required
              className="input mt-1.5"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn-dark w-full !py-3.5 mt-2 font-bold" disabled={loading}>
            {loading ? "Signing in…" : "Sign in to workspace"}
          </button>
        </form>
      ) : (
        /* Client Portal Login Form */
        <form onSubmit={handleClientSubmit} className="mt-5 space-y-4">
          <div>
            <label className="label flex items-center gap-1.5">
              <EnvelopeIcon className="size-3.5" />
              Your Billing Email
            </label>
            <input
              required
              className="input mt-1.5"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@company.com"
            />
          </div>

          <div className="rounded-xl border border-ink/10 bg-paper p-3 text-[11px] text-ink/60 space-y-1">
            <p className="font-semibold text-ink flex items-center gap-1">
              <ShieldCheckIcon className="size-3.5 text-green-600" />
              Private & Secure Client Access
            </p>
            <p>You will only see invoices specifically issued to your email address across all freelance vendors.</p>
          </div>

          <button type="submit" className="btn-dark w-full !py-3.5 mt-2 font-bold flex items-center justify-center gap-2" disabled={loading}>
            <span>{loading ? "Opening Portal…" : "Open Client Billing Hub"}</span>
            <ArrowRightIcon className="size-4" />
          </button>
        </form>
      )}

      <div className="mt-8 border-t border-ink/5 pt-4 text-center text-xs font-medium text-ink/55">
        {role === "freelancer" ? (
          <p>
            New freelancer?{" "}
            <Link className="font-bold text-cobalt hover:underline" href="/signup">
              Create a studio account
            </Link>
          </p>
        ) : (
          <p>
            Are you a freelancer billing clients?{" "}
            <button
              type="button"
              onClick={() => setRole("freelancer")}
              className="font-bold text-cobalt hover:underline"
            >
              Switch to Freelancer Login
            </button>
          </p>
        )}
      </div>
    </section>
  );
}

export default function Login() {
  return (
    <main className="gridline flex min-h-screen items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-[2rem] border border-ink/10 bg-white p-12 text-center">
            <ArrowPathIcon className="mx-auto size-8 animate-spin text-ink/40" />
          </div>
        }
      >
        <LoginFormContent />
      </Suspense>
    </main>
  );
}



