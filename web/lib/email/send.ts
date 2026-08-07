import "server-only";

import nodemailer from "nodemailer";

// Единая точка отправки писем (сброс пароля и будущие уведомления). Транспорт
// настраивается через SMTP-переменные окружения, поэтому провайдер сменить
// можно без правок кода (сейчас — Gmail SMTP, см. .env):
//
//   SMTP_HOST      smtp.gmail.com
//   SMTP_PORT      465            (SSL) или 587 (STARTTLS)
//   SMTP_USER      mydebate1@gmail.com
//   SMTP_PASSWORD  App Password из Google (16 символов, БЕЗ пробелов)
//   EMAIL_FROM     MyDebate <mydebate1@gmail.com>
//
// Если SMTP не настроен (нет SMTP_HOST/USER/PASSWORD) — не падаем, а печатаем
// письмо в консоль (dev-фолбэк, как было со ссылкой сброса раньше). Так
// локальная разработка без реальных кредов продолжает работать.

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function isConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

let cachedTransport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
  if (cachedTransport) return cachedTransport;
  const port = Number(process.env.SMTP_PORT ?? 465);
  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 → неявный TLS (secure), 587 → STARTTLS (secure:false + upgrade).
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  return cachedTransport;
}

/** Отправитель по умолчанию — из EMAIL_FROM, иначе SMTP_USER. */
function fromAddress(): string {
  return process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? "MyDebate <no-reply@localhost>";
}

/**
 * Отправляет письмо. Возвращает true при успехе. Ошибки НЕ пробрасывает —
 * логирует и возвращает false: вызывающий код (напр. сброс пароля) не должен
 * падать из-за сбоя почты, а пользователю всё равно показываем нейтральное
 * сообщение (не раскрываем, существует ли email).
 */
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<boolean> {
  if (!isConfigured()) {
    console.log(
      `[email] SMTP не настроен — письмо не отправлено. To: ${to} | Тема: ${subject}\n${text}`,
    );
    return false;
  }

  try {
    await getTransport().sendMail({ from: fromAddress(), to, subject, html, text });
    console.log(`[email] Отправлено: "${subject}" → ${to}`);
    return true;
  } catch (error) {
    console.error(`[email] Не удалось отправить письмо на ${to}:`, error);
    return false;
  }
}
