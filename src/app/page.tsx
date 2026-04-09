import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { getSessionFromCookieStore } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSessionFromCookieStore();

  if (!session) {
    redirect("/login");
  }

  return <DashboardShell initialConversations={[]} />;
}

