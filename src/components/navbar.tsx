"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { Logo } from "./logo";
import { useAuth } from "./auth-provider";
import { AuthModal } from "./auth-modal";

export function Navbar({ locale }: { locale: Locale }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const otherLocale: Locale = locale === "en" ? "zh" : "en";

  function switchLocale() {
    router.replace(pathname, { locale: otherLocale });
  }

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-border bg-bg/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo locale={locale} />
          </Link>

          <div className="flex items-center gap-3">
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

            {!isLoading && (
              user ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary max-w-[120px] truncate hidden sm:inline">
                    {user.email}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="text-xs text-muted hover:text-coral transition-colors px-2 py-1 border border-border rounded-full hover:border-coral/30"
                  >
                    {t("signOut")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="text-sm text-amber hover:text-amber-hover transition-colors px-2.5 py-1 border border-amber/30 rounded-full hover:bg-amber-soft"
                >
                  {t("signIn")}
                </button>
              )
            )}
          </div>
        </div>
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
