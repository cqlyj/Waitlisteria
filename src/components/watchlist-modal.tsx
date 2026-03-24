"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getDisplayName } from "@/lib/institution-utils";

interface WatchlistItem {
  id: string;
  school: string;
  program: string;
  degree: string;
  season: string;
  notify_email: boolean;
  last_known_data: {
    current_offer_rounds?: number;
    current_wl_admits_so_far?: number;
  } | null;
}

const DEGREE_LABELS: Record<string, [string, string]> = {
  masters: ["Master's", "硕士"],
  phd: ["PhD", "博士"],
  mba: ["MBA", "MBA"],
  jd: ["JD", "JD"],
  md: ["MD", "MD"],
  bachelors: ["Bachelor's", "本科"],
  other: ["Other", "其他"],
};

function Backdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
}

export function WatchlistModal({
  onClose,
  onWatchCountChange,
}: {
  onClose: () => void;
  onWatchCountChange: (count: number) => void;
}) {
  const t = useTranslations("watchlist");
  const locale = useLocale();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/watchlist");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        onWatchCountChange((data.items || []).length);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [onWatchCountChange]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function handleToggleEmail(item: WatchlistItem) {
    const newVal = !item.notify_email;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, notify_email: newVal } : i))
    );
    try {
      await fetch("/api/watchlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, notify_email: newVal }),
      });
    } catch {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, notify_email: !newVal } : i))
      );
    }
  }

  async function handleRemove(item: WatchlistItem) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    onWatchCountChange(items.length - 1);
    try {
      await fetch(
        `/api/watchlist?school=${encodeURIComponent(item.school)}&program=${encodeURIComponent(item.program)}&degree=${encodeURIComponent(item.degree)}&season=${encodeURIComponent(item.season)}`,
        { method: "DELETE" }
      );
    } catch {
      fetchItems();
    }
  }

  function degreeLabel(degree: string): string {
    const pair = DEGREE_LABELS[degree.toLowerCase()] || [degree, degree];
    return locale === "zh" ? pair[1] : pair[0];
  }

  function dataSummary(item: WatchlistItem): string {
    const d = item.last_known_data;
    if (!d) return t("noDataYet");
    const parts: string[] = [];
    if (d.current_offer_rounds != null && d.current_offer_rounds > 0) {
      parts.push(t("rounds", { n: d.current_offer_rounds }));
    }
    if (d.current_wl_admits_so_far != null && d.current_wl_admits_so_far > 0) {
      parts.push(t("offWl", { n: d.current_wl_admits_so_far }));
    }
    return parts.length > 0 ? parts.join(" · ") : t("noDataYet");
  }

  return (
    <Backdrop onClose={onClose}>
      <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-lg animate-fade-in flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🔔</span>
            <h3 className="font-[family-name:var(--font-dm-mono)] font-medium text-text text-lg">
              {t("title")}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-warm text-muted hover:text-text-secondary transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mx-6 border-t border-border/40" />

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="space-y-3 py-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-bg-warm rounded-xl animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="text-4xl mb-3 opacity-40">🔕</div>
              <p className="text-sm text-text-secondary font-medium">{t("empty")}</p>
              <p className="text-xs text-muted mt-1">{t("emptyHint")}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map((item) => {
                const displayName = getDisplayName(item.school, locale);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-bg-warm/50 hover:bg-bg-warm transition-colors group"
                  >
                    {/* School info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-muted truncate mt-0.5">
                        {item.program} · {degreeLabel(item.degree)} · {item.season}
                      </p>
                      <p className="text-[11px] text-text-secondary mt-1 font-[family-name:var(--font-dm-mono)]">
                        {dataSummary(item)}
                      </p>
                    </div>

                    {/* Email toggle */}
                    <button
                      onClick={() => handleToggleEmail(item)}
                      className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                        item.notify_email
                          ? "text-amber bg-amber-soft hover:bg-amber/20"
                          : "text-muted hover:bg-bg-warm hover:text-text-secondary"
                      }`}
                      title={item.notify_email ? t("emailOn") : t("emailOff")}
                    >
                      {item.notify_email ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>

                    {/* Remove */}
                    <button
                      onClick={() => handleRemove(item)}
                      className="p-2 rounded-lg text-muted hover:text-coral hover:bg-coral/10 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                      title={t("remove")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-3 border-t border-border/40 flex items-center justify-between">
            <p className="text-xs text-muted">
              {items.length} {locale === "zh" ? "个学校监控中" : items.length === 1 ? "school watched" : "schools watched"}
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-text-secondary hover:text-text bg-bg-warm hover:bg-border/50 rounded-xl transition-colors"
            >
              {locale === "zh" ? "完成" : "Done"}
            </button>
          </div>
        )}
      </div>
    </Backdrop>
  );
}
