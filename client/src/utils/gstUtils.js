/**
 * GSTIN Validation and Formatting Utilities
 * GSTIN Format: 2 digits (State Code) + 10 chars (PAN) + 1 char (Entity Number) + 1 char (Z) + 1 char (Checksum)
 */

const GST_STATE_CODES = {
    '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
    '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
    '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
    '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
    '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
    '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra', '29': 'Karnataka',
    '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
    '35': 'Andaman & Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh'
};

const GST_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Calculates GSTIN Checksum digit using Luhn Mod 36 algorithm
 */
const calculateGstChecksum = (gstin14) => {
    if (!gstin14 || gstin14.length !== 14) return null;
    
    let sum = 0;
    for (let i = 0; i < 14; i++) {
        let char = gstin14[i].toUpperCase();
        let val = GST_CHARS.indexOf(char);
        if (val === -1) return null;
        
        let multiplier = (i % 2 === 0) ? 1 : 2;
        let product = val * multiplier;
        
        // Luhn Mod 36 specific adjustment
        let adjustedProduct = Math.floor(product / 36) + (product % 36);
        sum += adjustedProduct;
    }
    
    let remainder = sum % 36;
    let checksumIndex = (36 - remainder) % 36;
    return GST_CHARS[checksumIndex];
};

/**
 * Detailed GSTIN Validator
 */
const validateGSTIN = (gstin) => {
    const errors = [];
    if (!gstin) return { isValid: false, errors: ['GSTIN is required'] };
    
    // Clean to alphanumeric uppercase for validation
    const cleanGst = gstin.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    if (cleanGst.length !== 15) {
        errors.push(`GSTIN must be exactly 15 characters long (got ${cleanGst.length})`);
    }
    
    // 1. State Code (01-38) - positions 1-2
    const stateCode = cleanGst.substring(0, 2);
    if (cleanGst.length >= 2) {
        if (!/^[0-9]{2}$/.test(stateCode) || !GST_STATE_CODES[stateCode]) {
            errors.push('Invalid state code in positions 1-2');
        }
    } else if (cleanGst.length > 0) {
        errors.push('Invalid state code in positions 1-2');
    }
    
    // 2. PAN Format (Digits 3-12) - positions 3-12
    if (cleanGst.length >= 12) {
        const panPart = cleanGst.substring(2, 12);
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panPart)) {
            errors.push('Invalid PAN format in positions 3-12');
        }
    } else if (cleanGst.length > 2) {
        // Partially check if it's following PAN format so far? 
        // User didn't ask for partial validation messages, just "Invalid PAN format in positions 3-12"
        // But usually we only show this when they've reached that length or finished typing.
    }
    
    // 3. Entity Code (Digit 13) - 13th digit
    if (cleanGst.length >= 13) {
        const entityCode = cleanGst[12];
        if (!/^[0-9]$/.test(entityCode)) {
            errors.push('13th digit must be a number');
        }
    }
    
    // 4. Default character (Digit 14) - 14th digit
    if (cleanGst.length >= 14) {
        const char14 = cleanGst[13];
        if (char14 !== 'Z') {
            errors.push("14th digit must be 'Z'");
        }
    }
    
    // 5. Checksum (Digit 15) - 15th digit
    if (cleanGst.length >= 15) {
        const char15 = cleanGst[14];
        if (!/^[A-Z0-9]$/.test(char15)) {
            errors.push('15th digit must be alphanumeric');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        cleanValue: cleanGst,
        stateName: GST_STATE_CODES[stateCode] || 'Unknown'
    };
};

/**
 * Formats GSTIN to XX-XXXXXXXXXX-X-Z-X
 */
const formatGSTIN = (gstin) => {
    if (!gstin) return '';
    const clean = gstin.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    let formatted = '';
    
    if (clean.length > 0) formatted += clean.substring(0, 2);
    if (clean.length > 2) formatted += '-' + clean.substring(2, 12);
    if (clean.length > 12) formatted += '-' + clean.substring(12, 13);
    if (clean.length > 13) formatted += '-' + clean.substring(13, 14);
    if (clean.length > 14) formatted += '-' + clean.substring(14, 15);
    
    return formatted;
};

const gstLocalization = {
    'required': 'GSTIN is mandatory for this field.',
    'length': 'GSTIN must be exactly 15 characters long.',
    'state': 'The first two digits must be a valid Indian state code.',
    'pan': 'The middle 10 characters must follow the PAN format (5 letters, 4 digits, 1 letter).',
    'entity': 'The 13th character must be a valid entity code.',
    'z': 'The 14th character is always "Z".',
    'checksum': 'Invalid checksum. Please check for typos.',
    'valid': 'Valid GSTIN format.'
};

export {
    GST_STATE_CODES,
    calculateGstChecksum,
    validateGSTIN,
    formatGSTIN,
    gstLocalization
};
