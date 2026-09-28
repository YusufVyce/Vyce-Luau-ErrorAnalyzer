/**
 * Site preferences: color theme (light / dark / system) and language (en / tr).
 * Stored in localStorage only.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { UI, type UiKey } from "./i18n/ui";

export type Theme = "light" | "dark" | "system";
export type Lang = "en" | "tr";

const THEME_KEY = "vyce-theme";
const LANG_KEY = "vyce-lang";

/** Inline script for <head>: applies the saved theme before the first paint. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light");var l=localStorage.getItem("${LANG_KEY}")||((navigator.language||"").toLowerCase().indexOf("tr")===0?"tr":"en");document.documentElement.setAttribute("lang",l)}catch(e){}`;

interface Prefs {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  lang: Lang;
  setTheme: (t: Theme) => void;
  setLang: (l: Lang) => void;
}

const PrefsContext = createContext<Prefs>({
  theme: "system",
  resolvedTheme: "light",
  lang: "en",
  setTheme: () => {},
  setLang: () => {},
});

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage blocked: the choice lasts until the tab closes
  }
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [lang, setLangState] = useState<Lang>("en");
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const t = read(THEME_KEY);
    if (t === "light" || t === "dark" || t === "system") setThemeState(t);
    const l = read(LANG_KEY);
    if (l === "en" || l === "tr") setLangState(l);
    else if (navigator.language?.toLowerCase().startsWith("tr")) setLangState("tr");
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    write(THEME_KEY, t);
  }, []);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    write(LANG_KEY, l);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, lang, setTheme, setLang }) as Prefs,
    [theme, resolvedTheme, lang, setTheme, setLang],
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  return useContext(PrefsContext);
}

export type TFunction = (key: UiKey, vars?: Record<string, string | number>) => string;

/** Translation function for UI text. `{name}` placeholders are filled from `vars`. */
export function useT(): TFunction {
  const { lang } = usePrefs();
  return useCallback(
    (key, vars) => {
      let s: string = UI[lang][key] ?? UI.en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
      return s;
    },
    [lang],
  );
}

/** Picks the Turkish or English variant of a piece of content. */
export function useLang() {
  return usePrefs().lang;
}
