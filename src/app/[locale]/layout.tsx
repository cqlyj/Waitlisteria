import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { DM_Mono, DM_Sans, Noto_Sans_SC } from "next/font/google";
import { routing, type Locale } from "@/i18n/routing";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AuthProvider } from "@/components/auth-provider";
import "../globals.css";

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-noto-sc",
  display: "swap",
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${dmMono.variable} ${dmSans.variable} ${notoSansSC.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-bg">
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <Navbar locale={locale as Locale} />
            <main className="flex-1">{children}</main>
            <Footer />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
