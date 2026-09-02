"use client";

import Link from "next/link";
import {
  BookOpenIcon,
  DocumentTextIcon,
  UsersIcon,
  CreditCardIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  LightBulbIcon,
  CommandLineIcon,
} from "@heroicons/react/24/outline";

export default function GuidePage() {
  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="rounded-[2.5rem] border border-ink/10 bg-white p-8 shadow-soft md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-cobalt/10 px-3 py-1 text-xs font-bold text-cobalt">
              <BookOpenIcon className="size-4" />
              BillFlow Knowledge Base
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Learn to Use BillFlow
            </h1>
            <p className="mt-1 text-sm text-ink/60">
              Master invoice generation, multi-brand client management, and tool-assisted workflow automation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/invoices/new" className="btn-dark !py-2.5 !px-5 text-xs font-bold">
              + Create First Invoice
            </Link>
          </div>
        </div>
      </div>

      {/* Grid of Core Modules */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Module 1: Invoicing Flow */}
        <div className="card p-7 shadow-soft">
          <div className="flex items-center gap-3 text-cobalt">
            <div className="grid size-10 place-items-center rounded-2xl bg-cobalt/10">
              <DocumentTextIcon className="size-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-ink">1. Invoice Management</h2>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink/65">
            BillFlow simplifies end-to-end client invoicing with automatic mathematical calculations, dynamic tax rates, discount deductions, and unique public token generation.
          </p>
          <ul className="mt-4 space-y-2 text-xs text-ink/75 font-medium">
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="size-4 text-green-600 shrink-0 mt-0.5" />
              <span><strong>Draft vs. Sent vs. Paid:</strong> Invoices dynamically transition to <code>Overdue</code> if unpaid after the due date.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="size-4 text-green-600 shrink-0 mt-0.5" />
              <span><strong>Print & PDF:</strong> Every invoice includes a print-optimized stylesheet (<code>@media print</code>).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="size-4 text-green-600 shrink-0 mt-0.5" />
              <span><strong>Public Pay Link:</strong> Shareable link (<code>/pay/[token]</code>) for instant single-invoice settlement.</span>
            </li>
          </ul>
        </div>

        {/* Module 2: Client Portal & Batch Pay */}
        <div className="card p-7 shadow-soft">
          <div className="flex items-center gap-3 text-lime">
            <div className="grid size-10 place-items-center rounded-2xl bg-lime/20 text-ink">
              <CreditCardIcon className="size-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-ink">2. Multi-Brand Client Portal</h2>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink/65">
            Clients can access a centralized portal (<code>/portal</code>) to manage all their billing across multiple freelance studios and brands.
          </p>
          <ul className="mt-4 space-y-2 text-xs text-ink/75 font-medium">
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="size-4 text-green-600 shrink-0 mt-0.5" />
              <span><strong>Role-Based Login:</strong> Clients log in via their billing email without needing a password.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="size-4 text-green-600 shrink-0 mt-0.5" />
              <span><strong>Data Privacy Isolation:</strong> Clients only see invoices issued specifically to their email address.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="size-4 text-green-600 shrink-0 mt-0.5" />
              <span><strong>Multi-Invoice Batch Pay:</strong> Select multiple invoices across brands and settle them in a single batch checkout.</span>
            </li>
          </ul>
        </div>

        {/* Module 3: Client Segregation & Analytics */}
        <div className="card p-7 shadow-soft">
          <div className="flex items-center gap-3 text-purple-600">
            <div className="grid size-10 place-items-center rounded-2xl bg-purple-100">
              <UsersIcon className="size-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-ink">3. Client Financial Segregation</h2>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink/65">
            Track precise financial metrics per client directly on your Clients dashboard (<code>/clients</code>).
          </p>
          <ul className="mt-4 space-y-2 text-xs text-ink/75 font-medium">
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="size-4 text-green-600 shrink-0 mt-0.5" />
              <span><strong>Total Revenue:</strong> All lifetime settled revenue collected from each client.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="size-4 text-green-600 shrink-0 mt-0.5" />
              <span><strong>Pending & Overdue:</strong> Real-time segregation of unpaid and overdue balances.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="size-4 text-green-600 shrink-0 mt-0.5" />
              <span><strong>Invoice History:</strong> Filter client lists by active balance or settled status.</span>
            </li>
          </ul>
        </div>

        {/* Module 4: AI Copilot & Tool Calling */}
        <div className="card p-7 shadow-soft">
          <div className="flex items-center gap-3 text-cobalt">
            <div className="grid size-10 place-items-center rounded-2xl bg-cobalt/10">
              <SparklesIcon className="size-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-ink">4. AI Copilot & Tool Calling</h2>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink/65">
            BillFlow includes an integrated agentic AI assistant equipped with native tool-calling capabilities to execute workspace actions via conversational natural language.
          </p>
          <ul className="mt-4 space-y-2 text-xs text-ink/75 font-medium">
            <li className="flex items-start gap-2">
              <CommandLineIcon className="size-4 text-cobalt shrink-0 mt-0.5" />
              <span><code>get_clients</code>: Fetch clients with revenue & overdue metrics.</span>
            </li>
            <li className="flex items-start gap-2">
              <CommandLineIcon className="size-4 text-cobalt shrink-0 mt-0.5" />
              <span><code>create_client</code>: Add new clients automatically.</span>
            </li>
            <li className="flex items-start gap-2">
              <CommandLineIcon className="size-4 text-cobalt shrink-0 mt-0.5" />
              <span><code>create_invoice</code>: Draft and save invoices from natural prompts.</span>
            </li>
            <li className="flex items-start gap-2">
              <CommandLineIcon className="size-4 text-cobalt shrink-0 mt-0.5" />
              <span><code>get_client_analytics</code>: Query specific client overdue & payment status.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Quick Tips & Best Practices */}
      <div className="rounded-3xl border border-ink/10 bg-white p-8 shadow-soft">
        <div className="flex items-center gap-2 text-ink">
          <LightBulbIcon className="size-5 text-lime fill-lime" />
          <h2 className="font-display text-xl font-bold">Quick Keyboard & Navigation Shortcuts</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3 text-xs">
          <div className="rounded-2xl border border-ink/10 bg-paper p-4">
            <p className="font-mono font-bold text-ink">/invoices/new</p>
            <p className="mt-1 text-ink/50">Instant invoice creator with AI item auto-drafting.</p>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-paper p-4">
            <p className="font-mono font-bold text-ink">/portal</p>
            <p className="mt-1 text-ink/50">Client portal preview with multi-brand batch payment.</p>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-paper p-4">
            <p className="font-mono font-bold text-ink">/settings</p>
            <p className="mt-1 text-ink/50">Custom studio branding, logo, prefix, and default currency.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
