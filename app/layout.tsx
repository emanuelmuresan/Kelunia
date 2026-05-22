import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ShellModeClass } from "@/components/ShellModeClass";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
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
        <Script id="kelunia-shell-mode" strategy="beforeInteractive">
          {`
            (function () {
              try {
                var standalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
                var iosStandalone = window.navigator && window.navigator.standalone === true;
                var capacitor = window.Capacitor;
                var platform = capacitor && capacitor.getPlatform && capacitor.getPlatform();
                var nativeShell = window.location.protocol === "capacitor:" || window.location.protocol === "ionic:" || (capacitor && capacitor.isNativePlatform && capacitor.isNativePlatform()) || (platform && platform !== "web");
                document.documentElement.classList.add((standalone || iosStandalone || nativeShell) ? "kelunia-installed-shell" : "kelunia-browser-shell");
                if (nativeShell) {
                  document.documentElement.classList.add("kelunia-native-shell");
                  if (platform) {
                    document.documentElement.classList.add("kelunia-" + platform + "-shell");
                  }
                }
              } catch (error) {
                document.documentElement.classList.add("kelunia-browser-shell");
              }
            })();
          `}
        </Script>
        <AuthProvider>
          <ShellModeClass />
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
