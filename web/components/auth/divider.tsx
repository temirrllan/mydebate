"use client";

import { useTranslations } from "next-intl";

export function OrDivider({ label }: { label?: string }) {
  const t = useTranslations("auth");
  const text = label ?? t("or");
  return (
    <div className="relative flex items-center py-1">
      <div className="h-px flex-1 bg-line" />
      <span className="px-3 text-xs uppercase tracking-wide text-muted">{text}</span>
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}
