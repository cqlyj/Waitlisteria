"use client";

import type { Locale } from "@/i18n/routing";

export function Logo({ locale, size = "default" }: { locale: Locale; size?: "default" | "large" }) {
  const isLarge = size === "large";

  return (
    <span className="inline-flex items-baseline gap-1.5 select-none">
      {/* "Waitlist" — steady, normal */}
      <span
        className={`font-[family-name:var(--font-dm-mono)] font-medium tracking-tight ${
          isLarge ? "text-3xl md:text-4xl" : "text-lg"
        }`}
      >
        <span className="text-amber">W</span>
        <span className="text-text">aitlist</span>
        {/* "eria" — italic, tilted, hysterical energy */}
        <span
          className="italic text-coral inline-block"
          style={{ transform: "rotate(-2deg) translateY(-1px)" }}
        >
          eria
        </span>
      </span>

      {/* Chinese subtitle: 候 is distressed/emotional */}
      {locale === "zh" && (
        <span
          className={`text-text-secondary ${
            isLarge ? "text-xl md:text-2xl" : "text-sm"
          }`}
        >
          <span
            className="inline-block hover:animate-shake"
            style={{ transform: "rotate(-1deg)" }}
            title="候...候补了😭"
          >
            候
          </span>
          <span>博士</span>
          <span className="ml-0.5">😭</span>
        </span>
      )}
    </span>
  );
}
