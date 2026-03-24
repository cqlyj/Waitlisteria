"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "./auth-provider";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || sending) return;

    setSending(true);
    setError(null);

    const result = await signIn(email.trim(), locale);
    setSending(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSent(true);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl w-full max-w-sm mx-4 animate-fade-in">
        {sent ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">📬</div>
            <h3 className="font-[family-name:var(--font-dm-mono)] font-medium text-text mb-2">
              {t("checkEmail")}
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              {t("checkEmailDesc")}
            </p>
            <button
              onClick={onClose}
              className="text-sm text-amber hover:text-amber-hover transition-colors"
            >
              {t("close")}
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-[family-name:var(--font-dm-mono)] font-medium text-text mb-1">
              {t("signInTitle")}
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              {t("signInDesc")}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                required
                className="w-full px-3 py-2.5 bg-bg-warm border border-border rounded-xl text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-amber/50 focus:border-amber transition-colors"
                autoFocus
              />

              {error && (
                <p className="text-xs text-coral">{error}</p>
              )}

              <button
                type="submit"
                disabled={sending || !email.trim()}
                className="w-full py-2.5 bg-amber text-white text-sm font-medium rounded-xl hover:bg-amber-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? t("sending") : t("sendLink")}
              </button>
            </form>

            <button
              onClick={onClose}
              className="mt-3 w-full text-center text-xs text-muted hover:text-text-secondary transition-colors"
            >
              {t("close")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
