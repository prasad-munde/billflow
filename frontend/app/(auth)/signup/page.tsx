"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setToken, toast } from "@/lib/api";
import { LockClosedIcon, EnvelopeIcon, SparklesIcon } from "@heroicons/react/24/outline";

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await api("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.access_token);
      toast.success("Account created! Welcome to BillFlow.");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="gridline flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-md rounded-[2rem] border border-ink/10 bg-white p-7 shadow-soft md:p-10">
        <Link href="/" className="inline-flex items-center gap-2 font-display text-xl font-bold">
          <span className="grid size-7 place-items-center rounded-lg bg-lime text-xs font-sans font-bold text-ink">
            B
          </span>
          BillFlow
        </Link>

        <div className="mt-8">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-paper px-3 py-1 text-xs font-bold text-ink">
            <SparklesIcon className="size-3.5 text-cobalt" />
            14-day free trial · No card needed
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Make billing feel lighter.</h1>
          <p className="mt-1.5 text-sm text-ink/60">
            Create your workspace in seconds and start sending beautiful invoices today.
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
              Work email
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
              minLength={8}
              className="input mt-1.5"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
            <p className="mt-1 text-[11px] text-ink/45">Minimum 8 characters with letters & numbers.</p>
          </div>

          <button type="submit" className="btn-dark w-full !py-3.5 mt-2" disabled={loading}>
            {loading ? "Setting up workspace…" : "Get started free"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-medium text-ink/55">
          Already have an account?{" "}
          <Link className="font-bold text-cobalt hover:underline" href="/login">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}

