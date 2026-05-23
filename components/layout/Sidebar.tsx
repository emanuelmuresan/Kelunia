"use client";

import Link from "next/link";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        Kelunia
      </div>

      <nav className="sidebar-nav">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/locations">Locations</Link>
        <Link href="/settings">Settings</Link>
        <Link href="/billing">Billing</Link>
      </nav>
    </aside>
  );
}
