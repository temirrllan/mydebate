import type { Metadata } from "next";
import { Users as UsersIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listUsersForAdmin } from "@/lib/admin/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { AdminSearchInput, AdminFilterSelect, AdminFilterBar } from "@/components/admin/admin-search-bar";
import { UserRow } from "@/components/admin/user-row";
import { CreateUserToggle } from "@/components/admin/create-user-toggle";
import { Role } from "@/lib/enums";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: t("usersMeta") };
}

// Значение + КЛЮЧ подписи: «все роли» живёт в namespace "admin", сами роли —
// в общем "enums.role" (их же показывает профиль).
const ROLE_OPTIONS: { value: string; key: string | null; enumKey: string | null }[] = [
  { value: "", key: "allRoles", enumKey: null },
  { value: Role.USER, key: null, enumKey: Role.USER },
  { value: Role.ORGANIZER, key: null, enumKey: Role.ORGANIZER },
  { value: Role.ADMIN, key: null, enumKey: Role.ADMIN },
];

type UsersSearchParams = { search?: string; role?: string; page?: string };


export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<UsersSearchParams> }) {
  const t = await getTranslations("admin");
  const tEnum = await getTranslations("enums");
  const admin = await requireAdmin();
  const params = await searchParams;
  const page = Number(params.page) > 0 ? Number(params.page) : 1;

  let result;
  let loadError = false;
  try {
    result = await listUsersForAdmin({ search: params.search, role: params.role, page });
  } catch (error) {
    console.error("[admin/users] Не удалось загрузить пользователей:", error);
    loadError = true;
    result = { items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
  }

  function buildHref(targetPage: number) {
    const usp = new URLSearchParams();
    if (params.search) usp.set("search", params.search);
    if (params.role) usp.set("role", params.role);
    if (targetPage > 1) usp.set("page", String(targetPage));
    const qs = usp.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-navy-900">{t("usersTitle")}</h2>
      <p className="mt-1 text-sm text-muted">{t("usersIntro")}</p>

      <div className="mt-5">
        <CreateUserToggle />
      </div>

      <AdminFilterBar className="mt-5" paramKeys={["search", "role"]}>
        <AdminSearchInput className="flex-1" placeholder={t("usersSearch")} />
        <AdminFilterSelect
          paramKey="role"
          value={params.role ?? ""}
          options={ROLE_OPTIONS.map((o) => ({
              value: o.value,
              label: o.enumKey ? tEnum(`role.${o.enumKey}`) : t(o.key!),
            }))}
          label={t("role")}
          wrapperClassName="sm:w-56"
        />
      </AdminFilterBar>

      {loadError ? (
        <EmptyState
          className="mt-6"
          icon={UsersIcon}
          title={t("loadErrorTitle")}
          description={t("loadErrorText")}
        />
      ) : result.items.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={UsersIcon}
          title={t("usersNotFound")}
          description={t("usersNotFoundText")}
        />
      ) : (
        <>
          <p className="mt-5 text-sm text-muted">
            {t("foundUsers", { count: result.total })}
          </p>

          <div className="mt-4 space-y-4">
            {result.items.map((u) => (
              <UserRow key={u.id} user={u} currentAdminId={admin.id} />
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
