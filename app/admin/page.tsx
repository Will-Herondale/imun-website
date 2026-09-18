import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegistrationsDashboard } from "@/components/admin/RegistrationsDashboard";
import { readAdminSession } from "@/lib/api";

export const metadata: Metadata = {
  title: "Registrations",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  const session = await readAdminSession();
  if (!session) redirect("/admin/login");

  return <RegistrationsDashboard email={session.email} />;
}