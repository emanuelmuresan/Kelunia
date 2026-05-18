"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

type AppContextValue = {
  sidebarOpen: boolean;

  setSidebarOpen: (
    value: boolean
  ) => void;
};

const AppContext =
  createContext<AppContextValue | null>(
    null
  );

type AppProviderProps = {
  children: React.ReactNode;
};

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