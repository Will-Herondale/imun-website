"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push("/admin");
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Login failed. Check your credentials.");
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div>
        <label className="field-label" htmlFor="a-email">Organiser email</label>
        <input
          id="a-email" name="email" type="email" autoComplete="username" required
          className="input" value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="mt-5">
        <label className="field-label" htmlFor="a-password">Password</label>
        <input
          id="a-password" name="password" type="password" autoComplete="current-password" required
          className="input" value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error ? (
        <p className="field-error mt-4" role="alert">{error}</p>
      ) : (
        <p className="mt-4 text-[0.82rem] text-steel-500">
          Protected area. Access is limited to the organising secretariat.
        </p>
      )}

      <button type="submit" disabled={busy} className="btn btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}