"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { FieldError } from "@/components/auth/field-error";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/**
 * Загрузка изображения (обложка/логотип турнира), шаг 2 мастера. Грузит
 * файл сразу при выборе на `POST /api/uploads/tournament-image`
 * (multipart, поле "file") и кладёт в состояние формы результирующий путь —
 * сама форма никогда не держит File, только уже загруженную строку-путь
 * (контракт lib/actions/tournaments.ts).
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  required,
  shape = "wide",
  hint,
  errors,
}: {
  label: string;
  value: string;
  onChange: (path: string) => void;
  required?: boolean;
  shape?: "wide" | "square";
  hint?: string;
  errors?: string[];
}) {
  const t = useTranslations("createTournament");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `upload-${label.replace(/\s+/g, "-").toLowerCase()}`;

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads/tournament-image", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? t("uploadFailed"));
        return;
      }
      onChange(data.url);
    } catch {
      setError(t("uploadNetworkFailed"));
    } finally {
      setUploading(false);
    }
  }

  const box = shape === "square" ? "h-28 w-28" : "h-36 w-full";

  return (
    <div>
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="mt-1.5">
        {value ? (
          <div className={cn("relative overflow-hidden rounded-[var(--radius-btn)] border border-line bg-canvas", box)}>
            <Image src={value} alt="" fill sizes="320px" className="object-cover" />
            <button
              type="button"
              onClick={() => {
                onChange("");
                setError(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-navy-900/70 text-white transition-colors hover:bg-navy-900"
              aria-label={t("imageRemove", { label })}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <label
            htmlFor={inputId}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[var(--radius-btn)] border border-dashed px-3 text-center text-xs font-medium text-muted transition-colors hover:border-brand-400 hover:text-brand-600",
              box,
              errors?.length ? "border-rose-400" : "border-line",
            )}
          >
            {uploading ? (
              <>
                <Loader2 size={20} className="animate-spin text-brand-600" />
                {t("uploading")}
              </>
            ) : (
              <>
                <UploadCloud size={20} />
                {t("uploadImage")}
              </>
            )}
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </label>
        )}
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && <p role="alert" className="mt-1.5 text-sm text-rose-600">❌ {error}</p>}
      <FieldError messages={errors} />
    </div>
  );
}
