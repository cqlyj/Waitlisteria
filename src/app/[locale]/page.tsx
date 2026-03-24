import { use } from "react";
import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/logo";
import type { Locale } from "@/i18n/routing";

const stepEmojis = ["🎓", "🔍", "🎯"];

export default function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);

  const t = useTranslations();

  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-10 sm:pb-12 text-center">
        <div className="mb-8">
          <Logo locale={locale as Locale} size="large" />
        </div>

        <h1 className="text-2xl md:text-3xl font-medium text-text leading-snug">
          {t("hero.headline")}
        </h1>

        <p className="mt-4 text-base md:text-lg text-text-secondary max-w-xl mx-auto">
          {t("hero.subheadline")}
        </p>

        <Link
          href="/track"
          className="mt-8 inline-flex items-center gap-2 px-7 py-3 bg-amber text-white font-medium rounded-full hover:bg-amber-hover transition-all hover:shadow-card-hover active:scale-[0.98] text-base"
        >
          {t("hero.cta")}
          <span aria-hidden>→</span>
        </Link>
      </section>

      {/* 3-step explainer */}
      <section className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="grid md:grid-cols-3 gap-4">
          {(["one", "two", "three"] as const).map((step, i) => (
            <div
              key={step}
              className="bg-surface border border-border rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="text-2xl mb-3">{stepEmojis[i]}</div>
              <h3 className="font-[family-name:var(--font-dm-mono)] text-text text-base font-medium mb-1.5">
                {t(`steps.${step}`)}
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                {t(`steps.${step}Desc`)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
