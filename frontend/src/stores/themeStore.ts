import { create } from "zustand";

type Theme = "dark" | "light";

type ThemeState = {
  theme: Theme;
  toggle: () => void;
};

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("ac-theme");
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
}

const initial = getInitialTheme();
applyThemeClass(initial);

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initial,
  toggle: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    localStorage.setItem("ac-theme", next);
    applyThemeClass(next);
    set({ theme: next });
  },
}));
