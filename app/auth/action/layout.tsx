import type { Metadata } from "next";

// Pagina pentru linkurile din emailuri (confirmare email, parolă nouă) primește un cod personal în adresă, deci nu trebuie indexată.
export const metadata: Metadata = {
  title: "Kelunia",
  robots: { index: false, follow: false },
};

export default function AuthActionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
