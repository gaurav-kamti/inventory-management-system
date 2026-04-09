import { useRef, useEffect, useCallback } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

/**
 * Normalize ISO date string to local midnight (YYYY-MM-DD)
 */
function normalizeISODate(isoStr) {
    if (!isoStr || typeof isoStr !== 'string') return null;
    const match = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return `${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * Convert ISO date string to local Date object (avoiding timezone issues)
 */
function isoToLocalDate(isoStr) {
    const normalized = normalizeISODate(isoStr);
    if (!normalized) return null;
    const [year, month, day] = normalized.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Parse flexible date input: supports dd/mm/yyyy, ddmmyyyy, dd.mm.yy, etc.
 */
function parseFlexibleDate(input) {
    if (!input || typeof input !== 'string') return null;
    const s = input.trim();
    if (!s) return null;

    const currentYear = new Date().getFullYear();
    let day, month, year;

    // DDMMYYYY or DDMMYY
    const noSep = s.match(/^(\d{2})(\d{2})(\d{4})$/);
    if (noSep) {
        day = parseInt(noSep[1], 10);
        month = parseInt(noSep[2], 10);
        year = parseInt(noSep[3], 10);
    } else {
        const noSep2 = s.match(/^(\d{2})(\d{2})(\d{2})$/);
        if (noSep2) {
            day = parseInt(noSep2[1], 10);
            month = parseInt(noSep2[2], 10);
            year = 2000 + parseInt(noSep2[3], 10);
        } else {
            const noSep3 = s.match(/^(\d{2})(\d{2})$/);
            if (noSep3) {
                day = parseInt(noSep3[1], 10);
                month = parseInt(noSep3[2], 10);
                year = currentYear;
            }
        }
    }

    // With separator
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
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    return d;
}

/**
 * Convert Date object to ISO string (YYYY-MM-DD)
 */
function dateToISO(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default function DatePicker({ value, onChange, required, className = 'input', style, placeholder, minDate, maxDate }) {
    const inputRef = useRef(null);
    const fpRef = useRef(null);
    const lastCommittedValue = useRef(null);

    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const commitDate = useCallback((dateObj) => {
        if (!dateObj) return;

        // Validation against constraints
        if (minDate && dateObj < isoToLocalDate(minDate)) return;
        if (maxDate && dateObj > isoToLocalDate(maxDate)) return;

        const iso = dateToISO(dateObj);
        
        if (iso !== lastCommittedValue.current) {
            lastCommittedValue.current = iso;
            onChangeRef.current(iso);
        }
    }, [minDate, maxDate]);

    useEffect(() => {
        if (!inputRef.current) return;

        fpRef.current = flatpickr(inputRef.current, {
            dateFormat: 'd/m/Y',
            allowInput: true,
            disableMobile: true,
            clickOpens: true,
            minDate: minDate ? isoToLocalDate(minDate) : undefined,
            maxDate: maxDate ? isoToLocalDate(maxDate) : undefined,
            defaultDate: value ? isoToLocalDate(value) : null,
            parseDate: (dateStr) => {
                return parseFlexibleDate(dateStr);
            },
            onValueUpdate: (selectedDates) => {
                if (selectedDates.length > 0) commitDate(selectedDates[0]);
            },
            onChange: (selectedDates) => {
                if (selectedDates.length > 0) commitDate(selectedDates[0]);
            },
            onClose: (selectedDates) => {
                if (selectedDates.length > 0) commitDate(selectedDates[0]);
            }
        });

        return () => {
            if (fpRef.current) fpRef.current.destroy();
        };
    }, [minDate, maxDate]);

    useEffect(() => {
        if (!fpRef.current) return;
        
        const fpDate = fpRef.current.selectedDates[0];
        const fpISO = fpDate ? dateToISO(fpDate) : '';
        const parentISO = value || '';

        if (fpISO === parentISO) {
            lastCommittedValue.current = parentISO;
            return;
        }

        lastCommittedValue.current = parentISO;
        if (!parentISO) {
            fpRef.current.clear();
        } else {
            const localDate = isoToLocalDate(parentISO);
            if (localDate) fpRef.current.setDate(localDate, false);
        }
    }, [value]);

    const handleBlur = (e) => {
        // Force commit on blur to ensure typing is never lost
        if (fpRef.current) {
            const parsed = parseFlexibleDate(e.target.value);
            if (parsed) {
                fpRef.current.setDate(parsed, true);
            } else if (!e.target.value) {
                lastCommittedValue.current = '';
                onChangeRef.current('');
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            
            if (fpRef.current) {
                const date = parseFlexibleDate(e.target.value);
                if (date) {
                    fpRef.current.setDate(date, true);
                    fpRef.current.close();
                } else if (fpRef.current.selectedDates.length > 0) {
                    fpRef.current.close();
                }
            }
        }
    };

    const handleDoubleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const today = new Date(now.getTime() - (offset * 60 * 1000));
        if (fpRef.current) {
            fpRef.current.setDate(today, true);
            fpRef.current.close();
        }
        commitDate(today);
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
                autoComplete="off"
            />
            <div 
                onClick={() => fpRef.current?.open()}
                onDoubleClick={handleDoubleClick}
                style={{ 
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', 
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-primary)', opacity: 0.8, zIndex: 2
                }}
            >
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
