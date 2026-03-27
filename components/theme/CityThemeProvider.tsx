"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyDialectThemeToDocument } from "@/lib/applyDialectTheme";
import { DEFAULT_DIALECT_ID, getCityThemeForDialect } from "@/lib/themeConfig";

type CityThemeContextValue = {
  setDialect: (dialectId: string) => void;
};

const CityThemeContext = createContext<CityThemeContextValue | null>(null);

export function useCityTheme(): CityThemeContextValue {
  const ctx = useContext(CityThemeContext);
  if (!ctx) {
    throw new Error("useCityTheme must be used within CityThemeProvider");
  }
  return ctx;
}

/** Optional: pages that render outside provider (tests) can use no-op. */
export function useCityThemeOptional(): CityThemeContextValue | null {
  return useContext(CityThemeContext);
}

export function CityThemeProvider({ children }: { children: ReactNode }) {
  const [dialectId, setDialectId] = useState(DEFAULT_DIALECT_ID);

  const setDialect = useCallback((id: string) => {
    setDialectId(id || DEFAULT_DIALECT_ID);
  }, []);

  const tokens = useMemo(() => getCityThemeForDialect(dialectId), [dialectId]);

  useEffect(() => {
    applyDialectThemeToDocument(tokens);
  }, [tokens]);

  const value = useMemo(() => ({ setDialect }), [setDialect]);

  return (
    <CityThemeContext.Provider value={value}>
      <div
        className="city-theme-ambient pointer-events-none fixed inset-0 z-0 transition-[background-image] duration-700 ease-out"
        style={{
          backgroundColor: "#000000",
          backgroundImage: `
            radial-gradient(ellipse 90% 65% at 92% 0%, color-mix(in srgb, var(--theme-glow) 7%, transparent) 0%, transparent 58%),
            radial-gradient(ellipse 88% 62% at 8% 100%, color-mix(in srgb, var(--accent) 6%, transparent) 0%, transparent 55%)
          `,
        }}
        aria-hidden
      />
      <div className="relative z-10 min-h-[100vh] min-h-[100dvh] overflow-y-auto text-white">{children}</div>
    </CityThemeContext.Provider>
  );
}
