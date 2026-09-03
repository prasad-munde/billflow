"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, formatDate, money, toast } from "@/lib/api";
import {
  ArrowRightIcon,
  BanknotesIcon,
  ClockIcon,
  ExclamationCircleIcon,
  PlusIcon,
  UsersIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type IncomeItem = {
  month: string;
  income: number;
};

type RecentInvoice = {
  id: number;
  number: string;
  status: "draft" | "sent" | "paid" | "overdue";
  issue_date: string;
  due_date: string;
  total: number;
  client: {
    id: number;
    name: string;
    email: string;
    company: string | null;
  };
};

type DashboardData = {
  earned: number;
  outstanding: number;
  overdue: number;
  recent: RecentInvoice[];
  income: IncomeItem[];
  counts?: {
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
    total: number;
  };
};

type BusinessSettings = {
  business_name: string;
  currency: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [business, setBusiness] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<DashboardData>("/dashboard"),
      api<BusinessSettings>("/settings").catch(() => ({
        business_name: "My Studio",
        currency: "USD",
      })),
    ])
      .then(([dashData, bizData]) => {
        setData(dashData);
        setBusiness(bizData);
      })
      .catch((err: any) => {
        if (err.message?.includes("Invalid session") || err.message?.includes("unauthorized")) {
          router.push("/login");
        } else {
          toast.error("Could not load dashboard data.");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const currency = business?.currency || "USD";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getTodayFormatted = () => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between">
          <div className="space-y-2">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-9 w-64" />
          </div>
          <div className="skeleton h-10 w-36 rounded-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton h-36 rounded-3xl" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
          <div className="skeleton h-80 rounded-3xl" />
          <div className="skeleton h-80 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    {
      title: "Collected Revenue",
      value: data.earned,
      detail: "Settled & confirmed payments",
      icon: BanknotesIcon,
      bg: "bg-lime text-ink",
      border: "border-lime/40",
      accent: "text-ink",
    },
    {
      title: "Outstanding",
      value: data.outstanding,
      detail: "Sent invoices awaiting payment",
      icon: ClockIcon,
      bg: "bg-white text-ink",
      border: "border-ink/10",
      accent: "text-cobalt",
    },
    {
      title: "Overdue",
      value: data.overdue,
      detail: "Past due date — follow up needed",
      icon: ExclamationCircleIcon,
      bg: "bg-red-50 text-red-950",
      border: "border-red-200",
      accent: "text-red-600",
    },
  ];

  return (
    <>
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow text-cobalt">{getTodayFormatted()}</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
            {getGreeting()}, {business?.business_name || "Alex"}.
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            Here is the real-time financial health and activity of your business.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/clients" className="btn-light !px-4 !py-2.5 text-xs font-bold">
            <UsersIcon className="size-4" />
            <span>Clients</span>
          </Link>
          <Link href="/invoices/new" className="btn-dark !px-4 !py-2.5 text-xs font-bold shadow-sm">
            <PlusIcon className="size-4 stroke-[2.5]" />
            <span>Create invoice</span>
          </Link>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="mt-8 grid gap-5 md:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.title}
              className={`rounded-3xl border ${card.border} ${card.bg} p-6 shadow-sm transition hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">
                  {card.title}
                </p>
                <div className="grid size-9 place-items-center rounded-xl bg-black/5">
                  <Icon className={`size-5 ${card.accent}`} />
                </div>
              </div>

              <p className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl">
                {money(card.value, currency)}
              </p>
              <p className="mt-2 text-xs font-medium opacity-65">{card.detail}</p>
            </article>
          );
        })}
      </section>

      {/* Chart & Quick Insights */}
      <section className="mt-7 w-full">
        {/* Income Over Time Chart */}
        <article className="rounded-[2rem] border border-ink/10 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Income Activity</h2>
              <p className="text-xs text-ink/50">Collected payments across 2026</p>
            </div>
            <span className="badge badge-paid">Settled Revenue</span>
          </div>

          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.income} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: "#E5E7EB" }}
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip
                  cursor={{ fill: "rgba(216, 255, 101, 0.25)" }}
                  formatter={(value: any) => [money(Number(value) || 0, currency), "Revenue"]}
                  contentStyle={{
                    borderRadius: "1rem",
                    border: "1px solid #17202A15",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                />
                <Bar dataKey="income" fill="#4765FF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      {/* Recent Invoices Section */}
      <section className="mt-7 rounded-[2rem] border border-ink/10 bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Recent Invoices</h2>
            <p className="text-xs text-ink/50">Your latest client billing activity</p>
          </div>
          <Link href="/invoices" className="text-xs font-bold text-cobalt hover:underline">
            View all invoices →
          </Link>
        </div>

        <div className="mt-6">
          {data.recent && data.recent.length > 0 ? (
            <div className="divide-y divide-ink/8">
              {data.recent.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="group flex flex-wrap items-center justify-between gap-4 py-4 transition hover:bg-paper/60 sm:flex-nowrap"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-xl bg-ink/5 font-mono text-xs font-bold text-ink">
                      {inv.number.split("-")[1] || "INV"}
                    </div>
                    <div>
                      <p className="font-display font-bold text-ink group-hover:text-cobalt transition">
                        {inv.client.name}
                      </p>
                      <p className="text-xs text-ink/50">
                        {inv.number} · Due {formatDate(inv.due_date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="font-display font-bold text-ink">
                        {money(inv.total, currency)}
                      </p>
                      <span
                        className={`inline-block text-[10px] font-bold uppercase tracking-wider ${
                          inv.status === "paid"
                            ? "text-green-700"
                            : inv.status === "overdue"
                            ? "text-red-600"
                            : "text-cobalt"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <ArrowTopRightOnSquareIcon className="size-4 text-ink/30 group-hover:text-ink transition" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-ink/55">
                No invoices found yet. Create your first invoice to see recent activity here.
              </p>
              <Link href="/invoices/new" className="btn-dark mt-4 inline-flex !py-2 text-xs">
                Create invoice
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

