"use client";

// Schelet de layout (bară laterală, bară de sus, navigare mobilă); neutilizat în prezent.
// Aplicația folosește KeluniaShellChrome din features/shell.
import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-shell-content">
        <Topbar />

        <main className="app-main">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}