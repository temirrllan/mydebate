"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { UploadCloud, Loader2, X, FileText, Copy, Check, CreditCard, User, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/auth/field-error";
import { formatPriceValue } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Блок «3. Подтверждение оплаты» формы регистрации
 * (макет `maket/Регистрация на турнир 1.png`).
 *
 * Слева — реквизиты организатора, справа — загрузка чека. Файл уходит на
 * сервер сразу при выборе (`POST /api/uploads/payment-receipt`), а в форме
 * остаётся только путь в скрытом поле: сама форма никогда не держит File —
 * тот же контракт, что у обложек турнира (components/tournaments/create/
 * image-upload-field.tsx).
 *
 * Блок рендерится только для платных турниров с регистрацией на платформе —
 * решение принимает страница, здесь этой логики нет.
 */
export function PaymentSection({
  price,
  paymentMethod,
  paymentAccount,
  paymentRecipient,
  errors,
}: {
  price: number;
  paymentMethod: string | null;
  paymentAccount: string | null;
  paymentRecipient: string | null;
  errors?: string[];
}) {
  const t = useTranslations("registration");
  const locale = useLocale();
  const [receiptUrl, setReceiptUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads/payment-receipt", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setUploadError(data.error ?? t("uploadFailed"));
        return;
      }
      setReceiptUrl(data.url);
      setFileName(file.name);
    } catch {
      setUploadError(t("uploadNetworkFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function copyAccount() {
    if (!paymentAccount) return;
    try {
      await navigator.clipboard.writeText(paymentAccount);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Копирование может быть запрещено в настройках браузера — номер виден
      // на экране, выделить и скопировать вручную всегда можно.
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <CreditCard size={20} />
        </span>
        <h2 className="text-lg font-bold text-navy-900">{t("step3")}</h2>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-[var(--radius-btn)] bg-brand-50/70 p-4 text-sm text-ink">
        <Info size={18} className="mt-0.5 shrink-0 text-brand-600" />
        <p>
          {t.rich("paymentIntro", {
            price: formatPriceValue(price, locale),
            // Сумму выделяем жирным: тег живёт прямо в строке словаря, чтобы
            // переводчик мог поставить его в нужное место фразы.
            b: (chunks) => <strong className="font-semibold">{chunks}</strong>,
          })}
        </p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* Реквизиты */}
        <div className="rounded-[var(--radius-btn)] border border-line p-4">
          <p className="text-sm font-semibold text-ink">{t("paymentDetails")}</p>
          <dl className="mt-3 space-y-3 text-sm">
            {paymentMethod && (
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted">
                  <CreditCard size={15} /> {t("paymentMethod")}
                </dt>
                <dd className="font-semibold text-ink">{paymentMethod}</dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted">
                <FileText size={15} /> {t("paymentAccount")}
              </dt>
              <dd className="flex items-center gap-2">
                <span className="font-semibold text-ink">{paymentAccount}</span>
                <button
                  type="button"
                  onClick={copyAccount}
                  className="rounded-md p-1 text-muted transition-colors hover:bg-canvas hover:text-brand-600"
                  aria-label={t("copyAccount")}
                >
                  {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                </button>
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted">
                <User size={15} /> {t("paymentRecipient")}
              </dt>
              <dd className="text-right font-semibold text-ink">{paymentRecipient}</dd>
            </div>
          </dl>
          <p aria-live="polite" className="sr-only">
            {copied ? t("copied") : ""}
          </p>
        </div>

        {/* Загрузка чека */}
        <div>
          <label htmlFor="receipt-upload" className="text-sm font-semibold text-ink">
            {t("receipt")} <span className="text-rose-500">*</span>
          </label>

          <div className="mt-3">
            {receiptUrl ? (
              <div className="flex items-center gap-3 rounded-[var(--radius-btn)] border border-emerald-200 bg-emerald-50/60 p-4">
                <FileText size={20} className="shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{fileName}</p>
                  <p className="text-xs text-emerald-700">{t("receiptUploaded")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReceiptUrl("");
                    setFileName("");
                    setUploadError(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-white hover:text-rose-600"
                  aria-label={t("receiptRemove")}
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <label
                htmlFor="receipt-upload"
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-btn)] border border-dashed px-4 py-8 text-center transition-colors hover:border-brand-400",
                  errors?.length || uploadError ? "border-rose-400" : "border-line",
                )}
              >
                {uploading ? (
                  <>
                    <Loader2 size={22} className="animate-spin text-brand-600" />
                    <span className="text-sm font-medium text-muted">{t("uploading")}</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={22} className="text-brand-600" />
                    <span className="text-sm font-medium text-ink">{t("receiptPick")}</span>
                    <span className="text-xs text-muted">{t("receiptHint")}</span>
                  </>
                )}
                <input
                  ref={inputRef}
                  id="receipt-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
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

          {uploadError && (
            <p role="alert" className="mt-2 text-sm text-rose-600">
              {uploadError}
            </p>
          )}
          <FieldError messages={errors} />

          {/* В форму уходит только путь к уже загруженному файлу. */}
          <input type="hidden" name="receiptUrl" value={receiptUrl} />
        </div>
      </div>
    </Card>
  );
}
