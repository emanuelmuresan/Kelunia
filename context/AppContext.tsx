"use client";

// Context pentru starea generală a interfeței (momentan doar bara laterală deschisă/închisă).
// Neutilizat în prezent; rămâne ca punct de extindere pentru scheletul de layout din components/layout.
import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

// Forma valorii expuse de context.
type AppContextValue = {
  sidebarOpen: boolean;

  setSidebarOpen: (
    value: boolean
  ) => void;
};

// Contextul propriu-zis; valoarea implicită null semnalează folosirea în afara providerului.
const AppContext =
  createContext<AppContextValue | null>(
    null
  );

type AppProviderProps = {
  children: React.ReactNode;
};

// Provider care ține starea și o dă copiilor.
export function AppProvider({
  children,
}: AppProviderProps) {
  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const value = useMemo(
    () => ({
      sidebarOpen,
      setSidebarOpen,
    }),
    [sidebarOpen]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// Hook de acces; aruncă o eroare clară dacă lipsește providerul.
export function useAppContext() {
  const context =
    useContext(AppContext);

  if (!context) {
    throw new Error(
      "useAppContext trebuie folosit în AppProvider."
    );
  }

  return context;
}