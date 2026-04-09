"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Login failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="username" className="mb-2 block text-sm text-slate-300">
          Username
        </label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-300/70 focus:ring-2 focus:ring-orange-300/25"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm text-slate-300">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-300/70 focus:ring-2 focus:ring-orange-300/25"
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-500/15 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-gradient-to-r from-orange-400 via-rose-500 to-fuchsia-500 px-4 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}