import type { Metadata } from "next";
import { Users as UsersIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listUsersForAdmin } from "@/lib/admin/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { AdminSearchInput, AdminFilterSelect, AdminFilterBar } from "@/components/admin/admin-search-bar";
import { UserRow } from "@/components/admin/user-row";
import { CreateUserToggle } from "@/components/admin/create-user-toggle";
import { ROLE_LABEL } from "@/lib/format";
import { Role } from "@/lib/enums";

export const metadata: Metadata = { title: "Пользователи" };

const ROLE_OPTIONS = [
  { value: "", label: "Все роли" },
  { value: Role.USER, label: ROLE_LABEL[Role.USER] },
  { value: Role.ORGANIZER, label: ROLE_LABEL[Role.ORGANIZER] },
  { value: Role.ADMIN, label: ROLE_LABEL[Role.ADMIN] },
];

type UsersSearchParams = { search?: string; role?: string; page?: string };

function pluralizeUser(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "пользователь";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "пользователя";
  return "пользователей";
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<UsersSearchParams> }) {
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
      <h2 className="text-xl font-bold text-navy-900">Пользователи</h2>
      <p className="mt-1 text-sm text-muted">Поиск, роли, блокировка и удаление аккаунтов.</p>

      <div className="mt-5">
        <CreateUserToggle />
      </div>

      <AdminFilterBar className="mt-5" paramKeys={["search", "role"]}>
        <AdminSearchInput className="flex-1" placeholder="Поиск по имени, фамилии, email" />
        <AdminFilterSelect
          paramKey="role"
          value={params.role ?? ""}
          options={ROLE_OPTIONS}
          label="Роль"
          wrapperClassName="sm:w-56"
        />
      </AdminFilterBar>

      {loadError ? (
        <EmptyState
          className="mt-6"
          icon={UsersIcon}
          title="Не удалось загрузить данные."
          description="Попробуйте обновить страницу немного позже."
        />
      ) : result.items.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={UsersIcon}
          title="Пользователи не найдены"
          description="Попробуйте изменить параметры поиска или фильтр по роли."
        />
      ) : (
        <>
          <p className="mt-5 text-sm text-muted">
            Найдено {result.total} {pluralizeUser(result.total)}
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
