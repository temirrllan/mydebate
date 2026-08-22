/**
 * Заглушка обложки турнира — то, что видно, пока организатор не загрузил своё
 * изображение (`Tournament.coverImage`).
 *
 * Раньше на этом месте у всех турниров был один и тот же тёмно-синий градиент
 * с точками, и каталог выглядел так, будто картинки не подгрузились. Здесь
 * градиент выбирается по id турнира, поэтому карточки различаются между собой
 * и не выглядят сломанными, а поверх стоит монограмма из названия — сразу
 * видно, что это турнир, а не пустое место.
 *
 * Детерминированность важна: цвет считается из id, а не случайно, иначе на
 * сервере и при гидрации выпали бы разные варианты и React ругался бы на
 * рассинхрон разметки.
 */

/** Пары «от/до» для linear-gradient. Все — тёмные, чтобы белый текст поверх читался. */
const PALETTES: readonly (readonly [string, string])[] = [
  ["#0b1730", "#2563eb"], // navy → brand
  ["#12224a", "#3b6ff6"],
  ["#101f3d", "#0ea5e9"],
  ["#1e1b4b", "#6366f1"],
  ["#0f2f3d", "#0d9488"],
  ["#2a1035", "#a855f7"],
  ["#301a13", "#f97316"],
  ["#071022", "#1d4ed8"],
];

/** Простой строковый хеш (djb2). Нужен только для равномерного выбора палитры. */
function hash(seed: string): number {
  let value = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    value = ((value << 5) + value + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(value);
}

/** Первые буквы первых двух слов названия: «Astana Debate Cup» → «AD». */
function monogramOf(title: string): string {
  const letters = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
  return (letters || "?").toUpperCase();
}

export function CoverPlaceholder({
  seed,
  title,
  className,
  monogramClassName,
}: {
  /** Устойчивый ключ (обычно id турнира) — от него зависит выбор градиента. */
  seed: string;
  title: string;
  className?: string;
  /**
   * Классы на монограмму. Нужны там, где заглушка лежит под текстом: в hero
   * страницы турнира на узком экране монограмма оказывается ровно за
   * заголовком и просвечивает сквозь него грязным пятном — её там прячут.
   */
  monogramClassName?: string;
}) {
  const [from, to] = PALETTES[hash(seed) % PALETTES.length];

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 ${className ?? ""}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle,#ffffff_1.5px,transparent_1.5px)] [background-size:18px_18px]" />
      <div className={`absolute inset-0 flex items-center justify-center ${monogramClassName ?? ""}`}>
        <span className="select-none text-5xl font-extrabold tracking-tight text-white/25 sm:text-6xl">
          {monogramOf(title)}
        </span>
      </div>
    </div>
  );
}
