'use client';

import React, { useState, useRef, useEffect, useId } from 'react';

export type PickerOption = { value: string; label: string };

interface CustomPickerProps {
  options: PickerOption[];
  selected: string | string[];
  onChange: (value: string | string[]) => void;
  searchable?: boolean;
  multiSelect?: boolean;
  addNew?: { label: string; onClick: () => void };
  placeholder?: string;
  disabled?: boolean;
  showUnassigned?: boolean;
  unassignedLabel?: string;
}

export default function CustomPicker({
  options,
  selected,
  onChange,
  searchable = true,
  multiSelect = false,
  addNew,
  placeholder = 'Select\u2026',
  disabled = false,
  showUnassigned = true,
  unassignedLabel = 'Unassigned',
}: CustomPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(-1);
  const [popStyle, setPopStyle] = useState<React.CSSProperties>({});

  const wrapRef  = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const listId = `picker-list-${uid.replace(/:/g, '')}`;

  const selectedArr: string[] = Array.isArray(selected)
    ? selected
    : selected ? [selected] : [];

  const isSelected = (v: string) => selectedArr.includes(v);

  const filtered = options.filter(o =>
    !query || o.label.toLowerCase().includes(query.toLowerCase())
  );

  const showUnassignedRow = showUnassigned && !multiSelect && (
    !query || unassignedLabel.toLowerCase().includes(query.toLowerCase())
  );
  const currentVal = Array.isArray(selected) ? (selected[0] ?? '') : (selected ?? '');

  // ── Fixed positioning — escapes overflow:hidden ancestors (modals, split panels) ──
  useEffect(() => {
    if (!isOpen || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const style: React.CSSProperties = {
      position: 'fixed',
      left: rect.left,
      minWidth: Math.max(rect.width, 180),
      zIndex: 9999,
    };
    if (window.innerHeight - rect.bottom < 280) {
      style.bottom = window.innerHeight - rect.top + 2;
    } else {
      style.top = rect.bottom + 2;
    }
    setPopStyle(style);
  }, [isOpen]);

  // ── Click-outside — matches source: setTimeout + document.mousedown ───────
  useEffect(() => {
    if (!isOpen) return;
    let handler: (e: MouseEvent) => void;
    const timer = setTimeout(() => {
      handler = (e: MouseEvent) => {
        if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
          close();
        }
      };
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      if (handler) document.removeEventListener('mousedown', handler);
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = () => {
    if (disabled) return;
    setIsOpen(true);
    setQuery('');
    setActiveIdx(-1);
    if (searchable) setTimeout(() => searchRef.current?.focus(), 0);
  };

  const close = () => {
    setIsOpen(false);
    setActiveIdx(-1);
  };

  const toggle = () => (isOpen ? close() : open());

  const selectOption = (value: string) => {
    if (multiSelect) {
      const next = selectedArr.includes(value)
        ? selectedArr.filter(v => v !== value)
        : [...selectedArr, value];
      onChange(next);
      // panel stays open in multi-select
    } else {
      onChange(value);
      close();
    }
  };

  const getOptionEls = () =>
    Array.from(wrapRef.current?.querySelectorAll<HTMLElement>('[role=option]') ?? []);

  const moveFocus = (dir: 1 | -1) => {
    const items = getOptionEls();
    const n = items.length;
    if (!n) return;
    const next = activeIdx + dir;
    const clamped = next < 0 ? n - 1 : next >= n ? 0 : next;
    setActiveIdx(clamped);
    items[clamped]?.scrollIntoView({ block: 'nearest' });
  };

  const selectActive = () => {
    const items = getOptionEls();
    if (activeIdx >= 0 && items[activeIdx]) {
      const value = items[activeIdx].getAttribute('data-value');
      if (value != null) selectOption(value);
    }
  };

  // ── Trigger keyboard handler — matches source exactly ─────────────────────
  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) { open(); }
        else if (activeIdx >= 0) { selectActive(); }
        else { close(); }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) { open(); } else { moveFocus(1); }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) { open(); } else { moveFocus(-1); }
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        if (isOpen) close();
        break;
    }
  };

  // ── Search-input keyboard handler — matches source exactly ────────────────
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); moveFocus(1);  break;
      case 'ArrowUp':   e.preventDefault(); moveFocus(-1); break;
      case 'Enter':
        e.preventDefault();
        if (activeIdx >= 0) { selectActive(); } else { close(); }
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
    }
  };

  // ── Trigger label ─────────────────────────────────────────────────────────
  const triggerLabel = (() => {
    if (multiSelect) {
      if (selectedArr.length === 0) return null;
      if (selectedArr.length === 1)
        return options.find(o => o.value === selectedArr[0])?.label ?? null;
      return `${selectedArr.length} selected`;
    }
    const val = Array.isArray(selected) ? selected[0] : selected;
    return options.find(o => o.value === val)?.label ?? null;
  })();

  return (
    <div className="picker-wrap" ref={wrapRef}>

      {/* Trigger — role=combobox matches source ARIA pattern */}
      <button
        className="picker-trigger"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-label={triggerLabel ?? placeholder}
        disabled={disabled}
        type="button"
        onClick={e => { e.stopPropagation(); toggle(); }}
        onTouchStart={e => { e.preventDefault(); e.stopPropagation(); toggle(); }}
        onKeyDown={handleTriggerKeyDown}
      >
        {triggerLabel
          ? triggerLabel
          : <span className="picker-placeholder">{placeholder}</span>
        }
      </button>

      {isOpen && (
        <div className="app-popover" role="presentation" style={popStyle}>

          {/* Search input */}
          {searchable && (
            <input
              ref={searchRef}
              className="app-popover-search"
              placeholder="Search…"
              aria-autocomplete="list"
              aria-controls={listId}
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveIdx(-1); }}
              onKeyDown={handleSearchKeyDown}
            />
          )}

          {/* Option list */}
          <div id={listId} className="app-popover-list" role="listbox">
            {filtered.map((opt, idx) => {
              const sel = isSelected(opt.value);
              return (
                <div
                  key={opt.value}
                  id={`picker-opt-${uid.replace(/:/g, '')}-${idx}`}
                  className={[
                    'app-popover-item',
                    sel       ? 'selected' : undefined,
                    idx === activeIdx ? 'active'   : undefined,
                  ].filter(Boolean).join(' ')}
                  role="option"
                  aria-selected={sel}
                  data-value={opt.value}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onMouseDown={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectOption(opt.value);
                  }}
                >
                  {/* Checkmark — source: \u2713 when selected, empty otherwise */}
                  <span className="app-popover-item-check" aria-hidden="true">
                    {sel ? '\u2713' : ''}
                  </span>
                  <span>{opt.label || '(none)'}</span>
                </div>
              );
            })}

            {filtered.length === 0 && !showUnassignedRow && (
              <div className="app-popover-empty">No matches</div>
            )}
            {showUnassignedRow && (
              <div
                className={'app-popover-item app-popover-item--unassigned' + (!currentVal ? ' selected' : '')}
                role="option"
                aria-selected={!currentVal}
                data-value=""
                onMouseEnter={() => setActiveIdx(filtered.length)}
                onMouseDown={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectOption('');
                }}
              >
                <span className="app-popover-item-check" aria-hidden="true">
                  {!currentVal ? '\u2713' : ''}
                </span>
                <span>{unassignedLabel}</span>
              </div>
            )}
          </div>

          {/* Add new row */}
          {addNew && (
            <div
              className="app-popover-add-new"
              role="button"
              tabIndex={0}
              onMouseDown={e => {
                e.preventDefault();
                e.stopPropagation();
                close();
                addNew.onClick();
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  close();
                  addNew.onClick();
                }
              }}
            >
              + {addNew.label}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
