"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { Logo } from "./logo";

export function Navbar({ locale }: { locale: Locale }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();

  const otherLocale: Locale = locale === "en" ? "zh" : "en";

  function switchLocale() {
    router.replace(pathname, { locale: otherLocale });
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Logo locale={locale} />
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/track"
            className="text-sm text-text-secondary hover:text-text transition-colors"
          >
            {t("track")}
          </Link>

          <button
            onClick={switchLocale}
            className="text-sm text-text-secondary hover:text-text transition-colors px-2.5 py-1 border border-border rounded-full hover:border-border-hover hover:bg-surface"
          >
            {t("language")}
          </button>
        </div>
      </div>
    </nav>
  );
}
