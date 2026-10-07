"use client";

// Context pentru tema vizuală (luminos/întunecat), salvată în localStorage sub cheia „kelunia-theme”.
// Neutilizat în prezent; tema este aplicată prin atributul data-theme de pe <html>.
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// Temele disponibile și forma valorii expuse.
type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;

  setTheme: (
    theme: Theme
  ) => void;

  toggleTheme: () => void;
};

const ThemeContext =
  createContext<ThemeContextValue | null>(
    null
  );

type ThemeProviderProps = {
  children: React.ReactNode;
};

// Provider: pornește cu tema întunecată și citește apoi preferința salvată.
export function ThemeProvider({
  children,
}: ThemeProviderProps) {
  const [theme, setTheme] =
    useState<Theme>("dark");

  // La încărcare preia tema salvată, dacă este validă.
  useEffect(() => {
    const savedTheme =
      window.localStorage.getItem(
        "kelunia-theme"
      ) as Theme | null;

    if (
      savedTheme === "light" ||
      savedTheme === "dark"
    ) {
      setTheme(savedTheme);
    }
  }, []);

  // La fiecare schimbare scrie tema pe <html> (data-theme) și în localStorage.
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    window.localStorage.setItem(
      "kelunia-theme",
      theme
    );
  }, [theme]);

  // Comută între întunecat și luminos.
  function toggleTheme() {
    setTheme((current) =>
      current === "dark"
        ? "light"
        : "dark"
    );
  }

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook de acces; aruncă o eroare clară dacă lipsește providerul.
export function useTheme() {
  const context =
    useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme trebuie folosit în ThemeProvider."
    );
  }

  return context;
}