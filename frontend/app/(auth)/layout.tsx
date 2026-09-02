import Link from "next/link";
export default function AuthLayout({children}:{children:React.ReactNode}) { return <main className="gridline min-h-screen p-5"><Link href="/" className="mx-auto flex max-w-md items-center gap-2 font-display text-xl font-bold"><span className="grid size-7 place-items-center rounded-lg bg-lime text-sm font-sans">B</span>BillFlow</Link>{children}</main> }
