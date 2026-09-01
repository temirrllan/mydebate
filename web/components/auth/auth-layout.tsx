import { getTranslations } from "next-intl/server";
import { Trophy, Bookmark, Bell, Users } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Иконки и порядок — здесь, тексты — в словаре (namespace "auth.benefits").
const BENEFITS = [
  { icon: Trophy, key: "tournaments" },
  { icon: Bookmark, key: "saved" },
  { icon: Bell, key: "cabinet" },
  { icon: Users, key: "profile" },
] as const;

/**
 * Двухколоночный layout для страниц аутентификации (по макетам
 * Логин.png / Регистрация.png): слева — форма (children), справа —
 * заголовок + список преимуществ + иллюстрация-заглушка. На мобиле —
 * одна колонка (правая часть скрыта).
 */
export async function AuthLayout({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  const t = await getTranslations("auth.benefits");

  return (
    <section className="bg-canvas py-10 sm:py-16">
      <Container>
        <Card className={cn("overflow-hidden shadow-sm lg:grid lg:grid-cols-2", className)}>
          <div className="px-6 py-10 sm:px-10 sm:py-12">{children}</div>

          <div className="hidden bg-brand-50/60 px-10 py-12 lg:block">
            <h2 className="text-2xl font-extrabold leading-snug text-navy-900">{title}</h2>
            <p className="mt-2 text-muted">{subtitle}</p>

            <ul className="mt-10 space-y-7">
              {BENEFITS.map(({ icon: Icon, key }) => (
                <li key={key} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                    <Icon size={22} />
                  </span>
                  <div>
                    <p className="font-semibold text-ink">{t(`${key}Title`)}</p>
                    <p className="mt-1 text-sm text-muted">{t(`${key}Text`)}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-12 flex justify-center">
              <div
                aria-hidden="true"
                className="flex h-40 w-full max-w-xs items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200/60 text-brand-400"
              >
                <Users size={56} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </Card>
      </Container>
    </section>
  );
}
