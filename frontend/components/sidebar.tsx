"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChartPieIcon,
  DocumentTextIcon,
  PlusIcon,
  UsersIcon,
  Cog6ToothIcon,
  ArrowLeftStartOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  BookOpenIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { api, removeToken, toast } from "@/lib/api";

const links = [
  { href: "/dashboard", label: "Overview", icon: ChartPieIcon },
  { href: "/invoices", label: "Invoices", icon: DocumentTextIcon },
  { href: "/clients", label: "Clients", icon: UsersIcon },
  { href: "/guide", label: "Learn & Docs", icon: BookOpenIcon },
  { href: "/settings", label: "Settings", icon: Cog6ToothIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    api("/auth/me")
      .then((data) => setUserEmail(data.email))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    removeToken();
    toast.info("Logged out successfully.");
    router.push("/login");
  };

  return (
    <>
      {/* Mobile top header */}
      <div className="flex h-16 w-full items-center justify-between border-b border-ink/10 bg-paper px-4 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="grid size-8 place-items-center rounded-xl bg-lime text-sm font-sans font-bold text-ink shadow-sm">
            B
          </span>
          BillFlow
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/invoices/new" className="btn-dark !px-3 !py-1.5 text-xs">
            <PlusIcon className="size-3.5" />
            <span>New</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl border border-ink/10 p-2 text-ink/70 hover:bg-ink/5"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <XMarkIcon className="size-5" /> : <Bars3Icon className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 z-40 border-b border-ink/10 bg-white/95 p-4 shadow-xl backdrop-blur md:hidden">
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={clsx(
                    "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold transition",
                    isActive ? "bg-ink text-white" : "text-ink/65 hover:bg-ink/5 hover:text-ink"
                  )}
                >
                  <Icon className="size-5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 border-t border-ink/10 pt-3">
            {userEmail && (
              <p className="px-3 text-xs text-ink/45 truncate mb-2">{userEmail}</p>
            )}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50"
            >
              <ArrowLeftStartOnRectangleIcon className="size-5" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden shrink-0 flex-col justify-between border-r border-ink/10 bg-paper px-5 py-7 md:flex md:w-64 md:min-h-screen">
        <div>
          <Link href="/dashboard" className="flex items-center gap-2.5 font-display text-2xl font-bold tracking-tight">
            <span className="grid size-8 place-items-center rounded-xl bg-lime text-base font-sans font-bold text-ink shadow-sm">
              B
            </span>
            BillFlow
          </Link>

          <div className="mt-8">
            <Link
              href="/invoices/new"
              className="btn-dark w-full !justify-start !px-4 !py-3 shadow-sm hover:shadow-md"
            >
              <PlusIcon className="size-4 stroke-[2.5]" />
              <span>New invoice</span>
            </Link>
          </div>

          <nav className="mt-8 space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition",
                    isActive
                      ? "bg-ink text-white shadow-sm"
                      : "text-ink/60 hover:bg-ink/5 hover:text-ink"
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-ink/10 pt-4 space-y-2">
          <Link
            href="/guide"
            className="flex w-full items-center gap-2.5 rounded-xl border border-ink/10 bg-paper px-3 py-2 text-xs font-bold text-ink/75 hover:bg-ink/5 hover:text-ink transition"
          >
            <BookOpenIcon className="size-4 text-cobalt shrink-0" />
            <span>Learn to Use & Docs</span>
          </Link>
          <Link
            href="/portal"
            target="_blank"
            className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-cobalt/30 bg-cobalt/5 px-3 py-2 text-xs font-bold text-cobalt hover:bg-cobalt/10 transition"
          >
            <span>Client Portal Preview ↗</span>
          </Link>
          {userEmail && (
            <div className="mb-2 px-3 py-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Signed in as</p>
              <p className="truncate text-xs font-semibold text-ink/75" title={userEmail}>
                {userEmail}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-ink/50 hover:bg-ink/5 hover:text-red-600 transition"
          >
            <ArrowLeftStartOnRectangleIcon className="size-5 shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

