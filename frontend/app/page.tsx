import Link from "next/link";
import {
  ArrowRightIcon,
  SparklesIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ShareIcon,
  CreditCardIcon,
  ChartBarIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

const features = [
  {
    number: "01",
    title: "Client & Contact Management",
    text: "Store billing contacts, company entities, phone numbers, and addresses securely in one central hub.",
  },
  {
    number: "02",
    title: "Dynamic Calculations",
    text: "Add line items, discounts, and regional taxes. Totals and subtotals compute authoritatively and instantly.",
  },
  {
    number: "03",
    title: "Client Payment Portal",
    text: "Share a private, secure link with your clients. They can view, print to PDF, and pay without registering.",
  },
  {
    number: "04",
    title: "Automatic Overdue Tracking",
    text: "Invoices past their due date automatically highlight as overdue without manual reminders or cron jobs.",
  },
  {
    number: "05",
    title: "Real-time Income Analytics",
    text: "Keep a pulse on total collected earnings, outstanding receivables, and monthly billing activity.",
  },
  {
    number: "06",
    title: "Custom Studio Branding",
    text: "Set your business name, upload your studio logo, select currencies, and customize invoice numbering.",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Add your client",
    desc: "Store your client’s contact details, billing address, and company info.",
    icon: DocumentTextIcon,
  },
  {
    step: "02",
    title: "Generate invoice",
    desc: "Add your deliverables, set hourly or project rates, and customize taxes & discounts.",
    icon: SparklesIcon,
  },
  {
    step: "03",
    title: "Share public link",
    desc: "Send a shareable link that opens directly on your client's device without any login.",
    icon: ShareIcon,
  },
  {
    step: "04",
    title: "Get paid smoothly",
    desc: "Client confirms payment and your dashboard updates revenue in real-time.",
    icon: CreditCardIcon,
  },
];

export default function Home() {
  return (
    <main className="overflow-hidden bg-paper text-ink">
      {/* Hero Section */}
      <section className="gridline relative min-h-[720px] px-5 pt-6 md:px-12">
        {/* Navigation Bar */}
        <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-ink/10 bg-white/85 px-6 py-3.5 shadow-sm backdrop-blur">
          <Link href="/" className="flex items-center gap-2.5 font-display text-2xl font-bold tracking-tight">
            <span className="grid size-8 place-items-center rounded-xl bg-lime text-base font-sans font-bold text-ink shadow-sm">
              B
            </span>
            BillFlow
          </Link>

          <div className="hidden items-center gap-8 text-sm font-semibold text-ink/75 md:flex">
            <a href="#how" className="hover:text-ink transition">How it works</a>
            <a href="#features" className="hover:text-ink transition">Features</a>
            <Link href="/login" className="hover:text-ink transition">Sign in</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-light !px-4 !py-2 text-xs font-bold md:hidden">
              Sign in
            </Link>
            <Link href="/signup" className="btn-dark !px-4 !py-2.5 text-xs md:text-sm font-bold shadow-sm">
              <span>Start free</span>
              <ArrowRightIcon className="size-3.5 stroke-[2.5]" />
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="mx-auto grid max-w-6xl gap-12 pb-24 pt-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:pt-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3.5 py-1.5 text-xs font-bold text-ink shadow-sm">
              <SparklesIcon className="size-4 text-cobalt" />
              SaaS Invoicing for Freelancers & Studios
            </div>

            <h1 className="max-w-3xl font-display text-5xl font-bold leading-[0.98] tracking-tight md:text-7xl">
              The calmer way to{" "}
              <span className="relative whitespace-nowrap">
                get paid
                <span className="absolute -bottom-1.5 left-0 -z-10 h-3.5 w-full -rotate-1 bg-lime/90" />
              </span>
              .
            </h1>

            <p className="mt-7 max-w-lg text-lg leading-relaxed text-ink/70">
              BillFlow replaces messy spreadsheets and Word documents with elegant invoices, instantaneous client payment links, and clear financial visibility.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <Link href="/signup" className="btn-dark !py-3.5 !px-6 text-sm font-bold shadow-md">
                <span>Create your first invoice</span>
                <ArrowRightIcon className="size-4 stroke-[2.5]" />
              </Link>
              <Link href="/login" className="btn-light !py-3.5 !px-6 text-sm font-bold">
                Try demo workspace
              </Link>
            </div>

            <div className="mt-6 flex items-center gap-5 text-xs font-medium text-ink/50">
              <div className="flex items-center gap-1.5">
                <CheckCircleIcon className="size-4 text-green-600" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircleIcon className="size-4 text-green-600" />
                <span>Instant public links</span>
              </div>
            </div>
          </div>

          {/* Interactive Hero Invoice Mockup */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -right-10 top-12 -z-10 size-60 rounded-full bg-lime/70 blur-3xl opacity-80" />
            <div className="rotate-2 rounded-[2.5rem] border border-ink/10 bg-white p-6 shadow-soft transition duration-500 hover:rotate-0 md:p-8">
              <div className="flex items-center justify-between border-b border-ink/10 pb-5">
                <div>
                  <div className="font-display text-2xl font-bold tracking-tight">Northstar<span className="text-cobalt">.</span></div>
                  <p className="text-[10px] uppercase font-bold text-ink/40 tracking-wider">Invoice #NST-0006</p>
                </div>
                <span className="badge badge-paid">PAID</span>
              </div>

              <div className="mt-6 flex justify-between text-xs">
                <div>
                  <p className="label text-[9px] text-ink/40">Billed to</p>
                  <p className="mt-1 font-bold text-ink text-sm">Maya Chen</p>
                  <p className="text-ink/55">Lumen Collective</p>
                </div>
                <div className="text-right">
                  <p className="label text-[9px] text-ink/40">Amount</p>
                  <p className="mt-1 font-display text-base font-bold text-ink">$6,360.00</p>
                  <p className="text-[10px] text-green-700 font-semibold">Settled</p>
                </div>
              </div>

              <div className="mt-6 space-y-2.5 border-y border-ink/10 py-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink/80 font-medium">Next.js Web App Development</span>
                  <b className="font-mono">$4,800.00</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink/80 font-medium">REST API & Client Portal</span>
                  <b className="font-mono">$1,600.00</b>
                </div>
              </div>

              <div className="mt-5 flex justify-between items-baseline font-display text-xl font-bold">
                <span>Total</span>
                <span className="text-2xl text-ink">$6,360.00</span>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-6 rounded-2xl border border-ink/10 bg-ink px-4 py-3 text-white shadow-soft">
              <p className="text-[10px] uppercase tracking-widest text-white/55 font-bold">Total Collected</p>
              <p className="font-display text-xl font-bold">$15,700 <span className="text-xs text-lime font-sans">+24%</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how" className="bg-ink px-5 py-24 text-white md:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="eyebrow text-lime">The Flow</p>
              <h2 className="mt-3 max-w-lg font-display text-4xl font-bold leading-tight md:text-5xl">
                From finished project to paid in four simple steps.
              </h2>
            </div>
            <Link href="/signup" className="btn bg-lime text-ink font-bold hover:bg-[#c9f548] !px-6">
              <span>Create your workspace</span>
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {workflowSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.step}
                  className="rounded-3xl border border-white/15 bg-white/5 p-7 backdrop-blur transition hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xl font-bold text-lime">{step.step}</span>
                    <Icon className="size-5 text-white/60" />
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-white">{step.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/60">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-24 md:px-12">
        <div className="max-w-2xl">
          <p className="eyebrow text-cobalt">Considered details</p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
            Everything your freelance business needs to look professional.
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feat) => (
            <article
              key={feat.title}
              className="rounded-3xl border border-ink/10 bg-white p-8 shadow-sm transition hover:border-ink/25 hover:shadow-md"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-lime font-display text-sm font-bold text-ink">
                {feat.number}
              </span>
              <h3 className="mt-6 font-display text-xl font-bold text-ink">{feat.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">{feat.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="border-t border-ink/10 bg-white px-5 py-12 md:px-12">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-display text-2xl font-bold">
            <span className="grid size-8 place-items-center rounded-xl bg-lime text-base font-sans font-bold text-ink">
              B
            </span>
            BillFlow
          </div>
          <p className="text-xs text-ink/50">
            © 2026 BillFlow Invoicing SaaS. Built for independent creators & studios.
          </p>
          <div className="flex items-center gap-4 text-xs font-bold text-ink/60">
            <Link href="/login" className="hover:text-ink">Log in</Link>
            <Link href="/signup" className="btn-dark !py-2 !px-4 text-xs">Start free</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

