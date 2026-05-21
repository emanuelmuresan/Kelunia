import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.emanuelmuresan.kelunia",
  appName: "Kelunia",
  webDir: "out",
  server: {
    androidScheme: "https",
    appStartPath: "/login.html",
  },
};

export default config;
