import { useTranslations } from "next-intl";

const ETH_ADDRESS = "0xYOUR_ADDRESS_HERE";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="w-full border-t border-border mt-auto bg-bg-warm">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-2 text-center text-text-secondary text-sm">
          <p>{t("tagline")}</p>
          <p className="font-[family-name:var(--font-dm-mono)] text-xs text-muted select-all">
            {t("ethLabel")}: {ETH_ADDRESS}
          </p>
          <p className="text-xs text-muted">{t("withoutDonation")}</p>
          <p className="text-xs text-muted">{t("free")}</p>
        </div>
      </div>
    </footer>
  );
}
