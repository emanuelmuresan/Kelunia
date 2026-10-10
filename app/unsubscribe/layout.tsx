import type { Metadata } from "next";

// Pagina de dezabonare este personală (primește emailul în adresă), deci nu trebuie indexată de motoarele de căutare.
export const metadata: Metadata = {
  title: "Kelunia",
  robots: { index: false, follow: false },
};

export default function UnsubscribeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
