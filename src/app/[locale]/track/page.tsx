import { use } from "react";
import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";

export default function TrackPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);

  const t = useTranslations();

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="font-[family-name:var(--font-dm-mono)] text-2xl md:text-3xl font-medium text-text mb-2">
        {t("nav.track")} 📋
      </h1>
      <p className="text-text-secondary text-sm mb-8">
        {/* School input form coming next */}
      </p>
    </div>
  );
}
