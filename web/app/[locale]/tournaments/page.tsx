import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SearchX, Trophy } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { CtaBanner } from "@/components/ui/cta-banner";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import { FavoriteButton } from "@/components/tournaments/favorite-button";
import { FiltersBar } from "@/components/tournaments/filters-bar";
import { Link } from "@/i18n/navigation";
import { listTournaments, getAvailableCities, type TournamentSort } from "@/lib/tournaments/queries";
import { getFavoriteTournamentIds } from "@/lib/actions/favorites";
import { getCurrentUser } from "@/lib/auth/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "catalog" });
  return { title: t("title"), description: t("subtitle") };
}

type TournamentsSearchParams = {
  search?: string;
  format?: string;
  locationType?: string;
  city?: string;
  level?: string;
  date?: string;
  sort?: string;
  page?: string;
};

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<TournamentsSearchParams>;
}) {
  // Склонение «турнир / турнира / турниров» больше не считается вручную: это
  // делает ICU-плюрал в словаре (catalog.found). У казахского и английского
  // формы другие, и три параллельные функции разошлись бы при первой правке.
  const t = await getTranslations("catalog");
  const tNav = await getTranslations("nav");

  const params = await searchParams;
  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  const sort: TournamentSort = params.sort === "newest" ? "newest" : "nearest";

  let result;
  let cities: string[] = [];
  let loadError = false;

  try {
    [result, cities] = await Promise.all([
      listTournaments({
        search: params.search,
        format: params.format,
        locationType: params.locationType,
        city: params.city,
        level: params.level,
        date: params.date,
        sort,
        page,
      }),
      getAvailableCities(),
    ]);
  } catch (error) {
    console.error("[tournaments] Не удалось загрузить каталог:", error);
    loadError = true;
    result = { items: [], total: 0, page: 1, pageSize: 12, totalPages: 1 };
  }

  // Каталог открыт всем, включая гостя и поискового робота (см. proxy.ts —
  // там же объяснение, почему правило изменили). Поэтому getCurrentUser, а не
  // requireUser: у гостя просто нет сессии, и это не повод его разворачивать.
  // Избранное — личная штука, для гостя его нет, запрос в БД не делаем.
  const user = await getCurrentUser();
  const favoriteIds = user ? await getFavoriteTournamentIds(user.id) : new Set<string>();

  function buildHref(targetPage: number) {
    const usp = new URLSearchParams();
    if (params.search) usp.set("search", params.search);
    if (params.format) usp.set("format", params.format);
    if (params.locationType) usp.set("locationType", params.locationType);
    if (params.city) usp.set("city", params.city);
    if (params.level) usp.set("level", params.level);
    if (params.date) usp.set("date", params.date);
    if (params.sort) usp.set("sort", params.sort);
    if (targetPage > 1) usp.set("page", String(targetPage));
    const qs = usp.toString();
    return qs ? `/tournaments?${qs}` : "/tournaments";
  }

  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs
        items={[{ label: tNav("home"), href: "/" }, { label: tNav("tournaments") }]}
      />

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-muted">{t("subtitle")}</p>

      <div className="mt-8">
        <FiltersBar cities={cities} />
      </div>

      {loadError ? (
        <EmptyState
          className="mt-8"
          icon={SearchX}
          title={t("loadErrorTitle")}
          description={t("loadErrorDescription")}
        />
      ) : (
        <>
          <p role="status" aria-live="polite" className="mt-6 text-sm text-muted">
            {result.total > 0 ? t("found", { count: result.total }) : t("nothingFound")}
          </p>

          <div className="mt-5">
            {result.items.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title={t("nothingFound")}
                description={t("nothingFoundDescription")}
              />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {result.items.map((tournament, i) => (
                  <div
                    key={tournament.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                  >
                    <TournamentCard
                      tournament={tournament}
                      favoriteSlot={
                        // Гостю сердечко не показываем: нажать он всё равно не
                        // сможет — экшен избранного требует сессии.
                        user ? (
                          <FavoriteButton
                            tournamentId={tournament.id}
                            initialFavorited={favoriteIds.has(tournament.id)}
                          />
                        ) : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {result.items.length > 0 && (
            <div className="mt-10">
              <Pagination page={result.page} totalPages={result.totalPages} buildHref={buildHref} />
            </div>
          )}
        </>
      )}

      <div className="mt-16">
        <CtaBanner
          icon={Trophy}
          title={t("ctaTitle")}
          description={t("ctaDescription")}
        >
          <Button asChild size="lg" variant="secondary" className="bg-white text-navy-900 hover:bg-brand-50">
            <Link href="/tournaments/create">{t("ctaButton")}</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/30 bg-transparent text-white hover:border-white/60 hover:bg-white/10 hover:text-white"
          >
            <Link href="/contacts">Связаться с нами</Link>
          </Button>
        </CtaBanner>
      </div>
    </Container>
  );
}
