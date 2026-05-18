import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import type { Metadata, Viewport } from "next";
import PwaRegister from "./pwa-register";

export const metadata: Metadata = {
  title: "Kelunia",
  description: "Kelunia organizeaza programari, sali, locatii, echipe si programari recurente intr-un singur loc.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kelunia",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1787ff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro">
      <body>
        <AuthProvider>
          <PwaRegister />
          {children}
          <footer className="app-footer">
            <img src="/semnatura.png" alt="Semnătură" />
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
