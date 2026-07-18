import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listTournamentsForModeration } from "@/lib/admin/queries";
import { TournamentStatus } from "@/lib/enums";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { AdminSearchInput, AdminFilterSelect, AdminFilterBar } from "@/components/admin/admin-search-bar";
import { ModerationTable } from "@/components/admin/moderation-table";

export const metadata: Metadata = { title: "Модерация турниров" };

const STATUS_OPTIONS = [
  { value: TournamentStatus.PENDING, label: "На модерации" },
  { value: TournamentStatus.PUBLISHED, label: "Опубликованные" },
  { value: TournamentStatus.REJECTED, label: "Отклонённые" },
  { value: TournamentStatus.HIDDEN, label: "Скрытые" },
  { value: TournamentStatus.DELETED, label: "Удалённые" },
  // Сентинел "ALL" — намеренно НЕ пустая строка: пустой query-параметр status
  // при отсутствии в URL уже означает "по умолчанию PENDING" (см. ниже), а
  // "Все статусы" должен быть отдельным явным выбором, отличимым от "не задан".
  { value: "ALL", label: "Все статусы" },
];

type ModerationSearchParams = { status?: string; search?: string; page?: string };

/** «5 турниров» / «2 турнира» / «1 турнир» — русская плюрализация. */
function pluralizeTournament(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "турнир";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "турнира";
  return "турниров";
}

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<ModerationSearchParams>;
}) {
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
      <h2 className="text-xl font-bold text-navy-900">Модерация турниров</h2>
      <p className="mt-1 text-sm text-muted">
        Одобряйте, отклоняйте (с указанием причины), скрывайте или удаляйте турниры.
      </p>

      <AdminFilterBar className="mt-5" paramKeys={["search", "status"]}>
        <AdminSearchInput
          className="flex-1"
          placeholder="Поиск по названию, городу, организатору"
        />
        <AdminFilterSelect
          paramKey="status"
          value={rawStatus}
          options={STATUS_OPTIONS}
          label="Статус"
          wrapperClassName="sm:w-64"
        />
      </AdminFilterBar>

      {loadError ? (
        <EmptyState
          className="mt-6"
          icon={SearchX}
          title="Не удалось загрузить данные."
          description="Попробуйте обновить страницу немного позже."
        />
      ) : (
        <>
          <p className="mt-5 text-sm text-muted">
            {result.total > 0
              ? `Найдено ${result.total} ${pluralizeTournament(result.total)}`
              : "Ничего не найдено"}
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
