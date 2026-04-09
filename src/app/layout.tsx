import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Instagram DM Agent",
  description: "Meta Instagram Messaging dashboard with AI and human handoff.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-[#050816] text-white">{children}</body>
    </html>
  );
}

