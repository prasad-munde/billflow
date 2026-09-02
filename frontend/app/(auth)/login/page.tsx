"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setToken, toast } from "@/lib/api";
import { SparklesIcon, LockClosedIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@billflow.app");
  const [password, setPassword] = useState("Demo123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.access_token);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Could not log in");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setEmail("demo@billflow.app");
    setPassword("Demo123!");
    setError("");
  }

  return (
    <main className="gridline flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-md rounded-[2rem] border border-ink/10 bg-white p-7 shadow-soft md:p-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold">
            <span className="grid size-7 place-items-center rounded-lg bg-lime text-xs font-sans font-bold text-ink">
              B
            </span>
            BillFlow
          </Link>
          <button
            type="button"
            onClick={fillDemo}
            className="inline-flex items-center gap-1.5 rounded-full border border-lime/60 bg-lime/20 px-3 py-1 text-xs font-bold text-ink transition hover:bg-lime/40"
          >
            <SparklesIcon className="size-3.5 text-ink" />
            Use Demo Login
          </button>
        </div>

        <div className="mt-8">
          <p className="eyebrow text-cobalt">Welcome back</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Pick up the flow.</h1>
          <p className="mt-1.5 text-sm text-ink/60">
            Log in to manage your clients, build invoices, and track payments.
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
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

          <button type="submit" className="btn-dark w-full !py-3.5 mt-2" disabled={loading}>
            {loading ? "Signing in…" : "Sign in to workspace"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-medium text-ink/55">
          New to BillFlow?{" "}
          <Link className="font-bold text-cobalt hover:underline" href="/signup">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}

