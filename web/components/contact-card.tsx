import { Card } from "@/components/ui/card";

// lucide-иконки (Phone/Mail) и наши брендовые SVG (Instagram/TikTok из
// components/icons/social.tsx) имеют разные наборы пропсов — общий знаменатель
// это { size?, className? }, которого обоим достаточно.
type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

/**
 * Карточка контакта (Телефон / Email / Instagram / TikTok) — переиспользуется
 * на страницах «Помощь» и «Контакты» (те же 4 карточки в обоих макетах).
 */
export function ContactCard({
  icon: Icon,
  label,
  value,
  action,
}: {
  icon: IconComponent;
  label: string;
  value: string;
  action: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon size={20} />
      </div>
      <h3 className="mt-4 font-semibold text-ink">{label}</h3>
      <p className="mt-1 text-sm text-muted">{value}</p>
      <div className="mt-4">{action}</div>
    </Card>
  );
}
