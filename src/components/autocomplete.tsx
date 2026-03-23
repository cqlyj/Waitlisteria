"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Fuse from "fuse.js";

type Props = {
  items: string[];
  value: string;
  displayValue?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  extraSearchMap?: Record<string, string>;
  /** Map from canonical name → localized name, added to Fuse search text */
  localizedNames?: Record<string, string>;
  renderItem?: (canonicalName: string) => React.ReactNode;
};

export function Autocomplete({
  items,
  value,
  displayValue,
  onChange,
  placeholder,
  extraSearchMap,
  localizedNames,
  renderItem,
}: Props) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const shownValue = isTyping ? inputText : (displayValue || value);

  const searchItems = useCallback(() => {
    const allEntries: { name: string; searchText: string }[] = items.map(
      (item) => {
        const zhName = localizedNames?.[item];
        const text = zhName ? `${item} ${zhName}` : item;
        return { name: item, searchText: text };
      }
    );

    if (extraSearchMap) {
      for (const [abbr, full] of Object.entries(extraSearchMap)) {
        if (!allEntries.some((e) => e.searchText === abbr)) {
          allEntries.push({ name: full, searchText: `${abbr} ${full}` });
        }
      }
    }

    return allEntries;
  }, [items, extraSearchMap, localizedNames]);

  const fuse = useRef<Fuse<{ name: string; searchText: string }> | null>(null);

  useEffect(() => {
    fuse.current = new Fuse(searchItems(), {
      keys: ["searchText"],
      threshold: 0.35,
      distance: 100,
    });
  }, [searchItems]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setIsTyping(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInput(query: string) {
    setInputText(query);
    setIsTyping(true);
    onChange(query);

    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    if (!fuse.current) return;
    const found = fuse.current.search(query, { limit: 8 });
    const unique = [...new Set(found.map((r) => r.item.name))];
    setResults(unique);
    setOpen(unique.length > 0);
    setHighlightIdx(-1);
  }

  function selectItem(item: string) {
    onChange(item);
    setIsTyping(false);
    setOpen(false);
    setResults([]);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      selectItem(results[highlightIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setIsTyping(false);
    }
  }

  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIdx] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIdx]);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={shownValue}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber transition-colors"
        autoComplete="off"
      />

      {open && results.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-lg shadow-card-hover max-h-56 overflow-y-auto"
        >
          {results.map((item, i) => (
            <li
              key={item}
              onMouseDown={() => selectItem(item)}
              onMouseEnter={() => setHighlightIdx(i)}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                i === highlightIdx
                  ? "bg-amber-soft text-text"
                  : "text-text-secondary hover:bg-bg-warm"
              }`}
            >
              {renderItem ? renderItem(item) : item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
