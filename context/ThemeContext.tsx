"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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

export function ThemeProvider({
  children,
}: ThemeProviderProps) {
  const [theme, setTheme] =
    useState<Theme>("dark");

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