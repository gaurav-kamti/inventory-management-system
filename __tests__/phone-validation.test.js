const { Customer, Supplier } = require('../server/models');

describe('Phone Number Validation', () => {
    describe('Customer phone validation', () => {
        it('should allow valid 10-digit numeric phone numbers', async () => {
            const customer = Customer.build({ name: 'Test', phone: '1234567890' });
            await expect(customer.validate()).resolves.not.toThrow();
        });

        it('should reject inputs shorter than 10 digits', async () => {
            const customer = Customer.build({ name: 'Test', phone: '12345' });
            await expect(customer.validate()).rejects.toThrow('Phone number must be exactly 10 digits');
        });

        it('should reject inputs longer than 10 digits', async () => {
            const customer = Customer.build({ name: 'Test', phone: '12345678901' });
            await expect(customer.validate()).rejects.toThrow('Phone number must be exactly 10 digits');
        });

        it('should reject empty inputs for required fields', async () => {
            const customer = Customer.build({ name: 'Test', phone: '' });
            await expect(customer.validate()).rejects.toThrow('Phone number is required');
        });

        it('should reject inputs containing special characters', async () => {
            const customer = Customer.build({ name: 'Test', phone: '123-456-78' });
            await expect(customer.validate()).rejects.toThrow('Phone number must contain only numeric characters');
        });

        it('should reject inputs containing spaces', async () => {
            const customer = Customer.build({ name: 'Test', phone: '12345 6789' });
            await expect(customer.validate()).rejects.toThrow('Phone number must contain only numeric characters');
        });
        
        it('should reject inputs containing letters', async () => {
            const customer = Customer.build({ name: 'Test', phone: '123ABCD890' });
            await expect(customer.validate()).rejects.toThrow('Phone number must contain only numeric characters');
        });
    });

    describe('Supplier phone validation', () => {
        it('should allow valid 10-digit numeric phone numbers', async () => {
            const supplier = Supplier.build({ name: 'Test Supplier', phone: '9876543210' });
            await expect(supplier.validate()).resolves.not.toThrow();
        });

        it('should allow completely empty optional phone inputs', async () => {
            const supplier = Supplier.build({ name: 'Test Supplier', phone: '' });
            await expect(supplier.validate()).resolves.not.toThrow();
        });
        
        it('should reject invalid length even if optional', async () => {
            const supplier = Supplier.build({ name: 'Test Supplier', phone: '123' });
            await expect(supplier.validate()).rejects.toThrow('Phone number must be exactly 10 digits');
        });
        
        it('should reject special characters', async () => {
            const supplier = Supplier.build({ name: 'Test Supplier', phone: '+919876543' });
            await expect(supplier.validate()).rejects.toThrow('Phone number must contain only numeric characters');
        });
    });
});
