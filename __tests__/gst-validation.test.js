const { validateGSTIN, calculateGstChecksum, GST_STATE_CODES } = require('../client/src/utils/gstUtils');

describe('GSTIN Validation Utilities', () => {
    describe('Checksum Calculation', () => {
        test('should calculate correct checksum for a known GSTIN', () => {
            // Example GSTIN: 19ABKFR7112F1Z3 (R.M.TRADING from settings)
            const base = '19ABKFR7112F1Z';
            const checksum = calculateGstChecksum(base);
            expect(checksum).toBe('3');
        });
    });

    describe('State Code Validation', () => {
        test('should validate all 37+ state codes', () => {
            Object.keys(GST_STATE_CODES).forEach(code => {
                // Construct a mock valid-looking GSTIN for each state
                const mockGST = `${code}ABCDE1234F1Z`;
                const checksum = calculateGstChecksum(mockGST);
                const fullGst = mockGST + checksum;
                const result = validateGSTIN(fullGst);
                
                // If it fails state check, it should be in errors
                const hasStateError = result.errors.some(e => e.includes('Invalid State Code'));
                expect(hasStateError).toBe(false);
            });
        });

        test('should reject invalid state codes', () => {
            const invalidStates = ['00', '39', '99', 'AA'];
            invalidStates.forEach(code => {
                const result = validateGSTIN(`${code}ABCDE1234F1Z1`);
                expect(result.errors.some(e => e.includes('Invalid State Code'))).toBe(true);
            });
        });
    });

    describe('PAN Format Validation', () => {
        test('should reject invalid PAN formats', () => {
            const cases = [
                '19ABCDE123F1Z1', // Too short PAN
                '1912345ABCDE1Z1', // Digits then letters
                '19ABCDE123451Z1', // Too many digits
                '19AAAAA111111Z1'  // All digits in second part
            ];
            cases.forEach(gst => {
                const result = validateGSTIN(gst);
                expect(result.errors.some(e => e.includes('Invalid PAN format'))).toBe(true);
            });
        });
    });

    describe('Format Rules', () => {
        test('should reject non-Z 14th character', () => {
            const result = validateGSTIN('19ABKFR7112F1A3');
            expect(result.errors.some(e => e.includes('14th character must be "Z"'))).toBe(true);
        });

        test('should reject incorrect checksum', () => {
            const result = validateGSTIN('19ABKFR7112F1Z4'); // Should be 3
            expect(result.errors.some(e => e.includes('Incorrect checksum'))).toBe(true);
        });
    });

    describe('Full Validation Flow', () => {
        test('should pass for valid GSTIN 19ABKFR7112F1Z3', () => {
            const result = validateGSTIN('19ABKFR7112F1Z3');
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
            expect(result.stateName).toBe('West Bengal');
        });
    });
});
