import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listTournamentsForModeration } from "@/lib/admin/queries";
import { TournamentStatus } from "@/lib/enums";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { AdminSearchInput, AdminFilterSelect, AdminFilterBar } from "@/components/admin/admin-search-bar";
import { ModerationTable } from "@/components/admin/moderation-table";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: t("moderationMeta") };
}

const STATUS_OPTIONS = [
  { value: TournamentStatus.PENDING, key: "statusPending" },
  { value: TournamentStatus.PUBLISHED, key: "statusPublished" },
  { value: TournamentStatus.REJECTED, key: "statusRejected" },
  { value: TournamentStatus.HIDDEN, key: "statusHidden" },
  { value: TournamentStatus.DELETED, key: "statusDeleted" },
  // Сентинел "ALL" — намеренно НЕ пустая строка: пустой query-параметр status
  // при отсутствии в URL уже означает "по умолчанию PENDING" (см. ниже), а
  // "Все статусы" должен быть отдельным явным выбором, отличимым от "не задан".
  { value: "ALL", key: "allStatuses" },
];

type ModerationSearchParams = { status?: string; search?: string; page?: string };


export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<ModerationSearchParams>;
}) {
  const t = await getTranslations("admin");
  await requireAdmin();
  const params = await searchParams;
  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  // Очередь модерации по умолчанию — PENDING (spec: "PENDING по умолчанию").
  const rawStatus = params.status ?? TournamentStatus.PENDING;
  const statusFilter = rawStatus === "ALL" ? undefined : rawStatus;

  let result;
  let loadError = false;
  try {
    result = await listTournamentsForModeration({ status: statusFilter, search: params.search, page });
  } catch (error) {
    console.error("[admin/moderation] Не удалось загрузить турниры:", error);
    loadError = true;
    result = { items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
  }

  function buildHref(targetPage: number) {
    const usp = new URLSearchParams();
    if (params.search) usp.set("search", params.search);
    if (params.status) usp.set("status", params.status);
    if (targetPage > 1) usp.set("page", String(targetPage));
    const qs = usp.toString();
    return qs ? `/admin/moderation?${qs}` : "/admin/moderation";
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-navy-900">{t("moderationTitle")}</h2>
      <p className="mt-1 text-sm text-muted">
        {t("moderationIntro")}
      </p>

      <AdminFilterBar className="mt-5" paramKeys={["search", "status"]}>
        <AdminSearchInput
          className="flex-1"
          placeholder={t("moderationSearch")}
        />
        <AdminFilterSelect
          paramKey="status"
          value={rawStatus}
          options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: t(o.key) }))}
          label={t("status")}
          wrapperClassName="sm:w-64"
        />
      </AdminFilterBar>

      {loadError ? (
        <EmptyState
          className="mt-6"
          icon={SearchX}
          title={t("loadErrorTitle")}
          description={t("loadErrorText")}
        />
      ) : (
        <>
          <p className="mt-5 text-sm text-muted">
            {result.total > 0
              ? t("foundTournaments", { count: result.total })
              : t("nothingFound")}
          </p>

          <div className="mt-4">
            <ModerationTable
              key={`${rawStatus}-${params.search ?? ""}-${page}`}
              items={result.items}
              activeStatus={statusFilter ?? ""}
            />
          </div>

          {result.items.length > 0 && (
            <div className="mt-8">
              <Pagination page={result.page} totalPages={result.totalPages} buildHref={buildHref} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
