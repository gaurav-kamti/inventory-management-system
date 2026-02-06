// Utility function to convert numbers to words (Indian format)
export function numberToWords(num) {
    if (!num || num === 0) return 'Zero Rupees Only';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    function convertLessThanThousand(n) {
        if (n === 0) return '';
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
    }
    
    // Split into rupees and paise
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    
    let result = '';
    
    if (rupees === 0) {
        result = 'Zero Rupees';
    } else {
        // Indian numbering: Crores, Lakhs, Thousands, Hundreds
        const crore = Math.floor(rupees / 10000000);
        const lakh = Math.floor((rupees % 10000000) / 100000);
        const thousand = Math.floor((rupees % 100000) / 1000);
        const hundred = rupees % 1000;
        
        if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
        if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
        if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
        if (hundred > 0) result += convertLessThanThousand(hundred);
        
        result = result.trim() + ' Rupees';
    }
    
    if (paise > 0) {
        result += ' and ' + convertLessThanThousand(paise) + ' Paise';
    }
    
    return result.trim() + ' Only';
}

// Calculate CGST/SGST or IGST based on state codes
export function calculateGSTSplit(items, sellerStateCode, buyerStateCode) {
    const isInterState = sellerStateCode !== buyerStateCode;
    
    let totalTaxableAmount = 0;
    let totalTax = 0;
    
    items.forEach(item => {
        const baseAmount = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0) * (1 - (parseFloat(item.discount) || 0) / 100);
        const taxRate = (parseFloat(item.gst) || 18) / 100;
        const taxAmount = baseAmount * taxRate;
        
        totalTaxableAmount += baseAmount;
        totalTax += taxAmount;
    });
    
    if (isInterState) {
        // Inter-state: IGST only
        return {
            type: 'IGST',
            igst: totalTax,
            cgst: 0,
            sgst: 0,
            taxableAmount: totalTaxableAmount
        };
    } else {
        // Intra-state: CGST + SGST (split equally)
        return {
            type: 'CGST/SGST',
            igst: 0,
            cgst: totalTax / 2,
            sgst: totalTax / 2,
            taxableAmount: totalTaxableAmount
        };
    }
}

// Generate HSN-wise summary
export function generateHSNSummary(items) {
    const hsnMap = {};
    
    items.forEach(item => {
        const hsn = item.hsn || '8301';
        const gstRate = parseFloat(item.gst) || 18;
        const quantity = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const discount = parseFloat(item.discount) || 0;
        
        const baseAmount = quantity * rate * (1 - discount / 100);
        const taxAmount = baseAmount * (gstRate / 100);
        
        const key = `${hsn}_${gstRate}`;
        
        if (!hsnMap[key]) {
            hsnMap[key] = {
                hsn,
                gstRate,
                taxableValue: 0,
                cgst: 0,
                sgst: 0,
                igst: 0,
                totalTax: 0
            };
        }
        
        hsnMap[key].taxableValue += baseAmount;
        hsnMap[key].totalTax += taxAmount;
    });
    
    return Object.values(hsnMap);
}

// Round to 2 decimal places
export function round2(value) {
    return Math.round((parseFloat(value || 0) + Number.EPSILON) * 100) / 100;
}
