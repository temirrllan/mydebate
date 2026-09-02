import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { UserCog } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listOrganizers, type OrganizerStat } from "@/lib/admin/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ROLE_LABEL } from "@/lib/format";
import { Role } from "@/lib/enums";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: t("organizersMeta") };
}

function OrganizerAvatar({ organizer }: { organizer: OrganizerStat }) {
  const initials = `${organizer.firstName[0] ?? ""}${organizer.lastName[0] ?? ""}`.toUpperCase();
  if (organizer.image) {
    return (
      <Image
        src={organizer.image}
        alt=""
        width={44}
        height={44}
        className="h-11 w-11 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
      {initials || "O"}
    </div>
  );
}

export default async function AdminOrganizersPage() {
  const t = await getTranslations("admin");
  await requireAdmin();

  let organizers: OrganizerStat[] = [];
  let loadError = false;
  try {
    organizers = await listOrganizers();
  } catch (error) {
    console.error("[admin/organizers] Не удалось загрузить организаторов:", error);
    loadError = true;
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-navy-900">{t("organizersTitle")}</h2>
      <p className="mt-1 text-sm text-muted">
        {t("organizersIntro")}
      </p>

      {loadError ? (
        <EmptyState
          className="mt-6"
          icon={UserCog}
          title={t("loadErrorTitle")}
          description={t("loadErrorText")}
        />
      ) : organizers.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={UserCog}
          title={t("noOrganizers")}
          description={t("noOrganizersText")}
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {organizers.map((o) => (
            <Card key={o.id} className="p-5">
              <div className="flex items-center gap-3">
                <OrganizerAvatar organizer={o} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {o.firstName} {o.lastName}
                  </p>
                  <p className="truncate text-xs text-muted">{o.email}</p>
                </div>
                {o.role === Role.ADMIN && (
                  <Badge tone="navy" className="ml-auto shrink-0">
                    {ROLE_LABEL[Role.ADMIN]}
                  </Badge>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-navy-900">{o.totalTournaments}</p>
                  <p className="text-[11px] text-muted">{t("orgTotal")}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-600">{o.published}</p>
                  <p className="text-[11px] text-muted">{t("orgPublished")}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600">{o.pending}</p>
                  <p className="text-[11px] text-muted">{t("orgPending")}</p>
                </div>
              </div>

              {o.hidden > 0 && (
                <p className="mt-2 text-center text-xs text-muted">{t("orgHiddenRejected", { count: o.hidden })}</p>
              )}

              <Link
                href={`/admin/moderation?status=ALL&search=${encodeURIComponent(o.email)}`}
                className="mt-4 block text-center text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                {t("orgViewTournaments")}
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
