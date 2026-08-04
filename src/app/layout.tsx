import type { Metadata } from "next";
import "./globals.css";
import "./auth-extra.css";
import "./password-controls.css";
import "./home-auth.css";
import "./profile-progress.css";

export const metadata: Metadata = {
  title: "Skyverse — Mainkan Duniamu",
  description: "Platform game komunitas dengan petualangan untuk semua pemain.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
