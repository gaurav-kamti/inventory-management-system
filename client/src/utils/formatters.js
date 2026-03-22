export const formatOverdue = (days) => {
    if (days === undefined || days === null) return 'Active Aging';
    if (days === 0) return 'Today';
    
    if (days < 30) return `${days} Day${days !== 1 ? 's' : ''}`;
    
    if (days < 365) {
        const months = Math.floor(days / 30);
        return `${months} Month${months !== 1 ? 's' : ''}`;
    }
    
    const years = Math.floor(days / 365);
    return `${years} Year${years !== 1 ? 's' : ''}`;
};

export const formatDate = (dateStr, formatString = 'dd/mm/yyyy') => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';

    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();

    if (formatString === 'dd/mm/yyyy') return `${d}/${m}/${y}`;
    if (formatString === 'dd mm yyyy') return `${d} ${m} ${y}`;
    if (formatString === 'yyyy-mm-dd') return `${y}-${m}-${d}`;
    return `${d}/${m}/${y}`; // Default fallback
};
