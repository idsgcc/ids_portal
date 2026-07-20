import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { ThemeToggle } from "./components/ThemeToggle";
import { NavMenu } from "./components/NavMenu";
import { LogoutButton } from "./components/LogoutButton";
import { VERSION } from "../lib/version";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IDS Operations Portal",
  description: "Internal tools for IDS-GCC",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: { full_name: string; role: string } | null = null;
  let accessibleModules: string[] = [];

  if (user) {
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    profile = p;

    if (p) {
      const { data: perms } = await supabaseAdmin
        .from("module_permissions")
        .select("module, can_access")
        .eq("role", p.role);

      accessibleModules = (perms ?? [])
        .filter((x) => x.can_access)
        .map((x) => x.module);
    }
  }

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <header className="border-b border-gray-200 dark:border-gray-800 px-8 py-3 flex items-center justify-between">
            <a href="/">
              <Image src="/IDSLogo.png" alt="IDS Logo" width={180} height={108} className="h-20 w-auto" priority />
            </a>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 dark:text-gray-600 font-mono">{VERSION}</span>
              {user && (
                <>
                  <a href="/account" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors hidden sm:block">
                    {profile?.full_name || user.email}
                  </a>
                  <NavMenu accessibleModules={accessibleModules} />
                  <LogoutButton />
                </>
              )}
              <ThemeToggle />
            </div>
          </header>
          <div className="flex-1">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
