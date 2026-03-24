"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "./auth-provider";
import { AuthModal } from "./auth-modal";
import { getDisplayName } from "@/lib/institution-utils";
import type { SchoolEntry, SchoolResultState } from "@/lib/types";

interface WatchlistItem {
  school: string;
  program: string;
  degree: string;
  season: string;
}

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

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-lg hover:bg-bg-warm text-muted hover:text-text-secondary transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

export function WatchPanel({
  entries,
  results,
  onClose,
  onWatchCountChange,
}: {
  entries: SchoolEntry[];
  results: SchoolResultState[];
  onClose: () => void;
  onWatchCountChange: (count: number) => void;
}) {
  const t = useTranslations("watch");
  const locale = useLocale();
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const makeKey = (e: { institution?: string; school?: string; program: string; degree: string; season?: string }) =>
    `${e.institution || e.school}|${e.program}|${e.degree}|${e.season || ""}`;

  const fetchWatched = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/watchlist");
      if (res.ok) {
        const data = await res.json();
        const keys = new Set<string>(
          (data.items || []).map((item: WatchlistItem) =>
            `${item.school}|${item.program}|${item.degree}|${item.season}`
          )
        );
        setWatched(keys);
        onWatchCountChange(keys.size);
      }
    } catch {
      // Ignore
    } finally {
      setLoaded(true);
    }
  }, [user, onWatchCountChange]);

  useEffect(() => {
    fetchWatched();
  }, [fetchWatched]);

  if (!user) {
    return (
      <>
        <Backdrop onClose={onClose}>
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl w-full max-w-sm animate-fade-in">
            <div className="flex justify-between items-start mb-4">
              <div className="text-3xl">🔔</div>
              <CloseButton onClick={onClose} />
            </div>
            <h3 className="font-[family-name:var(--font-dm-mono)] font-medium text-text mb-2">
              {t("signInRequired")}
            </h3>
            <p className="text-sm text-text-secondary mb-5">
              {t("signInDesc")}
            </p>
            <button
              onClick={() => setShowAuth(true)}
              className="w-full py-2.5 bg-amber text-white text-sm font-medium rounded-xl hover:bg-amber-hover transition-colors"
            >
              {t("signInButton")}
            </button>
          </div>
        </Backdrop>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </>
    );
  }

  function toggleSchool(entry: SchoolEntry) {
    const key = makeKey(entry);
    setWatched((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const toWatch = entries.filter((e) => watched.has(makeKey(e)));
      const toUnwatch = entries.filter((e) => !watched.has(makeKey(e)));

      if (toWatch.length > 0) {
        const items = toWatch.map((e) => {
          const result = results.find((r) => r.schoolId === e.id);
          return {
            school: e.institution,
            program: e.program,
            degree: e.degree,
            season: e.season,
            last_known_data: result?.data ? {
              current_offer_rounds: result.data.current_offer_rounds,
              current_latest_round_date: result.data.current_latest_round_date,
              current_waitlisted_reports: result.data.current_waitlisted_reports,
              current_wl_admits_so_far: result.data.current_wl_admits_so_far,
            } : null,
          };
        });
        await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items, lang: locale }),
        });
      }

      for (const e of toUnwatch) {
        await fetch(
          `/api/watchlist?school=${encodeURIComponent(e.institution)}&program=${encodeURIComponent(e.program)}&degree=${encodeURIComponent(e.degree)}&season=${encodeURIComponent(e.season)}`,
          { method: "DELETE" }
        );
      }

      onWatchCountChange(watched.size);
      onClose();
    } catch {
      // Ignore
    } finally {
      setSaving(false);
    }
  }

  const allSelected = entries.every((e) => watched.has(makeKey(e)));

  function toggleAll() {
    if (allSelected) {
      setWatched(new Set());
    } else {
      setWatched(new Set(entries.map(makeKey)));
    }
  }

  return (
    <Backdrop onClose={onClose}>
      <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-lg animate-fade-in flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <h3 className="font-[family-name:var(--font-dm-mono)] font-medium text-text text-lg">
              🔔 {t("title")}
            </h3>
            <p className="text-xs text-text-secondary mt-1">{t("desc")}</p>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        {/* Select all */}
        <div className="px-6 py-2.5 border-y border-border/40">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="w-4 h-4 rounded border-border text-amber focus:ring-amber/50 accent-amber"
            />
            <span className="text-xs text-text-secondary font-medium">
              {t("selectAll")}
            </span>
          </label>
        </div>

        {/* School list */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {!loaded ? (
            <div className="space-y-3 py-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-bg-warm rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {entries.map((entry) => {
                const key = makeKey(entry);
                const isWatched = watched.has(key);
                const displayName = getDisplayName(entry.institution, locale);

                return (
                  <label
                    key={entry.id}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all ${
                      isWatched
                        ? "bg-amber-soft ring-1 ring-amber/20"
                        : "hover:bg-bg-warm"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isWatched}
                      onChange={() => toggleSchool(entry)}
                      className="w-4 h-4 rounded border-border text-amber focus:ring-amber/50 accent-amber flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text truncate font-medium">{displayName}</p>
                      <p className="text-xs text-muted truncate mt-0.5">
                        {entry.program} · {entry.degree} · {entry.season}
                      </p>
                    </div>
                    {isWatched && (
                      <span className="text-amber text-sm flex-shrink-0">🔔</span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/40 flex items-center justify-between">
          <p className="text-xs text-muted">
            {watched.size} {t("schoolsSelected")}
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-2.5 bg-amber text-white text-sm font-medium rounded-xl hover:bg-amber-hover transition-colors disabled:opacity-50"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </div>
    </Backdrop>
  );
}
