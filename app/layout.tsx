// Layout-ul rădăcină al aplicației: se aplică tuturor paginilor (stiluri, autentificare, înregistrare PWA, confirmări).
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ShellModeClass } from "@/components/ShellModeClass";
import { ConfirmProvider } from "@/features/shell/components/ConfirmDialog";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import PwaRegister from "./pwa-register";

// Metadatele implicite ale aplicației (titlu, descriere, manifest PWA, iconițe pentru iOS).
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

// Setări de afișare pe mobil: culoarea barei de sistem și folosirea întregului ecran (inclusiv zona cu „notch").
export const viewport: Viewport = {
  themeColor: "#1787ff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Structura HTML comună; textul aplicației este implicit în română.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro">
      <body>
        {/* Script mic care rulează înainte de pagină și marchează <html> dacă aplicația rulează ca PWA instalat sau în shell-ul nativ Capacitor, ca să aplicăm stilurile potrivite. */}
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
        {/* Totul din aplicație stă în furnizorul de autentificare, iar confirmările (ștergere etc.) au propriul furnizor. */}
        <AuthProvider>
          {/* Marchează rapid modul de afișare și înregistrează service worker-ul (PWA). */}
          <ShellModeClass />
          <PwaRegister />
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
          {/* Subsol comun cu semnătura aplicației. */}
          <footer className="app-footer">
            <img src="/semnatura.png" alt="Semnătură" />
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
