'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiUrl } from '@/lib/site-config';
import { getActiveMentionQuery, insertMentionAtCursor } from '@/lib/pick-comment-mention';
import { useT } from '@/context/LanguageContext';

export interface MentionSuggestion {
  username: string;
  displayName: string;
  avatar: string | null;
}

interface CommentMentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  rows?: number;
}

export function CommentMentionTextarea({
  value,
  onChange,
  onSubmit,
  placeholder,
  maxLength = 500,
  disabled = false,
  rows = 2,
}: CommentMentionTextareaProps) {
  const t = useT();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    const token = localStorage.getItem('token');
    if (!token || query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    try {
      const res = await fetch(
        `${getApiUrl()}/users/mentions/search?q=${encodeURIComponent(query)}&limit=8`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      const data = await res.json();
      const items: MentionSuggestion[] = Array.isArray(data.items) ? data.items : [];
      setSuggestions(items);
      setOpen(items.length > 0);
      setHighlight(0);
    } catch {
      setSuggestions([]);
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    onChange(next);
    const cursor = e.target.selectionStart ?? next.length;
    const query = getActiveMentionQuery(next, cursor);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query) {
      setOpen(false);
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => void fetchSuggestions(query), 200);
  };

  const applyMention = (username: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? value.length;
    const { nextText, nextCursor } = insertMentionAtCursor(value, cursor, username);
    onChange(nextText);
    setOpen(false);
    setSuggestions([]);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (open && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => (h + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        applyMention(suggestions[highlight].username);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        applyMention(suggestions[highlight].username);
        return;
      }
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative flex-1 min-w-0">
      {open ? (
        <ul
          className="absolute bottom-full left-0 right-0 mb-1 max-h-40 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg z-20 py-1"
          role="listbox"
        >
          {suggestions.map((s, i) => (
            <li key={s.username} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                  i === highlight ? 'bg-[var(--primary-light)]/60' : 'hover:bg-[var(--fill-secondary)]'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyMention(s.username);
                }}
              >
                <span className="font-semibold text-[var(--primary)]">@{s.username}</span>
                <span className="text-[var(--text-muted)] truncate">{s.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--fill-secondary)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 disabled:opacity-50"
        aria-autocomplete="list"
        aria-expanded={open}
      />
    </div>
  );
}
