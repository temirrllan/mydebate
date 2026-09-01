"use client";

import { useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelRegistration } from "@/lib/actions/registrations";
import { useTranslations } from "next-intl";

/** Кнопка отмены своей заявки во вкладке «Мои заявки» — с подтверждением и отображением ошибки. */
export function CancelRegistrationButton({ tournamentId }: { tournamentId: string }) {
  const t = useTranslations("profile");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (cancelled) {
    return <span className="text-xs text-muted">{t("cancelled")}</span>;
  }

  if (!confirming) {
    return (
      <Button ref={triggerRef} type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        <X size={14} /> {t("cancel")}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">{t("cancelConfirm")}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          autoFocus
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await cancelRegistration(tournamentId);
              if (!result.ok) {
                setError(result.error);
                setConfirming(false);
                return;
              }
              setCancelled(true);
            });
          }}
        >
          {pending ? t("cancelPending") : t("cancelYes")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setConfirming(false);
            triggerRef.current?.focus();
          }}
          disabled={pending}
        >
          {t("cancelNo")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
