"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "control-horas-theme";

export function useTheme() {
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    const enabled = saved ? saved === "dark" : true;
    setDarkMode(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  }, []);

  function toggleTheme() {
    setDarkMode((current) => {
      const next = !current;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      return next;
    });
  }

  return { darkMode, toggleTheme };
}
