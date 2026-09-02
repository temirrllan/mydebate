import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  Users,
  IdCard,
  ShieldCheck,
  Calendar,
  TriangleAlert,
  User,
  Gavel,
  ShieldAlert,
  RefreshCw,
  ClipboardCheck,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { IllustrationPanel } from "@/components/ui/illustration-panel";
import { cn } from "@/lib/utils";
import { LegalLanguageNotice } from "@/components/ui/legal-language-notice";

export const metadata: Metadata = { title: "Правила и условия" };

function SectionNumber({ n }: { n: number }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
      {n}
    </span>
  );
}

function Callout({
  tone,
  label,
  items,
}: {
  tone: "danger" | "success";
  label: string;
  items: string[];
}) {
  return (
    <div
      className={cn(
        "mt-4 rounded-lg border px-4 py-3",
        tone === "danger" ? "border-rose-100 bg-rose-50" : "border-emerald-100 bg-emerald-50",
      )}
    >
      <p className={cn("text-sm font-semibold", tone === "danger" ? "text-rose-700" : "text-emerald-700")}>
        {label}
      </p>
      <ul className="mt-2 space-y-1.5 text-sm text-ink">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlainList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-1.5 text-sm text-muted">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span aria-hidden="true">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function RuleCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon size={20} />
        </span>
        <h3 className="font-semibold text-ink">{title}</h3>
      </div>
      <div className="mt-4 text-sm leading-relaxed text-muted">{children}</div>
    </Card>
  );
}

export default function RulesPage() {
  return (
    <>
      <section className="bg-white">
        <Container className="py-10 lg:py-14">
          <Breadcrumbs
            items={[{ label: "Главная", href: "/" }, { label: "Правила и условия" }]}
            className="mb-8"
          />

          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <LegalLanguageNotice />
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-navy-900 sm:text-4xl">
                Правила и условия использования MyDebate
              </h1>
              <p className="mt-4 max-w-xl text-muted">
                Пожалуйста, ознакомьтесь с правилами использования платформы.
                Используя MyDebate, вы соглашаетесь соблюдать их.
              </p>
            </div>
            <IllustrationPanel icon={ClipboardCheck} variant="light" className="lg:aspect-[16/10]" />
          </div>
        </Container>
      </section>

      <section className="border-t border-line bg-canvas">
        <Container className="space-y-14 py-14 lg:py-16">
          {/* 1. Правила сообщества */}
          <div>
            <div className="flex items-center gap-3">
              <SectionNumber n={1} />
              <h2 className="text-xl font-bold text-navy-900 sm:text-2xl">Правила сообщества</h2>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <RuleCard icon={Users} title="Уважительное общение">
                <p>Пользователи обязаны поддерживать уважительную и профессиональную атмосферу.</p>
                <Callout
                  tone="danger"
                  label="Запрещается:"
                  items={[
                    "Оскорблять других пользователей",
                    "Использовать дискриминационные высказывания",
                    "Распространять угрозы или материалы, содержащие травлю",
                    "Выдавать себя за другого человека или организацию",
                  ]}
                />
              </RuleCard>
              <RuleCard icon={IdCard} title="Достоверность информации">
                <p>При регистрации и использовании платформы пользователи обязаны предоставлять актуальную и достоверную информацию.</p>
                <Callout
                  tone="danger"
                  label="Запрещается:"
                  items={[
                    "Создание фейковых аккаунтов",
                    "Использование ложных контактных данных",
                    "Предоставление поддельной информации при регистрации на мероприятия",
                  ]}
                />
              </RuleCard>
              <RuleCard icon={ShieldCheck} title="Безопасность платформы">
                <Callout
                  tone="danger"
                  label="Запрещается:"
                  items={[
                    "Попытка взлома платформы",
                    "Использование автоматизированных инструментов для сбора данных",
                    "Распространение вредоносного программного обеспечения",
                    "Нарушение работы сервиса любым способом",
                  ]}
                />
              </RuleCard>
            </div>
          </div>

          {/* 2. Правила для организаторов */}
          <div>
            <div className="flex items-center gap-3">
              <SectionNumber n={2} />
              <h2 className="text-xl font-bold text-navy-900 sm:text-2xl">Правила для организаторов</h2>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <RuleCard icon={Calendar} title="Публикация мероприятий">
                <p>Организаторы обязаны публиковать точную и актуальную информацию о своих мероприятиях.</p>
                <Callout
                  tone="success"
                  label="Рекомендуется указывать:"
                  items={[
                    "Даты проведения",
                    "Формат мероприятия",
                    "Стоимость участия",
                    "Условия регистрации",
                    "Контактные данные организаторов",
                  ]}
                />
              </RuleCard>
              <RuleCard icon={TriangleAlert} title="Запрещено публиковать">
                <PlainList
                  items={[
                    "Заведомо ложные мероприятия",
                    "Недостоверную информацию о турнирах",
                    "Контент, нарушающий законодательство",
                    "Материалы, вводящие пользователей в заблуждение",
                  ]}
                />
              </RuleCard>
              <RuleCard icon={User} title="Ответственность организаторов">
                <p>
                  Организатор несёт полную ответственность за проведение
                  мероприятия, процесс регистрации, содержание программы,
                  финансовые сборы и взаимодействие с участниками.
                </p>
              </RuleCard>
            </div>
          </div>

          {/* 3. Модерация и ответственность */}
          <div>
            <div className="flex items-center gap-3">
              <SectionNumber n={3} />
              <h2 className="text-xl font-bold text-navy-900 sm:text-2xl">Модерация и ответственность</h2>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <RuleCard icon={Gavel} title="Порядок модерации">
                <p>Команда MyDebate имеет право:</p>
                <PlainList
                  items={[
                    "Проверять публикуемые мероприятия",
                    "Запрашивать дополнительную информацию у организаторов",
                    "Скрывать или удалять материалы, нарушающие правила платформы",
                    "Ограничивать доступ пользователей, нарушающих правила сообщества",
                  ]}
                />
              </RuleCard>
              <RuleCard icon={ShieldAlert} title="Ограничение ответственности">
                <p>
                  MyDebate является информационной платформой и не выступает
                  организатором публикуемых мероприятий, если иное не указано
                  отдельно.
                </p>
                <Callout
                  tone="danger"
                  label="Платформа не несёт ответственности за:"
                  items={[
                    "Проведение турниров и конференций",
                    "Перенос, отмену или изменение мероприятий",
                    "Решения организаторов относительно заявок участников",
                    "Качество организации мероприятий",
                    "Финансовые операции между участниками и организаторами",
                    "Любые убытки или последствия, возникшие в результате участия в мероприятиях",
                  ]}
                />
                <p className="mt-4">
                  Ответственность за проведение мероприятия полностью лежит на
                  его организаторах.
                </p>
              </RuleCard>
              <RuleCard icon={RefreshCw} title="Изменение правил">
                <p>
                  Команда MyDebate оставляет за собой право обновлять данные
                  правила по мере развития платформы. Актуальная версия
                  правил всегда публикуется на сайте.
                </p>
              </RuleCard>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
