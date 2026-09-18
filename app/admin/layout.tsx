import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-steel-50">
      <div className="no-print border-b border-steel-200 bg-navy-900">
        <div className="container-site flex items-center justify-between py-3 text-[0.8rem] text-white/70">
          <Link href="/" className="font-semibold tracking-wide text-white/90 hover:text-white">
            IMUN — organisers&apos; area
          </Link>
          <span className="text-white/40">Restricted access</span>
        </div>
      </div>
      {children}
    </div>
  );
}