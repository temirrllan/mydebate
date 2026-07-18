"use client";

import { createContext, useContext, useMemo, useState } from "react";

// Общее состояние поиска между полем ввода в Hero-блоке и списком аккордеона
// в секции «Часто задаваемые вопросы» — эти два блока визуально разнесены по
// странице, поэтому используем Context вместо пропа между соседями. Оборачивать
// нужно только сегмент от Hero до FAQ-секции (см. app/help/page.tsx).
type FaqContextValue = {
  query: string;
  setQuery: (value: string) => void;
};

const FaqContext = createContext<FaqContextValue | null>(null);

export function FaqProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const value = useMemo(() => ({ query, setQuery }), [query]);
  return <FaqContext.Provider value={value}>{children}</FaqContext.Provider>;
}

export function useFaqQuery() {
  const ctx = useContext(FaqContext);
  if (!ctx) {
    throw new Error("useFaqQuery must be used within a FaqProvider");
  }
  return ctx;
}
