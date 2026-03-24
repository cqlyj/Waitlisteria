"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "./auth-provider";

interface SessionItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const ACCENT_COLORS = [
  "bg-amber text-white",
  "bg-teal text-white",
  "bg-coral text-white",
  "bg-violet-400 text-white",
  "bg-blue-400 text-white",
  "bg-emerald-400 text-white",
];

function sessionColor(index: number): string {
  return ACCENT_COLORS[index % ACCENT_COLORS.length];
}

function firstLetter(title: string): string {
  return title.charAt(0).toUpperCase();
}

function relativeDate(iso: string, locale: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return locale === "zh" ? "刚刚" : "Just now";
  if (mins < 60) return locale === "zh" ? `${mins}分钟前` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return locale === "zh" ? `${hrs}小时前` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return locale === "zh" ? `${days}天前` : `${days}d ago`;
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function Sidebar({
  activeSessionId,
  onSelectSession,
  onNewAnalysis,
  refreshTrigger,
  watchedCount,
}: {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewAnalysis: () => void;
  refreshTrigger: number;
  watchedCount?: number;
}) {
  const t = useTranslations("sidebar");
  const locale = useLocale();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, refreshTrigger]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    e.preventDefault();
    const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) onNewAnalysis();
    }
  }

  if (!user) return null;

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <h2 className="font-[family-name:var(--font-dm-mono)] text-sm font-medium text-text">
            {t("title")}
          </h2>
        </div>
        <button
          onClick={() => { setCollapsed(true); setMobileOpen(false); }}
          className="p-1.5 rounded-lg hover:bg-bg-warm transition-colors text-muted hover:text-text-secondary md:block hidden"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="11 17 6 12 11 7" />
            <polyline points="18 17 13 12 18 7" />
          </svg>
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="p-1.5 rounded-lg hover:bg-bg-warm transition-colors text-muted hover:text-text-secondary md:hidden"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* New analysis button */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={() => { onNewAnalysis(); setMobileOpen(false); }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-white bg-amber hover:bg-amber-hover rounded-xl transition-colors shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{t("newAnalysis")}</span>
        </button>
      </div>

      {/* Watched badge */}
      {(watchedCount ?? 0) > 0 && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span>🔔</span>
            <span>{watchedCount} {locale === "zh" ? "个学校监控中" : "schools watched"}</span>
          </div>
        </div>
      )}

      <div className="mx-3 border-t border-border/30" />

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pt-2 pb-3">
        {loading ? (
          <div className="space-y-2 px-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                <div className="w-8 h-8 rounded-lg bg-bg-warm animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-bg-warm rounded w-3/4 animate-pulse" />
                  <div className="h-2.5 bg-bg-warm rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center px-4 py-8">
            <div className="text-3xl mb-2 opacity-40">📋</div>
            <p className="text-xs text-muted leading-relaxed">
              {t("empty")}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {sessions.map((session, idx) => (
              <div
                key={session.id}
                role="button"
                tabIndex={0}
                onClick={() => { onSelectSession(session.id); setMobileOpen(false); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectSession(session.id); setMobileOpen(false); } }}
                className={`group flex items-center gap-2.5 px-2 py-2.5 rounded-xl cursor-pointer transition-all ${
                  activeSessionId === session.id
                    ? "bg-amber-soft ring-1 ring-amber/20"
                    : "hover:bg-bg-warm"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium flex-shrink-0 ${sessionColor(idx)}`}>
                  {firstLetter(session.title)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate leading-tight ${
                    activeSessionId === session.id ? "font-medium text-text" : "text-text-secondary"
                  }`}>
                    {session.title}
                  </p>
                  <p className="text-[11px] text-muted mt-0.5 leading-tight">
                    {relativeDate(session.updated_at, locale)}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-coral/10 text-muted hover:text-coral transition-all flex-shrink-0"
                  title={t("delete")}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  // Collapsed state (desktop only)
  if (collapsed) {
    return (
      <div className="hidden md:flex w-12 flex-shrink-0 bg-surface border-r border-border flex-col items-center pt-3 gap-2">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg hover:bg-bg-warm transition-colors text-text-secondary"
          title={t("expand")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="13 17 18 12 13 7" />
            <polyline points="6 17 11 12 6 7" />
          </svg>
        </button>
        <button
          onClick={() => { onNewAnalysis(); }}
          className="p-2 rounded-lg hover:bg-amber-soft transition-colors text-amber"
          title={t("newAnalysis")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Mobile hamburger trigger (rendered in the track page area) */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed bottom-4 left-4 z-30 p-3 bg-amber text-white rounded-full shadow-lg hover:bg-amber-hover transition-colors"
        title={t("expand")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <div className={`
        bg-surface border-r border-border flex flex-col
        md:relative md:w-64 md:flex-shrink-0 md:h-full
        fixed inset-y-0 left-0 z-50 w-72 h-full
        transition-transform duration-200 ease-out
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        {sidebarContent}
      </div>
    </>
  );
}
