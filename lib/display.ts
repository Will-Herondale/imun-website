import { committeeByCode } from "@/lib/config/committees";

export function committeeName(code: string): string {
  return committeeByCode(code)?.name ?? code;
}