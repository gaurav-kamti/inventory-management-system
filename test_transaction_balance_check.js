const { Supplier, Customer, Purchase, Sale, sequelize } = require('./server/models');

const runTest = async () => {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Create Test Supplier
        const supplier = await Supplier.create({
            name: `Test Supplier ${Date.now()}`,
            outstandingBalance: 0
        });
        console.log(`Created Supplier: ${supplier.name} (ID: ${supplier.id})`);

        // 2. Create Test Customer
        const customer = await Customer.create({
            name: `Test Customer ${Date.now()}`,
            phone: '555-0000',
            outstandingBalance: 0
        });
        console.log(`Created Customer: ${customer.name} (ID: ${customer.id})`);

        // 3. Simulate Purchase (Backend Call Logic)
        const billAmount = 1000;
        await supplier.update({
            outstandingBalance: parseFloat(supplier.outstandingBalance || 0) + billAmount
        });

        const updatedSupplier = await Supplier.findByPk(supplier.id);
        console.log(`Supplier Balance after Purchase ($${billAmount}): ${updatedSupplier.outstandingBalance}`);

        if (parseFloat(updatedSupplier.outstandingBalance) === 1000) {
            console.log('✅ Supplier Balance Update: SUCCESS');
        } else {
            console.error('❌ Supplier Balance Update: FAILED');
        }


        // 4. Simulate Sale (Backend Call Logic)
        const saleTotal = 500;
        const amountPaid = 0; // Credit sale
        const due = saleTotal - amountPaid;

        if (due > 0) {
            await customer.update({
                outstandingBalance: parseFloat(customer.outstandingBalance || 0) + due
            });
        }

        const updatedCustomer = await Customer.findByPk(customer.id);
        console.log(`Customer Balance after Sale ($${saleTotal}, Paid $0): ${updatedCustomer.outstandingBalance}`);

        if (parseFloat(updatedCustomer.outstandingBalance) === 500) {
            console.log('✅ Customer Balance Update: SUCCESS');
        } else {
            console.error('❌ Customer Balance Update: FAILED');
        }

    } catch (error) {
        console.error('Test Error:', error);
    } finally {
        await sequelize.close();
        process.exit();
    }
};

runTest();
