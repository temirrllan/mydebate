import "server-only";

import { headers } from "next/headers";

// Ограничение частоты запросов (rate-limiting) — защита от брутфорса и
// credential stuffing на auth-экшенах (вход, регистрация, сброс пароля).
//
// Хранилище — in-memory Map в памяти процесса. Для одного инстанса (наш
// деплой: один VPS, один Node-процесс) этого достаточно и не тянет лишних
// зависимостей (Redis и т.п.). ВАЖНО: при горизонтальном масштабировании
// (несколько инстансов) счётчик станет неточным — тогда вынести в общий
// стор. Для MVP на одном сервере — ок.
//
// Алгоритм — фиксированное окно: на ключ (IP+действие или email+действие)
// считаем попытки в текущем окне; при превышении лимита блокируем до конца
// окна. Простее скользящего окна и достаточно против перебора.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Периодическая чистка протухших записей, чтобы Map не рос бесконечно при
// множестве уникальных ключей (IP-адресов). Интервал не критичен.
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = 0;

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  /** Сколько секунд ждать до следующей попытки (когда ok=false). */
  retryAfterSec: number;
};

/**
 * Проверяет и инкрементирует счётчик для ключа. Возвращает ok=false, если
 * лимит исчерпан. НЕ бросает исключений.
 *
 * @param key    уникальный ключ (например `login:1.2.3.4` или `login:user@mail`)
 * @param limit  максимум попыток в окне
 * @param windowMs длина окна в миллисекундах
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  // now без Date.now() недоступен в некоторых окружениях (воркфлоу), но здесь
  // обычный рантайм Node — Date.now() доступен.
  const now = Date.now();
  cleanup(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

/** Сбрасывает счётчик по ключу — вызывать после УСПЕШНОГО действия (чтобы
 *  удачный вход не «съедал» лимит на будущее). */
export function rateLimitReset(key: string): void {
  buckets.delete(key);
}

/**
 * IP клиента из заголовков прокси. За nginx на проде реальный адрес приходит
 * в X-Forwarded-For (nginx настроим прокидывать его). Берём первый адрес из
 * списка. Фолбэк — X-Real-IP, затем "unknown" (тогда лимит общий — безопасная
 * сторона: скорее пере-, чем недо-ограничить).
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip")?.trim() || "unknown";
}
