const validatePhone = (phone, isRequired = false) => {
    const isPresent = !!(phone && phone.length > 0);
    
    // Logic for error display (red text/border)
    const hasError = !!(isPresent && phone.length !== 10);
    const errorMessage = hasError ? 'Phone number must be exactly 10 digits' : null;
    
    // Logic for button disabled state
    // For required fields, must be present AND exactly 10 digits
    // For optional fields, must be EITHER empty OR exactly 10 digits
    const isDisabled = !!(isRequired 
        ? (!isPresent || phone.length !== 10)
        : (isPresent && phone.length !== 10));
        
    // Logic for visual feedback (opacity/cursor)
    const visualDisabled = isDisabled;

    return { hasError, errorMessage, isDisabled, visualDisabled };
};

describe('Frontend Phone Validation Logic', () => {
    describe('Mandatory Phone Fields (e.g. Primary Phone, Customer Phone)', () => {
        test('should be disabled and have no error when empty (initial state)', () => {
            const result = validatePhone('', true);
            expect(result.isDisabled).toBe(true);
            expect(result.hasError).toBe(false); // No error shown until user types
            expect(result.visualDisabled).toBe(true);
        });

        test('should be disabled and show error with 1 digit', () => {
            const result = validatePhone('1', true);
            expect(result.isDisabled).toBe(true);
            expect(result.hasError).toBe(true);
            expect(result.errorMessage).toBe('Phone number must be exactly 10 digits');
        });

        test('should be disabled and show error with exactly 9 digits', () => {
            const result = validatePhone('123456789', true);
            expect(result.isDisabled).toBe(true);
            expect(result.hasError).toBe(true);
            expect(result.visualDisabled).toBe(true);
        });

        test('should be enabled and show no error with exactly 10 digits', () => {
            const result = validatePhone('1234567890', true);
            expect(result.isDisabled).toBe(false);
            expect(result.hasError).toBe(false);
            expect(result.visualDisabled).toBe(false);
        });
    });

    describe('Optional Phone Fields (e.g. Alternate Phone, Supplier Phone)', () => {
        test('should be enabled and have no error when empty', () => {
            const result = validatePhone('', false);
            expect(result.isDisabled).toBe(false);
            expect(result.hasError).toBe(false);
        });

        test('should be disabled and show error with 9 digits', () => {
            const result = validatePhone('123456789', false);
            expect(result.isDisabled).toBe(true);
            expect(result.hasError).toBe(true);
            expect(result.visualDisabled).toBe(true);
        });

        test('should be enabled and show no error with 10 digits', () => {
            const result = validatePhone('1234567890', false);
            expect(result.isDisabled).toBe(false);
            expect(result.hasError).toBe(false);
        });
    });
});
