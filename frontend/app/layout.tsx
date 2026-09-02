import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer } from "@/components/toast-container";

export const metadata: Metadata = {
  title: "BillFlow — Get paid beautifully",
  description: "Invoicing that gives independent work a better flow.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}

