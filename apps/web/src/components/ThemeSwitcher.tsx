"use client";

import { useEffect, useState } from "react";

import { defaultTheme, themes, themeStorageKey, type ThemeName } from "@/lib/themes";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeName>(defaultTheme);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(themeStorageKey) as ThemeName | null;
      const nextTheme = themes.some((item) => item.id === stored) ? (stored as ThemeName) : defaultTheme;
      document.documentElement.dataset.theme = nextTheme;
      setTheme(nextTheme);
    } catch {
      document.documentElement.dataset.theme = defaultTheme;
      setTheme(defaultTheme);
    }
  }, []);

  function applyTheme(nextTheme: ThemeName) {
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
    try {
      localStorage.setItem(themeStorageKey, nextTheme);
    } catch {
      // ignore local storage failures
    }
  }

  return (
    <div className="theme-switcher" aria-label="Theme switcher">
      <span className="theme-label">Theme</span>
      <div className="theme-row">
        {themes.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`theme-circle ${theme === item.id ? "is-active" : ""}`}
            title={item.label}
            aria-label={`Switch to ${item.label} theme`}
            aria-pressed={theme === item.id}
            onClick={() => applyTheme(item.id)}
          >
            <span className="theme-circle-swatch" style={{ background: item.swatch }} />
          </button>
        ))}
      </div>
    </div>
  );
}
