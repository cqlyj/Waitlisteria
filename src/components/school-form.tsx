"use client";

import { useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Autocomplete } from "./autocomplete";
import type { SchoolEntry, DegreeType } from "@/lib/types";
import { getDisplayName, getBilingualLabel } from "@/lib/institution-utils";
import institutions from "@/data/institutions.json";
import programs from "@/data/programs.json";
import abbreviations from "@/data/abbreviations.json";
import zhNames from "@/data/institution-names-zh.json";

const CURRENT_SEASON = process.env.NEXT_PUBLIC_CURRENT_SEASON || "2026 Fall";
const MAX_SCHOOLS = 10;

const DEGREE_OPTIONS: DegreeType[] = [
  "phd",
  "masters",
  "bachelors",
  "mba",
  "jd",
  "md",
  "other",
];

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

function emptyEntry(): SchoolEntry {
  return {
    id: makeId(),
    institution: "",
    program: "",
    degree: "phd",
    season: CURRENT_SEASON,
  };
}

function InstitutionDropdownItem({
  canonicalName,
  locale,
}: {
  canonicalName: string;
  locale: string;
}) {
  const { primary, secondary } = getBilingualLabel(canonicalName, locale);
  return (
    <span>
      <span>{primary}</span>
      {secondary && (
        <span className="ml-1.5 text-muted text-xs">({secondary})</span>
      )}
    </span>
  );
}

export function SchoolForm({
  onConfirm,
  isAnalyzing,
}: {
  onConfirm: (entries: SchoolEntry[]) => void;
  isAnalyzing: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [entries, setEntries] = useState<SchoolEntry[]>([emptyEntry()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateEntry = useCallback(
    (id: string, field: keyof SchoolEntry, value: string) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
      );
      if (field === "institution" && value.trim()) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    []
  );

  function addEntry() {
    if (entries.length >= MAX_SCHOOLS) return;
    setEntries((prev) => [...prev, emptyEntry()]);
  }

  function removeEntry(id: string) {
    if (entries.length <= 1) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function handleConfirm() {
    const newErrors: Record<string, string> = {};
    for (const entry of entries) {
      if (!entry.institution.trim()) {
        newErrors[entry.id] = "required";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onConfirm(entries);
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <div
          key={entry.id}
          className="bg-surface border border-border rounded-xl p-4 shadow-card animate-fade-in"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted font-[family-name:var(--font-dm-mono)]">
              #{index + 1}
            </span>
            {entries.length > 1 && (
              <button
                onClick={() => removeEntry(entry.id)}
                className="text-muted hover:text-coral text-sm transition-colors p-1"
                aria-label="Remove"
              >
                ✕
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-text-secondary mb-1 block">
                {t("form.schoolName")}
              </label>
              <Autocomplete
                items={institutions}
                extraSearchMap={abbreviations}
                localizedNames={locale === "zh" ? zhNames : undefined}
                value={entry.institution}
                displayValue={
                  entry.institution
                    ? getDisplayName(entry.institution, locale)
                    : ""
                }
                onChange={(v) => updateEntry(entry.id, "institution", v)}
                placeholder={
                  locale === "zh"
                    ? "例：MIT、斯坦福、清华"
                    : "e.g. MIT, Stanford, 清华"
                }
                renderItem={(name) => (
                  <InstitutionDropdownItem
                    canonicalName={name}
                    locale={locale}
                  />
                )}
              />
              {errors[entry.id] && (
                <p className="text-xs text-coral mt-1">
                  {t("errors.noSchools")}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs text-text-secondary mb-1 block">
                {t("form.program")}
              </label>
              <Autocomplete
                items={programs}
                value={entry.program}
                onChange={(v) => updateEntry(entry.id, "program", v)}
                placeholder={
                  locale === "zh"
                    ? "例：计算机科学"
                    : "e.g. Computer Science"
                }
              />
            </div>

            <div>
              <label className="text-xs text-text-secondary mb-1 block">
                {t("form.degree")}
              </label>
              <select
                value={entry.degree}
                onChange={(e) =>
                  updateEntry(
                    entry.id,
                    "degree",
                    e.target.value as DegreeType
                  )
                }
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber transition-colors appearance-none"
              >
                {DEGREE_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {t(`form.degrees.${d}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted">{t("form.season")}:</span>
            <span className="text-xs font-medium text-text bg-bg-warm px-2 py-0.5 rounded-full">
              {CURRENT_SEASON}
            </span>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          onClick={addEntry}
          disabled={entries.length >= MAX_SCHOOLS}
          className="text-sm text-amber hover:text-amber-hover font-medium transition-colors disabled:text-muted disabled:cursor-not-allowed"
          title={
            entries.length >= MAX_SCHOOLS ? t("form.maxSchools") : undefined
          }
        >
          {entries.length >= MAX_SCHOOLS
            ? t("form.maxSchools")
            : t("form.addSchool")}
        </button>
        {entries.length > 1 && (
          <span className="text-xs text-muted">
            {entries.length}/{MAX_SCHOOLS}
          </span>
        )}
      </div>

      <button
        onClick={handleConfirm}
        disabled={isAnalyzing || entries.length === 0}
        className="w-full mt-4 px-6 py-3 bg-amber text-white font-medium rounded-full hover:bg-amber-hover transition-all hover:shadow-card-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAnalyzing ? (
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {t("loading.analyzing")}
          </span>
        ) : (
          t("form.confirm")
        )}
      </button>
    </div>
  );
}
