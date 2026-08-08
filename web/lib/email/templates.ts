import "server-only";

import { sendEmail } from "@/lib/email/send";

// Шаблоны писем. Вёрстка — инлайн-стили (почтовые клиенты не поддерживают
// внешний CSS и половину современных свойств). Держим просто: карточка,
// кнопка, запасная ссылка текстом. Бренд-цвет #2563EB (см. дизайн-систему).

const BRAND = "#2563EB";
const INK = "#0f172a";
const MUTED = "#64748b";

function layout(bodyHtml: string): string {
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK};">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="padding:24px 32px;border-bottom:1px solid #f1f5f9;">
      <span style="font-size:18px;font-weight:800;color:${INK};">My<span style="color:${BRAND};">Debate</span></span>
    </div>
    <div style="padding:28px 32px;">${bodyHtml}</div>
    <div style="padding:20px 32px;border-top:1px solid #f1f5f9;font-size:12px;color:${MUTED};">
      Это письмо отправлено автоматически. Если вы не запрашивали действие — просто проигнорируйте его.
    </div>
  </div>
</body></html>`;
}

/** Абсолютный базовый URL для ссылок в письмах (в письме относительный путь бесполезен). */
function baseUrl(): string {
  return process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

/** HTML-экранирование пользовательского текста (название турнира, имя и т.п.), попадающего в письмо. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Универсальное письмо-уведомление — email-дубль in-app уведомления
 * (createNotification). title/message приходят из события (модерация,
 * статус заявки, новый участник и т.п.); link — относительный путь внутри
 * приложения, превращаем в абсолютный и вешаем кнопку «Открыть».
 */
export async function sendNotificationEmail(
  to: string,
  input: { title: string; message: string; link?: string | null },
): Promise<boolean> {
  const url = input.link ? `${baseUrl()}${input.link}` : null;

  const html = layout(`
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:800;color:${INK};">${escapeHtml(input.title)}</h1>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${MUTED};">${escapeHtml(input.message)}</p>
    ${
      url
        ? `<a href="${url}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;">Открыть на сайте</a>`
        : ""
    }
  `);

  const text = [input.title, "", input.message, ...(url ? ["", url] : [])].join("\n");

  return sendEmail({ to, subject: `${input.title} — MyDebate`, html, text });
}

/**
 * Письмо сброса пароля. Ссылка действует 1 час (см. requestPasswordReset).
 * Отправляем и HTML, и текстовую версию (для клиентов без HTML и антиспама).
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const subject = "Сброс пароля — MyDebate";

  const html = layout(`
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:800;color:${INK};">Сброс пароля</h1>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${MUTED};">
      Вы запросили сброс пароля для вашего аккаунта MyDebate. Нажмите кнопку ниже, чтобы задать новый
      пароль. Ссылка действительна <strong>1 час</strong>.
    </p>
    <a href="${resetUrl}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;">
      Сбросить пароль
    </a>
    <p style="margin:24px 0 6px;font-size:12px;color:${MUTED};">Если кнопка не работает, скопируйте ссылку в браузер:</p>
    <p style="margin:0;font-size:12px;word-break:break-all;"><a href="${resetUrl}" style="color:${BRAND};">${resetUrl}</a></p>
  `);

  const text = [
    "Сброс пароля — MyDebate",
    "",
    "Вы запросили сброс пароля для вашего аккаунта MyDebate.",
    "Перейдите по ссылке, чтобы задать новый пароль (действует 1 час):",
    resetUrl,
    "",
    "Если вы не запрашивали сброс — проигнорируйте это письмо.",
  ].join("\n");

  return sendEmail({ to, subject, html, text });
}
