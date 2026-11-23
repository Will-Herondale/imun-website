import { redirect } from "next/navigation";
import { getActiveProfile } from "./profiles";

export async function requireFullMode() {
  const profile = await getActiveProfile().catch(() => ({ mode: "standby" as const }));
  if (profile.mode !== "full") redirect("/");
}
