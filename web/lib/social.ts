// Ссылки на соцсети организатора: приведение того, что он ввёл, к рабочему URL.
//
// В форме создания турнира поля Instagram/TikTok/Telegram — обычные текстовые
// инпуты с плейсхолдером «@mydebate», и организаторы так и пишут: «@mydebate»,
// «mydebate», «instagram.com/mydebate». Раньше значение подставлялось в
// href как есть — браузер считал его ОТНОСИТЕЛЬНЫМ путём и вместо профиля
// открывал mydebate.kz/@mydebate (404). Отсюда жалоба «ссылки соцсетей
// открываются некорректно».
//
// Нормализуем на выводе, а не при сохранении: так чинятся и уже лежащие в
// базе записи, и организатору не приходится переоформлять турнир.

export type SocialNetwork = "instagram" | "telegram" | "tiktok";

/** Куда ведёт ссылка, если организатор ввёл голый ник (без домена). */
const HANDLE_BASE: Record<SocialNetwork, string> = {
  instagram: "https://www.instagram.com/",
  telegram: "https://t.me/",
  // У TikTok ник в адресе идёт со собакой: tiktok.com/@user.
  tiktok: "https://www.tiktok.com/@",
};

/** Домены, которые считаем «уже ссылкой», даже если протокол не написан. */
const KNOWN_HOSTS: Record<SocialNetwork, string[]> = {
  instagram: ["instagram.com", "instagr.am"],
  telegram: ["t.me", "telegram.me", "telegram.dog"],
  tiktok: ["tiktok.com", "vm.tiktok.com"],
};

/** Ник: буквы/цифры/точка/подчёркивание/дефис — то, что допускают все три сети. */
const HANDLE_RE = /^[A-Za-z0-9._-]{1,100}$/;

/**
 * Приводит введённое организатором значение к абсолютному https-адресу.
 * Возвращает `null`, если ссылку построить нельзя (пусто, чужой протокол,
 * мусор) — вызывающий код в этом случае просто не рисует иконку.
 *
 * Принимаем всё, чем реально заполняют такие поля:
 *   «@mydebate» / «mydebate»          → https://www.instagram.com/mydebate
 *   «instagram.com/mydebate»          → https://instagram.com/mydebate
 *   «https://www.instagram.com/x/»    → без изменений
 *
 * Протоколы, кроме http/https, отбрасываем осознанно: значение приходит из
 * формы и лежит в базе, а попадает в href — «javascript:...» здесь был бы
 * XSS-вектором на публичной странице турнира.
 */
export function normalizeSocialUrl(
  value: string | null | undefined,
  network: SocialNetwork,
): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  // Уже с протоколом — пропускаем только http/https.
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    if (!/^https?:\/\//i.test(raw)) return null;
    return safeUrl(raw);
  }

  const withoutSlashes = raw.replace(/^\/+/, "");

  // Домен без протокола («instagram.com/x», «www.t.me/x») — дописываем https.
  const host = withoutSlashes.replace(/^www\./i, "").split(/[/?#]/)[0].toLowerCase();
  if (KNOWN_HOSTS[network].includes(host) || host.endsWith(`.${KNOWN_HOSTS[network][0]}`)) {
    return safeUrl(`https://${withoutSlashes}`);
  }

  // Иначе — считаем ником: «@mydebate», «mydebate», «mydebate/».
  const handle = withoutSlashes.replace(/^@+/, "").replace(/\/+$/, "");
  if (!HANDLE_RE.test(handle)) return null;

  return `${HANDLE_BASE[network]}${handle}`;
}

/** Финальная проверка через URL — отсекает то, что браузер всё равно не откроет. */
function safeUrl(candidate: string): string | null {
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
