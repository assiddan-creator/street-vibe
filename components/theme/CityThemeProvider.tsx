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
  const bgUrl = tokens.bg;

  useEffect(() => {
    applyDialectThemeToDocument(tokens);
  }, [tokens]);

  const value = useMemo(() => ({ setDialect }), [setDialect]);

  return (
    <CityThemeContext.Provider value={value}>
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-fixed transition-[background-image] duration-500"
        style={{ backgroundImage: `url(${bgUrl})` }}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-[1] bg-black/70 backdrop-blur-xl" aria-hidden />
      <div className="relative z-10 min-h-[100vh] min-h-[100dvh] overflow-y-auto text-white">{children}</div>
    </CityThemeContext.Provider>
  );
}
