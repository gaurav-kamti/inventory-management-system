import { useRef, useEffect, useCallback } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

/**
 * Normalize ISO date string to local midnight (YYYY-MM-DD)
 * Handles both "2026-06-20" and "2026-06-20T00:00:00Z" formats
 */
function normalizeISODate(isoStr) {
    if (!isoStr || typeof isoStr !== 'string') return null;
    // Extract just the date part (YYYY-MM-DD)
    const match = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return `${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * Convert ISO date string to local Date object (avoiding timezone issues)
 * "2026-06-20" → Date object set to local midnight on 2026-06-20
 */
function isoToLocalDate(isoStr) {
    const normalized = normalizeISODate(isoStr);
    if (!normalized) return null;
    const [year, month, day] = normalized.split('-').map(Number);
    // Create date in LOCAL timezone, not UTC
    return new Date(year, month - 1, day);
}

/**
 * Parse flexible date input: supports dd/mm/yyyy, ddmmyyyy, dd.mm.yy, dd mm, etc.
 * Returns a Date object or null.
 */
function parseFlexibleDate(input) {
    if (!input || typeof input !== 'string') return null;
    const s = input.trim();
    if (!s) return null;

    const currentYear = new Date().getFullYear();
    let day, month, year;

    // Pattern 1: No separator — DDMMYYYY (8 digits) or DDMMYY (6 digits)
    const noSep = s.match(/^(\d{2})(\d{2})(\d{4})$/);
    if (noSep) {
        day = parseInt(noSep[1], 10);
        month = parseInt(noSep[2], 10);
        year = parseInt(noSep[3], 10);
    }

    if (!day) {
        const noSep2 = s.match(/^(\d{2})(\d{2})(\d{2})$/);
        if (noSep2) {
            day = parseInt(noSep2[1], 10);
            month = parseInt(noSep2[2], 10);
            year = 2000 + parseInt(noSep2[3], 10);
        }
    }

    // Pattern 2: DDMM (4 digits, no year) → use current year
    if (!day) {
        const noSep3 = s.match(/^(\d{2})(\d{2})$/);
        if (noSep3) {
            day = parseInt(noSep3[1], 10);
            month = parseInt(noSep3[2], 10);
            year = currentYear;
        }
    }

    // Pattern 3: With separator (/ . - or space)
    if (!day) {
        const withSep = s.match(/^(\d{1,2})[\/.\-\s](\d{1,2})(?:[\/.\-\s](\d{2,4}))?$/);
        if (withSep) {
            day = parseInt(withSep[1], 10);
            month = parseInt(withSep[2], 10);
            if (withSep[3]) {
                year = parseInt(withSep[3], 10);
                if (year < 100) year += 2000;
            } else {
                year = currentYear;
            }
        }
    }

    if (!day || !month || !year) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    const d = new Date(year, month - 1, day);
    // Validate the date is real (e.g., not Feb 30)
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
        return null;
    }
    return d;
}

/**
 * Convert Date object to ISO string (YYYY-MM-DD)
 * Always uses the date's own day/month/year without timezone conversion
 */
function dateToISO(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default function DatePicker({ value, onChange, required, className = 'input', style, placeholder }) {
    const inputRef = useRef(null);
    const fpRef = useRef(null);
    const lastCommittedValue = useRef(null); // Track last value we sent to parent

    // Stable onChange ref to avoid stale closures
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const commitDate = useCallback((dateObj) => {
        const iso = dateToISO(dateObj);
        lastCommittedValue.current = iso;
        onChangeRef.current(iso);
    }, []);

    useEffect(() => {
        if (!inputRef.current) return;

        fpRef.current = flatpickr(inputRef.current, {
            dateFormat: 'd/m/Y',
            allowInput: true,
            disableMobile: true,
            clickOpens: true,
            defaultDate: value ? isoToLocalDate(value) : null,
            onChange: (selectedDates) => {
                if (selectedDates.length > 0) {
                    commitDate(selectedDates[0]);
                }
            }
        });

        return () => {
            if (fpRef.current) fpRef.current.destroy();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync external value changes (from parent state)
    useEffect(() => {
        if (!fpRef.current) return;
        if (!value) {
            fpRef.current.clear();
            lastCommittedValue.current = null;
            return;
        }

        // Only update if parent's value differs from what we last sent
        // This prevents unnecessary re-syncing
        if (lastCommittedValue.current === value) {
            return;
        }

        const localDate = isoToLocalDate(value);
        if (localDate) {
            fpRef.current.setDate(localDate, false);
        }
    }, [value]);

    const handleDoubleClick = () => {
        commitDate(new Date());
    };

    const handleBlur = () => {
        if (!inputRef.current) return;
        const val = inputRef.current.value;

        if (!val) {
            lastCommittedValue.current = '';
            onChangeRef.current('');
            if (fpRef.current) fpRef.current.clear();
            return;
        }

        // If flatpickr already has a valid selected date, don't re-parse
        if (fpRef.current && fpRef.current.selectedDates.length > 0) {
            return;
        }

        // Try flexible parsing for manual input
        const parsed = parseFlexibleDate(val);
        if (parsed) {
            commitDate(parsed);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const parsed = parseFlexibleDate(e.target.value);
            if (parsed) {
                commitDate(parsed);
                if (fpRef.current) fpRef.current.close();
            }
        }
    };

    return (
        <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
            <input
                ref={inputRef}
                type="text"
                className={className}
                style={{ ...style, cursor: 'text', paddingRight: '35px' }}
                required={required}
                placeholder={placeholder || 'dd/mm/yyyy'}
                onDoubleClick={handleDoubleClick}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
            <div style={{ 
                position: 'absolute', 
                right: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                opacity: 0.8
            }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
            </div>
        </div>
    );
}
