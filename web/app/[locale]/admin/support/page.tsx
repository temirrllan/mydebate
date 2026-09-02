import type { Metadata } from "next";
import { LifeBuoy } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listSupportTickets } from "@/lib/admin/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { AdminFilterSelect, AdminFilterBar } from "@/components/admin/admin-search-bar";
import { TicketCard } from "@/components/admin/ticket-card";
import { SupportTicketStatus } from "@/lib/enums";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: t("supportMeta") };
}

const STATUS_OPTIONS: { value: string; key: string | null; enumKey: string | null }[] = [
  { value: "", key: "allStatuses", enumKey: null },
  { value: SupportTicketStatus.OPEN, key: null, enumKey: SupportTicketStatus.OPEN },
  { value: SupportTicketStatus.ANSWERED, key: null, enumKey: SupportTicketStatus.ANSWERED },
  { value: SupportTicketStatus.CLOSED, key: null, enumKey: SupportTicketStatus.CLOSED },
];

type SupportSearchParams = { status?: string; page?: string };


export default async function SupportPage({ searchParams }: { searchParams: Promise<SupportSearchParams> }) {
  const t = await getTranslations("admin");
  const tEnum = await getTranslations("enums");
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
      <h2 className="text-xl font-bold text-navy-900">{t("supportTitle")}</h2>
      <p className="mt-1 text-sm text-muted">{t("supportIntro")}</p>

      <AdminFilterBar className="mt-5" paramKeys={["status"]}>
        <AdminFilterSelect
          paramKey="status"
          value={params.status ?? ""}
          options={STATUS_OPTIONS.map((o) => ({
              value: o.value,
              label: o.enumKey ? tEnum(`ticketStatus.${o.enumKey}`) : t(o.key!),
            }))}
          label={t("status")}
          wrapperClassName="w-full sm:w-64"
        />
      </AdminFilterBar>

      {loadError ? (
        <EmptyState
          className="mt-6"
          icon={LifeBuoy}
          title={t("loadErrorTitle")}
          description={t("loadErrorText")}
        />
      ) : result.items.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={LifeBuoy}
          title={t("noTickets")}
          description={t("noTicketsText")}
        />
      ) : (
        <>
          <p className="mt-5 text-sm text-muted">
            {t("foundTickets", { count: result.total })}
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
