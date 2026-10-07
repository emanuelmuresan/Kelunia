"use client";

// Navigare principală cu două linkuri (Calendar, Setări) care marchează pagina activă; neutilizată în prezent.
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationItem = {
  href: string;
  label: string;
};

const items: NavigationItem[] = [
  {
    href: "/",
    label: "Calendar",
  },
  {
    href: "/settings",
    label: "Setări",
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigare principală"
      className="app-navigation"
    >
      {items.map((item) => {
        const active =
          pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "nav-link active"
                : "nav-link"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}