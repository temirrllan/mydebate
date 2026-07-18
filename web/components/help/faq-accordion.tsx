"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { FAQ_ITEMS } from "./faq-data";
import { useFaqQuery } from "./faq-provider";

/** Аккордеон ЧЗВ — первый пункт раскрыт по умолчанию; фильтруется по FaqProvider.query. */
export function FaqAccordion() {
  const { query } = useFaqQuery();
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null);

  const normalized = query.trim().toLowerCase();
  const items = normalized
    ? FAQ_ITEMS.filter(
        (item) =>
          item.question.toLowerCase().includes(normalized) ||
          item.answer.toLowerCase().includes(normalized),
      )
    : FAQ_ITEMS;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={HelpCircle}
        title="Ничего не найдено"
        description="Попробуйте изменить запрос или свяжитесь с нашей командой поддержки ниже."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const isOpen = openId === item.id;
        const panelId = `faq-panel-${item.id}`;
        const buttonId = `faq-button-${item.id}`;
        return (
          <Card key={item.id} className="overflow-hidden">
            <button
              id={buttonId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-600">
                ?
              </span>
              <span className="flex-1 font-medium text-ink">{item.question}</span>
              <ChevronDown
                size={20}
                className={cn(
                  "shrink-0 text-muted transition-transform duration-200",
                  isOpen && "rotate-180 text-brand-600",
                )}
                aria-hidden="true"
              />
            </button>
            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className="px-5 pb-5 pl-[3.75rem] text-sm leading-relaxed text-muted"
              >
                {item.answer}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
