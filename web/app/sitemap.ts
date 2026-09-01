import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { TournamentStatus } from "@/lib/enums";
import { absoluteUrl } from "@/lib/site";
import { LOCALES, routing } from "@/i18n/routing";
import { localePath } from "@/lib/i18n/alternates";

/**
 * Карта сайта — список страниц, которые поисковику стоит обойти. Без неё он
 * находит страницы только по ссылкам и добирается до свежих турниров с
 * задержкой в недели.
 *
 * Отдаётся по адресу /sitemap.xml, пересобирается на каждый запрос: турниры
 * появляются и уходят с модерации постоянно, а запрос дешёвый (id и дата, без
 * тяжёлых полей).
 *
 * Каждая страница перечислена один раз (в основной, русской версии) со
 * списком alternates на казахскую и английскую. Так делать правильнее, чем
 * тремя отдельными записями: поисковик получает связку «это один документ на
 * трёх языках» прямо из карты сайта, а не только из hreflang в разметке.
 */
export const dynamic = "force-dynamic";

/** Страницы, которые есть всегда, вне зависимости от содержимого базы. */
const STATIC_PAGES: Array<{ path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }> = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/tournaments", priority: 0.9, changeFrequency: "daily" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contacts", priority: 0.5, changeFrequency: "monthly" },
  { path: "/help", priority: 0.4, changeFrequency: "monthly" },
  { path: "/rules", priority: 0.4, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.2, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  let tournaments: Array<{ id: string; updatedAt: Date }> = [];
  try {
    // Только опубликованные: черновики, ожидающие модерации и скрытые турниры
    // гостю недоступны, и звать на них робота — значит отдавать ему 404.
    tournaments = await prisma.tournament.findMany({
      where: { status: TournamentStatus.PUBLISHED },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });
  } catch (error) {
    // База недоступна — отдаём хотя бы статические страницы. Пустой или
    // битый sitemap хуже неполного: поисковик решит, что сайт исчез.
    console.error("[sitemap] Не удалось получить список турниров:", error);
  }

  /** Адреса страницы на всех языках — для блока <xhtml:link rel="alternate">. */
  function languages(path: string): Record<string, string> {
    return Object.fromEntries(
      LOCALES.map((locale) => [locale, absoluteUrl(localePath(locale, path))]),
    );
  }

  return [
    ...STATIC_PAGES.map((page) => ({
      url: absoluteUrl(localePath(routing.defaultLocale, page.path)),
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: { languages: languages(page.path) },
    })),
    ...tournaments.map((tournament) => {
      const path = `/tournaments/${tournament.id}`;
      return {
        url: absoluteUrl(localePath(routing.defaultLocale, path)),
        lastModified: tournament.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
        alternates: { languages: languages(path) },
      };
    }),
  ];
}
