import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Plus, Users, Calendar, ShieldCheck, Rocket, Globe2, Trophy } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IllustrationPanel } from "@/components/ui/illustration-panel";
import { FeatureCard } from "@/components/ui/feature-card";
import { CtaBanner } from "@/components/ui/cta-banner";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("metaTitle") };
}

// Иконки и порядок — здесь, тексты — в словаре (namespace "about").
const MISSION_ITEMS = [
  { icon: Users, key: "unite" },
  { icon: Calendar, key: "search" },
  { icon: ShieldCheck, key: "quality" },
  { icon: Rocket, key: "grow" },
] as const;

export default async function AboutPage() {
  const t = await getTranslations("about");
  const tHome = await getTranslations("home");
  const tNav = await getTranslations("nav");

  return (
    <>
      {/* Hero */}
      <section className="bg-white">
        <Container className="grid gap-12 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <Badge tone="blue" className="mb-5">
              {t("badge")}
            </Badge>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-navy-900 sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">{t("intro")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/tournaments">
                  {tHome("viewTournaments")} <ArrowRight size={18} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/tournaments/create">
                  {tNav("createTournament")} <Plus size={18} />
                </Link>
              </Button>
            </div>
          </div>

          <IllustrationPanel icon={Globe2} variant="light" />
        </Container>
      </section>

      {/* Наша миссия */}
      <section className="border-t border-line bg-canvas">
        <Container className="py-16 text-center lg:py-20">
          <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">{t("missionTitle")}</h2>
          <span className="mx-auto mt-3 block h-1 w-14 rounded-full bg-brand-600" aria-hidden="true" />
          <p className="mx-auto mt-6 max-w-2xl text-muted">{t("missionText")}</p>

          <div className="mt-12 grid gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
            {MISSION_ITEMS.map((item) => (
              <FeatureCard
                key={item.key}
                icon={item.icon}
                title={t(item.key)}
                description={t(`${item.key}Text`)}
              />
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="bg-white">
        <Container className="py-16 lg:py-20">
          <CtaBanner
            icon={Trophy}
            title={t("ctaTitle")}
            description={t("ctaText")}
          >
            <Button asChild variant="secondary" className="bg-white text-navy-900 hover:bg-brand-50">
              <Link href="/tournaments">
                {tHome("viewTournaments")} <ArrowRight size={18} />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href="/tournaments/create">
                {tNav("createTournament")} <Plus size={18} />
              </Link>
            </Button>
          </CtaBanner>
        </Container>
      </section>
    </>
  );
}
