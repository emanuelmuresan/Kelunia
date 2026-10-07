// Configurarea aplicației native Capacitor (Android și iOS): încarcă fișierele exportate din out/ și pornește pe pagina de login.
// Pe Android aplicația este servită prin https://localhost; notificările push apar cu insignă, sunet, banner și în listă.
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.emanuelmuresan.kelunia",
  appName: "Kelunia",
  webDir: "out",
  server: {
    androidScheme: "https",
    appStartPath: "/login.html",
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "banner", "list"],
    },
  },
};

export default config;
