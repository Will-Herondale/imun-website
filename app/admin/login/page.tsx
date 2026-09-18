import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { readAdminSession } from "@/lib/api";

export const metadata: Metadata = {
  title: "Organisers",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await readAdminSession();
  if (session) redirect("/admin");

  return (
    <div className="container-site flex min-h-[calc(100dvh-3.5rem)] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <p className="kicker flex items-center gap-3">
          <span aria-hidden="true" className="inline-block h-px w-8 bg-brass-600/70" />
          Restricted
        </p>
        <h1 className="mt-4 font-display text-[2.2rem] font-medium text-navy-900">Organiser sign in</h1>
        <p className="mt-3 text-[0.95rem] text-steel-500">
          This area is for members of the IMUN secretariat only.
        </p>
        <div className="mt-8 border border-steel-200 bg-white p-7 shadow-[var(--shadow-card)] md:p-9">
          <LoginForm />
        </div>
        <p className="mt-5 text-center text-[0.82rem] text-steel-400">
          Registration data stored here is visible only to authorised organisers.
        </p>
      </div>
    </div>
  );
}