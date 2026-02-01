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
