import type { Metadata } from "next";
import "./globals.css";
import "./auth-extra.css";
import "./password-controls.css";
import "./home-auth.css";
import "./profile-progress.css";
import "./analytics.css";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Skyverse — Mainkan Duniamu",
  description: "Platform game komunitas dengan petualangan untuk semua pemain.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user=await getCurrentUser();
  return <html lang="id"><body>{children}<GoogleAnalytics userId={user?.id}/></body></html>;
}
