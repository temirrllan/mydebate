import type { Metadata } from "next";
import { LifeBuoy } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listSupportTickets } from "@/lib/admin/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { AdminFilterSelect, AdminFilterBar } from "@/components/admin/admin-search-bar";
import { TicketCard } from "@/components/admin/ticket-card";
import { SupportTicketStatus } from "@/lib/enums";
import { SUPPORT_TICKET_STATUS_LABEL } from "@/lib/format";

export const metadata: Metadata = { title: "Обращения в поддержку" };

const STATUS_OPTIONS = [
  { value: "", label: "Все статусы" },
  { value: SupportTicketStatus.OPEN, label: SUPPORT_TICKET_STATUS_LABEL[SupportTicketStatus.OPEN] },
  { value: SupportTicketStatus.ANSWERED, label: SUPPORT_TICKET_STATUS_LABEL[SupportTicketStatus.ANSWERED] },
  { value: SupportTicketStatus.CLOSED, label: SUPPORT_TICKET_STATUS_LABEL[SupportTicketStatus.CLOSED] },
];

type SupportSearchParams = { status?: string; page?: string };

function pluralizeTicket(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "обращение";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "обращения";
  return "обращений";
}

export default async function SupportPage({ searchParams }: { searchParams: Promise<SupportSearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  const status = params.status || undefined;

  let result;
  let loadError = false;
  try {
    result = await listSupportTickets({ status, page });
  } catch (error) {
    console.error("[admin/support] Не удалось загрузить обращения:", error);
    loadError = true;
    result = { items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
  }

  function buildHref(targetPage: number) {
    const usp = new URLSearchParams();
    if (params.status) usp.set("status", params.status);
    if (targetPage > 1) usp.set("page", String(targetPage));
    const qs = usp.toString();
    return qs ? `/admin/support?${qs}` : "/admin/support";
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-navy-900">Обращения в поддержку</h2>
      <p className="mt-1 text-sm text-muted">Отвечайте на вопросы пользователей и закрывайте обработанные обращения.</p>

      <AdminFilterBar className="mt-5" paramKeys={["status"]}>
        <AdminFilterSelect
          paramKey="status"
          value={params.status ?? ""}
          options={STATUS_OPTIONS}
          label="Статус"
          wrapperClassName="w-full sm:w-64"
        />
      </AdminFilterBar>

      {loadError ? (
        <EmptyState
          className="mt-6"
          icon={LifeBuoy}
          title="Не удалось загрузить данные."
          description="Попробуйте обновить страницу немного позже."
        />
      ) : result.items.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={LifeBuoy}
          title="Обращений пока нет"
          description="Здесь появятся обращения пользователей в поддержку."
        />
      ) : (
        <>
          <p className="mt-5 text-sm text-muted">
            Найдено {result.total} {pluralizeTicket(result.total)}
          </p>

          <div className="mt-4 space-y-4">
            {result.items.map((t) => (
              <TicketCard key={t.id} ticket={t} />
            ))}
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
