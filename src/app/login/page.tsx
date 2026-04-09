import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getSessionFromCookieStore } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getSessionFromCookieStore();

  if (session) {
    redirect("/");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-surface p-8 shadow-panel backdrop-blur">
        <p className="text-xs uppercase tracking-[0.32em] text-orange-200/80">Instagram Messaging Ops</p>
        <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold text-white">
          Dashboard Login
        </h1>
        <p className="mt-2 text-sm text-slate-300">Continue with your dashboard credentials.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}