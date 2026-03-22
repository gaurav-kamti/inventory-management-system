import { useRef, useEffect } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

/**
 * Reusable date picker with dd/mm/yyyy format.
 * Props:
 *   value    – date string in YYYY-MM-DD (internal) format
 *   onChange – callback receiving YYYY-MM-DD string
 *   required, className, style – passed through
 */
export default function DatePicker({ value, onChange, required, className = 'input', style, placeholder }) {
    const inputRef = useRef(null);
    const fpRef = useRef(null);

    useEffect(() => {
        if (!inputRef.current) return;

        fpRef.current = flatpickr(inputRef.current, {
            dateFormat: 'd/m/Y',       // Display format: dd/mm/yyyy
            allowInput: true,
            disableMobile: true,        // Always use flatpickr, never native
            clickOpens: true,
            defaultDate: value || null,
            onChange: (selectedDates) => {
                if (selectedDates.length > 0) {
                    // Convert to YYYY-MM-DD for internal state
                    const d = selectedDates[0];
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    onChange(`${yyyy}-${mm}-${dd}`);
                } else {
                    onChange('');
                }
            }
        });

        return () => {
            if (fpRef.current) fpRef.current.destroy();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync external value changes
    useEffect(() => {
        if (fpRef.current && value) {
            fpRef.current.setDate(value, false);
        } else if (fpRef.current && !value) {
            fpRef.current.clear();
        }
    }, [value]);

    const handleDoubleClick = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const iso = `${yyyy}-${mm}-${dd}`;
        onChange(iso);
        if (fpRef.current) fpRef.current.setDate(today, false);
    };

    return (
        <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
            <input
                ref={inputRef}
                type="text"
                className={className}
                style={{ ...style, cursor: 'pointer', paddingRight: '35px' }}
                required={required}
                placeholder={placeholder || 'dd/mm/yyyy'}
                onDoubleClick={handleDoubleClick}
                readOnly
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
