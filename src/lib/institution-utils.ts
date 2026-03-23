import zhNames from "@/data/institution-names-zh.json";

const zhMap = zhNames as Record<string, string>;

/**
 * Get display name for an institution in the given locale.
 * Always stores/caches with the English canonical name.
 * Returns Chinese name if available in zh locale, otherwise English.
 */
export function getDisplayName(
  englishName: string,
  locale: string
): string {
  if (locale === "zh" && zhMap[englishName]) {
    return zhMap[englishName];
  }
  return englishName;
}

/**
 * Get bilingual label: "中文名 (English Name)" for zh, just English for en.
 */
export function getBilingualLabel(
  englishName: string,
  locale: string
): { primary: string; secondary?: string } {
  if (locale === "zh" && zhMap[englishName]) {
    return {
      primary: zhMap[englishName],
      secondary: englishName,
    };
  }
  return { primary: englishName };
}

/**
 * Get the Chinese name if available, otherwise null.
 */
export function getChineseName(englishName: string): string | null {
  return zhMap[englishName] || null;
}
