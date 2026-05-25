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
