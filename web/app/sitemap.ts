import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { TournamentStatus } from "@/lib/enums";
import { absoluteUrl } from "@/lib/site";

/**
 * Карта сайта — список страниц, которые поисковику стоит обойти. Без неё он
 * находит страницы только по ссылкам и добирается до свежих турниров с
 * задержкой в недели.
 *
 * Отдаётся по адресу /sitemap.xml, пересобирается на каждый запрос: турниры
 * появляются и уходят с модерации постоянно, а запрос дешёвый (id и дата, без
 * тяжёлых полей).
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

  return [
    ...STATIC_PAGES.map((page) => ({
      url: absoluteUrl(page.path),
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...tournaments.map((tournament) => ({
      url: absoluteUrl(`/tournaments/${tournament.id}`),
      lastModified: tournament.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
