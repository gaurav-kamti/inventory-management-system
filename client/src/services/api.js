import { supabase } from '../lib/supabase';

// Helper to format responses like Axios ({ data: ... })
const formatRes = (data) => ({ data });
const formatErr = (error) => Promise.reject({ response: { data: { error: error.message } } });

class SupabaseApiAdapter {
    async get(url, config = {}) {
        const path = url.split('?')[0];
        
        switch (path) {
            case '/products': {
                const { data, error } = await supabase.from('Products').select('*');
                if (error) return formatErr(error);
                return formatRes(data);
            }
            case '/customers': {
                const { data: customers, error } = await supabase.from('Customers').select('*');
                if (error) return formatErr(error);
                
                // Identify customers with outstanding balances for aging calculation
                const debtors = (customers || []).filter(c => parseFloat(c.outstandingBalance || 0) > 0);
                const debtorIds = debtors.map(c => c.id);

                let salesByCustomer = {};
                if (debtorIds.length > 0) {
                    // Fetch all relevant sales in a single batch to avoid N+1 queries
                    const { data: allSales } = await supabase.from('Sales')
                        .select('id, customerId, total, createdAt')
                        .in('customerId', debtorIds)
                        .order('createdAt', { ascending: false });

                    salesByCustomer = (allSales || []).reduce((acc, s) => {
                        if (!acc[s.customerId]) acc[s.customerId] = [];
                        acc[s.customerId].push(s);
                        return acc;
                    }, {});
                }

                const customersWithAging = (customers || []).map(customer => {
                    const custData = { ...customer };
                    const balance = parseFloat(customer.outstandingBalance || 0);

                    if (balance > 0) {
                        const sales = salesByCustomer[customer.id] || [];
                        let balanceToExplain = balance;
                        let oldestUnpaidDate = customer.createdAt ? new Date(customer.createdAt) : new Date();

                        for (const sale of sales) {
                            const saleAmount = parseFloat(sale.total || 0);
                            if (balanceToExplain <= saleAmount) {
                                oldestUnpaidDate = new Date(sale.createdAt);
                                balanceToExplain = 0;
                                break;
                            } else {
                                balanceToExplain -= saleAmount;
                                oldestUnpaidDate = new Date(sale.createdAt);
                            }
                        }

                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const pastDate = new Date(oldestUnpaidDate);
                        pastDate.setHours(0, 0, 0, 0);
                        const diffTime = Math.abs(today - pastDate);
                        custData.daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        custData.oldestUnpaidDate = oldestUnpaidDate;
                    } else {
                        custData.daysOverdue = 0;
                        custData.oldestUnpaidDate = null;
                    }
                    return custData;
                });

                return formatRes(customersWithAging);
            }
            case '/suppliers': {
                const { data, error } = await supabase.from('Suppliers').select('*');
                if (error) return formatErr(error);
                return formatRes(data);
            }
            case '/sales': {
                const { data, error } = await supabase.from('Sales')
                    .select('*, customer:Customers(*), items:SaleItems(*, Product:Products(*))')
                    .order('createdAt', { ascending: false });
                if (error) return formatErr(error);
                return formatRes(data);
            }
            case '/purchases': {
                // We need to return an object that looks like a "bill" with items.
                // In Supabase, Purchases are currently line-items. We should probably group them or return a view.
                // For now, let's group by invoiceNumber in the adapter to match the UI expectation.
                const { data, error } = await supabase.from('Purchases')
                    .select('*, product:Products(*), party:Suppliers(*)')
                    .order('receivedDate', { ascending: false });
                
                if (error) return formatErr(error);

                // Grouping logic for the UI which expects one "record" per invoice
                const grouped = data.reduce((acc, curr) => {
                    if (!acc[curr.invoiceNumber]) {
                        acc[curr.invoiceNumber] = {
                            ...curr,
                            items: []
                        };
                    }
                    acc[curr.invoiceNumber].items.push({
                        ...curr,
                        name: curr.name || curr.product?.name
                    });
                    return acc;
                }, {});

                return formatRes(Object.values(grouped));
            }
            case '/credits': {
                const { data, error } = await supabase.from('CreditTransactions')
                    .select('*, Customer:Customers(*), Sales(*)')
                    .order('createdAt', { ascending: false });
                if (error) return formatErr(error);
                return formatRes(data);
            }
            case '/settings/invoice_config': {
                try {
                    const { data, error } = await supabase.from('Settings').select('*').eq('key', 'invoice_config');
                    if (error || !data || data.length === 0) {
                        return formatRes({ prefix: 'INV', sequence: 1, fiscalYear: '2023-24' });
                    }
                    return formatRes(data[0].value);
                } catch (err) {
                    return formatRes({ prefix: 'INV', sequence: 1, fiscalYear: '2023-24' });
                }
            }
            case '/settings/company_profile': {
                try {
                    const { data, error } = await supabase.from('Settings').select('*').eq('key', 'company_profile');
                    if (error || !data || data.length === 0) {
                        return formatRes({ name: '', address: '', phone: '', email: '', gstin: '' });
                    }
                    return formatRes(data[0].value);
                } catch (err) {
                    return formatRes({ name: '', address: '', phone: '', email: '', gstin: '' });
                }
            }
            case '/vouchers/history': {
                const [{ data: receipts }, { data: payments }] = await Promise.all([
                    supabase.from('CreditTransactions').select('*, Customer:Customers(name)').eq('type', 'payment').order('createdAt', { ascending: false }),
                    supabase.from('SupplierTransactions').select('*, Supplier:Suppliers(name)').eq('type', 'payment').order('date', { ascending: false })
                ]);
                const vouchers = [
                    ...(receipts || []).map(p => ({
                        id: `R-${p.id}`,
                        date: p.createdAt,
                        type: 'RECEIPT',
                        partyName: p.Customer?.name || 'Unknown',
                        amount: p.amount,
                        mode: p.notes,
                        rawDate: new Date(p.createdAt)
                    })),
                    ...(payments || []).map(p => ({
                        id: `P-${p.id}`,
                        date: p.date,
                        type: 'PAYMENT',
                        partyName: p.Supplier?.name || 'Unknown',
                        amount: p.amount,
                        mode: p.notes,
                        rawDate: new Date(p.date)
                    }))
                ].sort((a, b) => b.rawDate - a.rawDate);
                return formatRes(vouchers);
            }
            case '/dashboard/stats': {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const [
                    { data: salesToday },
                    { count: totalProducts },
                    { data: lowStockProds },
                    { count: totalCustomers },
                    { data: customers }
                ] = await Promise.all([
                    supabase.from('Sales').select('total').gte('createdAt', today.toISOString()),
                    supabase.from('Products').select('*', { count: 'exact', head: true }),
                    supabase.from('Products').select('id, stock, lowStockThreshold'),
                    supabase.from('Customers').select('*', { count: 'exact', head: true }),
                    supabase.from('Customers').select('outstandingBalance')
                ]);

                const todaySalesSum = (salesToday || []).reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
                const lowStockCount = (lowStockProds || []).filter(p => parseFloat(p.stock || 0) <= parseFloat(p.lowStockThreshold || 0)).length;
                const totalOutstanding = (customers || []).reduce((sum, c) => sum + parseFloat(c.outstandingBalance || 0), 0);
                
                // Calculate total inventory worth
                const { data: allProducts } = await supabase.from('Products').select('stock, purchasePrice');
                const totalWorth = (allProducts || []).reduce((sum, p) => sum + (parseFloat(p.stock || 0) * parseFloat(p.purchasePrice || 0)), 0);

                return formatRes({
                    todaySales: todaySalesSum,
                    totalProducts: totalProducts || 0,
                    lowStockProducts: lowStockCount,
                    totalCustomers: totalCustomers || 0,
                    totalOutstanding,
                    totalInventoryWorth: totalWorth
                });
            }
            default: {
                const parts = path.split('/');
                if (path.includes('/vouchers/unused-advances/')) {
                    const entity = parts[parts.length - 2];
                    const entityId = parts[parts.length - 1];
                    const table = entity === 'customer' ? 'CreditTransactions' : 'SupplierTransactions';
                    const idField = entity === 'customer' ? 'customerId' : 'supplierId';
                    const dateField = entity === 'customer' ? 'createdAt' : 'date';
                    const { data, error } = await supabase.from(table).select('*').eq(idField, entityId).eq('isAdvance', true).gt('remainingAdvance', 0).order(dateField, { ascending: true });
                    if (error) return formatErr(error);
                    return formatRes(data);
                }
                if (url.startsWith('/vouchers/unpaid-sales/')) {
                    const customerId = parts[parts.length - 1];
                    const { data, error } = await supabase.from('Sales').select('*').eq('customerId', customerId).gt('amountDue', 0).order('createdAt', { ascending: true });
                    if (error) return formatErr(error);
                    return formatRes(data);
                }
                if (url.startsWith('/vouchers/unpaid-purchases/')) {
                    const supplierId = parts[parts.length - 1];
                    const { data, error } = await supabase.from('Purchases')
                        .select('invoiceNumber, total, amountDue, receivedDate')
                        .eq('supplierId', supplierId)
                        .gt('amountDue', 0)
                        .order('receivedDate', { ascending: true });
                    
                    if (error) return formatErr(error);

                    // Group by invoiceNumber since Payment.jsx expects unique references
                    const grouped = data.reduce((acc, curr) => {
                        if (!acc[curr.invoiceNumber]) {
                            acc[curr.invoiceNumber] = {
                                ...curr,
                                id: curr.invoiceNumber // Payment.jsx uses this as value in select
                            };
                        }
                        return acc;
                    }, {});

                    return formatRes(Object.values(grouped));
                }
                if (url.includes('/history')) {
                    const isCustomer = path.includes('/customers/');
                    const isSupplier = path.includes('/suppliers/');
                    const id = parts[parts.length - 2];

                    if (isCustomer) {
                        const [{ data: customer }, { data: sales }, { data: payments }] = await Promise.all([
                            supabase.from('Customers').select('*').eq('id', id).single(),
                            supabase.from('Sales').select('*').eq('customerId', id).order('createdAt', { ascending: true }),
                            supabase.from('CreditTransactions').select('*').eq('customerId', id).order('createdAt', { ascending: true })
                        ]);

                        const ledger = [
                            ...(sales || []).map(s => ({
                                id: `S-${s.id}`,
                                date: s.createdAt,
                                type: 'SALE',
                                description: `Invoice #${s.invoiceNumber}`,
                                debit: parseFloat(s.total || 0),
                                credit: 0,
                                rawDate: new Date(s.createdAt)
                            })),
                            ...(payments || []).map(p => ({
                                id: `P-${p.id}`,
                                date: p.createdAt,
                                type: 'RECEIPT',
                                description: p.notes || `Payment (${p.method})`,
                                debit: 0,
                                credit: parseFloat(p.amount || 0),
                                rawDate: new Date(p.createdAt)
                            }))
                        ].sort((a, b) => a.rawDate - b.rawDate);

                        let balance = 0;
                        const history = ledger.map(entry => {
                            balance += entry.debit - entry.credit;
                            return { ...entry, balance: parseFloat(balance.toFixed(2)) };
                        });
                        return formatRes({ customer, history });
                    }

                    if (isSupplier) {
                        const [{ data: supplier }, { data: purchases }, { data: payments }] = await Promise.all([
                            supabase.from('Suppliers').select('*').eq('id', id).single(),
                            supabase.from('Purchases').select('*').eq('supplierId', id).order('receivedDate', { ascending: true }),
                            supabase.from('SupplierTransactions').select('*').eq('supplierId', id).order('date', { ascending: true })
                        ]);

                        const ledger = [
                            ...(purchases || []).map(p => ({
                                id: `PR-${p.id}`,
                                date: p.receivedDate,
                                type: 'PURCHASE',
                                description: `Invoice #${p.invoiceNumber} (${p.name})`,
                                debit: 0,
                                credit: parseFloat(p.totalCost || 0),
                                rawDate: new Date(p.receivedDate)
                            })),
                            ...(payments || []).map(p => ({
                                id: `T-${p.id}`,
                                date: p.date,
                                type: 'PAYMENT',
                                description: p.notes || `Payment (${p.method})`,
                                debit: parseFloat(p.amount || 0),
                                credit: 0,
                                rawDate: new Date(p.date)
                            }))
                        ].sort((a, b) => a.rawDate - b.rawDate);

                        let balance = 0;
                        const history = ledger.map(entry => {
                            balance += (entry.credit - entry.debit);
                            return { ...entry, balance: parseFloat(balance.toFixed(2)) };
                        });
                        return formatRes({ supplier, history });
                    }
                }
                console.warn(`Unimplemented GET route: ${url}`);
                return formatRes([]);
            }
        }
    }

    async post(url, payload) {
        const now = new Date().toISOString();
        if (url === '/products') {
            const { data, error } = await supabase.from('Products').insert({ ...payload, createdAt: now, updatedAt: now }).select().single();
            if (error) return formatErr(error);
            return formatRes(data);
        }
        if (url === '/customers') {
            const { data, error } = await supabase.from('Customers').insert({ ...payload, createdAt: now, updatedAt: now }).select().single();
            if (error) return formatErr(error);
            return formatRes(data);
        }
        if (url === '/suppliers') {
            const { data, error } = await supabase.from('Suppliers').insert({ ...payload, createdAt: now, updatedAt: now }).select().single();
            if (error) return formatErr(error);
            return formatRes(data);
        }
        if (url === '/sales') {
            try {
                const { 
                    items, 
                    customerId, 
                    paymentMode, 
                    amountPaid: rawPaid, 
                    advanceAdjustments, 
                    afterGST, 
                    salesChannel, 
                    date,
                    ...rest 
                } = payload;
                const { data: { user } } = await supabase.auth.getUser();
                const total = parseFloat(payload.total) || 0;
                const amountPaid = parseFloat(rawPaid) || 0;
                const amountDue = total - amountPaid;

                // 1. Create Sale record
                const { data: sale, error: saleErr } = await supabase.from('Sales').insert({ 
                    ...rest, 
                    customerId: customerId || null, 
                    paymentMode, 
                    amountPaid, 
                    amountDue, 
                    total,
                    userId: user?.id || null,
                    createdAt: date ? new Date(date).toISOString() : now, 
                    updatedAt: now 
                }).select().single();
                if (saleErr) throw saleErr;

                // 2. Create SaleItems & Update Stock
                for (const item of items) {
                    const { error: itemErr } = await supabase.from('SaleItems').insert({ 
                        ...item, 
                        saleId: sale.id, 
                        createdAt: now, 
                        updatedAt: now 
                    });
                    if (itemErr) throw itemErr;

                    if (item.productId) {
                        const { data: prod } = await supabase.from('Products').select('stock').eq('id', item.productId).single();
                        if (prod) {
                            await supabase.from('Products').update({ 
                                stock: prod.stock - (parseFloat(item.quantity) || 0),
                                sellingPrice: parseFloat(item.price || item.rate) || prod.sellingPrice 
                            }).eq('id', item.productId);
                        }
                    }
                }

                // 3. Handle Customer Balance & Transaction
                if (customerId && amountDue > 0) {
                    const { data: customer } = await supabase.from('Customers').select('outstandingBalance').eq('id', customerId).single();
                    if (customer) {
                        await supabase.from('Customers').update({ 
                            outstandingBalance: (parseFloat(customer.outstandingBalance || 0) + amountDue) 
                        }).eq('id', customerId);
                    }
                }

                if (customerId && (paymentMode === 'credit' || amountDue > 0)) {
                    await supabase.from('CreditTransactions').insert({
                        customerId,
                        type: 'sale',
                        saleId: sale.id,
                        amount: total,
                        notes: `Sale - Invoice: ${sale.invoiceNumber}`,
                        createdAt: now
                    });
                }

                return formatRes(sale);
            } catch (err) {
                console.error("POST /sales error:", err);
                return formatErr(err);
            }
        }
        if (url === '/purchases') {
            try {
                const { 
                    items, 
                    supplierId, 
                    invoiceNumber, 
                    date, 
                    total: rawTotal,
                    roundOff,
                    subtotal,
                    taxableAmount,
                    gstPercent,
                    discountPercent,
                    discountAmount,
                    cgst,
                    sgst,
                    advanceAdjustments
                } = payload;
                const total = parseFloat(rawTotal) || 0;

                const createdPurchases = [];
                for (const item of items) {
                    if (item.productId) {
                         const { data: prod } = await supabase.from('Products').select('stock').eq('id', item.productId).single();
                         if (prod) {
                             await supabase.from('Products').update({ 
                                 stock: (parseFloat(prod.stock || 0) + (parseFloat(item.quantity) || 0)),
                                 purchasePrice: parseFloat(item.rate) || prod.purchasePrice
                             }).eq('id', item.productId);
                         }
                    }

                    const purPayload = {
                        productId: item.productId,
                        supplierId,
                        invoiceNumber,
                        quantityReceived: parseFloat(item.quantity) || 0,
                        unitCost: parseFloat(item.rate) || 0,
                        landingCost: parseFloat(item.rate) || 0,
                        totalCost: parseFloat(item.amount) || 0,
                        receivedDate: date ? new Date(date).toISOString() : now,
                        subtotal: subtotal || 0,
                        taxableAmount: taxableAmount || subtotal || 0,
                        gstPercent: gstPercent || 18,
                        discountPercent: discountPercent || 0,
                        discountAmount: discountAmount || 0,
                        cgst: cgst || 0,
                        sgst: sgst || 0,
                        tax: (parseFloat(cgst || 0) + parseFloat(sgst || 0)),
                        total: total,
                        roundOff: roundOff || 0,
                        name: item.name || '',
                        size: item.size || '',
                        sizeUnit: item.sizeUnit || 'mm',
                        quantityUnit: item.quantityUnit || 'Pcs',
                        createdAt: now,
                        updatedAt: now
                    };
                    const { data: newPur, error: pErr } = await supabase.from('Purchases').insert(purPayload).select().single();
                    if (pErr) throw pErr;
                    createdPurchases.push(newPur);
                }

                if (supplierId && total > 0) {
                    const { data: supplier } = await supabase.from('Suppliers').select('outstandingBalance').eq('id', supplierId).single();
                    if (supplier) {
                        await supabase.from('Suppliers').update({ 
                            outstandingBalance: (parseFloat(supplier.outstandingBalance || 0) + total) 
                        }).eq('id', supplierId);
                    }

                    await supabase.from('SupplierTransactions').insert({
                        supplierId,
                        type: 'bill',
                        amount: total,
                        amountPaid: 0,
                        amountDue: total,
                        status: 'pending',
                        invoiceNumber: invoiceNumber,
                        date: date ? new Date(date).toISOString() : now,
                        method: 'New Ref',
                        notes: `Bill for Invoice: ${invoiceNumber}`,
                        createdAt: now
                    });
                }

                return formatRes({ message: 'Purchase recorded', items: createdPurchases });
            } catch (err) {
                console.error("POST /purchases error:", err);
                return formatErr(err);
            }
        }
        if (url === '/vouchers/receipt') {
            try {
                const { customerId, amount: rawAmount, date, notes, method, referenceId } = payload;
                const amount = parseFloat(rawAmount) || 0;
                
                // 1. Create CreditTransaction
                const { data: trans, error: tErr } = await supabase.from('CreditTransactions').insert({
                    customerId,
                    type: 'payment', // Matching voucher history and original backend terminology
                    amount,
                    notes,
                    method,
                    saleId: method === 'Agst Ref' ? referenceId : null,
                    createdAt: date ? new Date(date).toISOString() : now
                }).select().single();
                if (tErr) throw tErr;

                // 2. Update Customer Balance
                const { data: customer } = await supabase.from('Customers').select('outstandingBalance').eq('id', customerId).single();
                let newBalance = 0;
                if (customer) {
                    newBalance = parseFloat(customer.outstandingBalance || 0) - amount;
                    await supabase.from('Customers').update({ outstandingBalance: newBalance }).eq('id', customerId);
                }

                // 3. If Against Reference, update the Sale
                if (method === 'Agst Ref' && referenceId) {
                    const { data: sale } = await supabase.from('Sales').select('amountPaid, amountDue').eq('id', referenceId).single();
                    if (sale) {
                        const updatedPaid = parseFloat(sale.amountPaid || 0) + amount;
                        const updatedDue = parseFloat(sale.amountDue || 0) - amount;
                        await supabase.from('Sales').update({ 
                            amountPaid: updatedPaid, 
                            amountDue: updatedDue > 0 ? updatedDue : 0 
                        }).eq('id', referenceId);
                    }
                }

                return formatRes({ ...trans, newBalance });
            } catch (err) {
                console.error("POST /vouchers/receipt error:", err);
                return formatErr(err);
            }
        }
        if (url === '/vouchers/payment') {
            try {
                const { supplierId, amount: rawAmount, date, notes, method, referenceId } = payload;
                const amount = parseFloat(rawAmount) || 0;

                // 1. Create SupplierTransaction
                const { data: trans, error: tErr } = await supabase.from('SupplierTransactions').insert({
                    supplierId,
                    type: 'payment',
                    amount,
                    amountPaid: amount,
                    amountDue: 0,
                    status: 'completed',
                    date: date ? new Date(date).toISOString() : now,
                    method,
                    purchaseId: method === 'Agst Ref' ? referenceId : null,
                    notes,
                    createdAt: now
                }).select().single();
                if (tErr) throw tErr;

                // 2. Update Supplier Balance
                const { data: supplier } = await supabase.from('Suppliers').select('outstandingBalance').eq('id', supplierId).single();
                let newBalance = 0;
                if (supplier) {
                    newBalance = parseFloat(supplier.outstandingBalance || 0) - amount;
                    await supabase.from('Suppliers').update({ outstandingBalance: newBalance }).eq('id', supplierId);
                }

                // 3. If Against Reference, update the Purchase
                if (method === 'Agst Ref' && referenceId) {
                    const { data: pur } = await supabase.from('Purchases').select('amountPaid, amountDue').eq('id', referenceId).single();
                    if (pur) {
                        const updatedPaid = parseFloat(pur.amountPaid || 0) + amount;
                        const updatedDue = parseFloat(pur.amountDue || 0) - amount;
                        await supabase.from('Purchases').update({ 
                            amountPaid: updatedPaid, 
                            amountDue: updatedDue > 0 ? updatedDue : 0 
                        }).eq('id', referenceId);
                    }
                }

                return formatRes({ ...trans, newBalance });
            } catch (err) {
                console.error("POST /vouchers/payment error:", err);
                return formatErr(err);
            }
        }
        if (url === '/settings') {
            try {
                const { key, value } = payload;
                const { data, error } = await supabase.from('Settings').upsert({ 
                    key, 
                    value, 
                    updatedAt: now 
                }, { onConflict: 'key' }).select().single();
                if (error) return formatErr(error);
                return formatRes(data);
            } catch (err) {
                return formatErr(err);
            }
        }
        console.warn(`Unimplemented POST route: ${url}`);
        return formatRes({});
    }

    async put(url, payload) {
        const parts = url.split('/');
        const id = parts[parts.length - 1];
        const resource = '/' + parts[1];
        const now = new Date().toISOString();

        if (resource === '/sales') {
            try {
                const { 
                    items, 
                    Customer, 
                    SaleItems, 
                    advanceAdjustments, 
                    customer, 
                    afterGST, 
                    salesChannel, 
                    date,
                    ...saleData 
                } = payload;

                // 1. Get old data for balance adjustment
                const { data: oldSale } = await supabase.from('Sales').select('total, amountDue, customerId').eq('id', id).single();
                
                const newTotal = parseFloat(payload.total) || 0;
                const newAmountPaid = parseFloat(payload.amountPaid) || 0;
                const newAmountDue = newTotal - newAmountPaid;

                // 2. Update Sale record
                const { error: saleErr } = await supabase.from('Sales').update({ 
                    ...saleData, 
                    amountPaid: newAmountPaid, 
                    amountDue: newAmountDue, 
                    total: newTotal,
                    updatedAt: now 
                }).eq('id', id);
                if (saleErr) throw saleErr;

                // 3. Handle Customer Balance sync
                if (oldSale && oldSale.customerId) {
                    const balanceDelta = newAmountDue - (parseFloat(oldSale.amountDue) || 0);
                    if (balanceDelta !== 0) {
                        const { data: cust } = await supabase.from('Customers').select('outstandingBalance').eq('id', oldSale.customerId).single();
                        if (cust) {
                            await supabase.from('Customers').update({ 
                                outstandingBalance: parseFloat(cust.outstandingBalance || 0) + balanceDelta 
                            }).eq('id', oldSale.customerId);
                        }
                    }
                }

                // 4. Update/Upsert CreditTransaction
                if (oldSale?.customerId) {
                    const { data: existingTrans } = await supabase.from('CreditTransactions').select('id').eq('saleId', id).eq('type', 'sale').single();
                    if (existingTrans) {
                        await supabase.from('CreditTransactions').update({
                            amount: newTotal,
                            updatedAt: now
                        }).eq('id', existingTrans.id);
                    } else if (newAmountDue > 0) {
                        await supabase.from('CreditTransactions').insert({
                            customerId: oldSale.customerId,
                            type: 'sale',
                            saleId: id,
                            amount: newTotal,
                            notes: `Sale (Updated) - ID: ${id}`,
                            createdAt: now
                        });
                    }
                }

                const { data: currentItems } = await supabase.from('SaleItems').select('*').eq('saleId', id);
                const payloadIds = items.map(i => i.id).filter(Boolean);

                // Deletions
                for (const oldItem of (currentItems || [])) {
                    if (!payloadIds.includes(oldItem.id)) {
                        const { data: p } = await supabase.from('Products').select('stock').eq('id', oldItem.productId).single();
                        if (p) await supabase.from('Products').update({ stock: p.stock + oldItem.quantity }).eq('id', oldItem.productId);
                        await supabase.from('SaleItems').delete().eq('id', oldItem.id);
                    }
                }

                // Updates/Additions
                for (const item of items) {
                    const row = { ...item, saleId: id, updatedAt: now };
                    delete row.name; delete row.size;
                    if (item.id) {
                        const old = currentItems.find(ci => ci.id === item.id);
                        if (old) {
                            if (old.productId !== item.productId) {
                                const { data: p1 } = await supabase.from('Products').select('stock').eq('id', old.productId).single();
                                if (p1) await supabase.from('Products').update({ stock: p1.stock + old.quantity }).eq('id', old.productId);
                                const { data: p2 } = await supabase.from('Products').select('stock').eq('id', item.productId).single();
                                if (p2) await supabase.from('Products').update({ stock: p2.stock - item.quantity }).eq('id', item.productId);
                            } else {
                                const delta = (parseFloat(item.quantity) || 0) - (parseFloat(old.quantity) || 0);
                                if (delta !== 0) {
                                    const { data: p } = await supabase.from('Products').select('stock').eq('id', item.productId).single();
                                    if (p) await supabase.from('Products').update({ stock: p.stock - delta }).eq('id', item.productId);
                                }
                            }
                        }
                        await supabase.from('SaleItems').update(row).eq('id', item.id);
                    } else {
                        const { data: p } = await supabase.from('Products').select('stock').eq('id', item.productId).single();
                        if (p) await supabase.from('Products').update({ stock: p.stock - (parseFloat(item.quantity) || 0) }).eq('id', item.productId);
                        await supabase.from('SaleItems').insert({ ...row, createdAt: now });
                    }
                }
                return formatRes({ message: 'Updated' });
            } catch (err) {
                console.error("PUT /sales error:", err);
                return formatErr(err);
            }
        }
        if (resource === '/purchases') {
            try {
                const { 
                    items, 
                    Product, 
                    Supplier, 
                    afterGST, 
                    salesChannel, 
                    date,
                    ...purData 
                } = payload;
                const inv = id.startsWith('P-') ? id.substring(2) : id;

                // 1. Get old data for balance adjustment
                // We'll use the existing SupplierTransaction as the source of truth for the old total
                const { data: oldTx } = await supabase.from('SupplierTransactions')
                    .select('id, amount, supplierId')
                    .eq('invoiceNumber', inv)
                    .eq('type', 'bill')
                    .single();
                
                const newTotal = parseFloat(payload.total) || 0;

                // 2. Handle Supplier Balance sync
                if (oldTx) {
                    const balanceDelta = newTotal - (parseFloat(oldTx.amount) || 0);
                    if (balanceDelta !== 0 && oldTx.supplierId) {
                        const { data: sup } = await supabase.from('Suppliers').select('outstandingBalance').eq('id', oldTx.supplierId).single();
                        if (sup) {
                            await supabase.from('Suppliers').update({
                                outstandingBalance: parseFloat(sup.outstandingBalance || 0) + balanceDelta
                            }).eq('id', oldTx.supplierId);
                        }
                        // Update Transaction record
                        await supabase.from('SupplierTransactions').update({
                            amount: newTotal,
                            amountDue: newTotal, // Simple re-sync, assumes unpaid if editing. Complex payment syncing not handled here yet.
                            updatedAt: now
                        }).eq('id', oldTx.id);
                    }
                }

                // 3. Surgical items update
                const { data: current } = await supabase.from('Purchases').select('*').eq('invoiceNumber', inv);
                const payloadIds = items.map(i => i.id).filter(Boolean);

                for (const old of (current || [])) {
                    if (!payloadIds.includes(old.id)) {
                        const { data: p } = await supabase.from('Products').select('stock').eq('id', old.productId).single();
                        if (p) await supabase.from('Products').update({ stock: p.stock - old.quantityReceived }).eq('id', old.productId);
                        await supabase.from('Purchases').delete().eq('id', old.id);
                    }
                }

                for (const item of items) {
                    const row = { ...item, invoiceNumber: inv, updatedAt: now };
                    delete row.Product;
                    if (item.id) {
                        const old = current.find(c => c.id === item.id);
                        if (old) {
                            if (old.productId !== item.productId) {
                                const { data: p1 } = await supabase.from('Products').select('stock').eq('id', old.productId).single();
                                if (p1) await supabase.from('Products').update({ stock: p1.stock - old.quantityReceived }).eq('id', old.productId);
                                const { data: p2 } = await supabase.from('Products').select('stock').eq('id', item.productId).single();
                                if (p2) await supabase.from('Products').update({ stock: p2.stock + (parseFloat(item.quantity) || 0) }).eq('id', item.productId);
                            } else {
                                const delta = (parseFloat(item.quantity) || 0) - (parseFloat(old.quantityReceived) || 0);
                                if (delta !== 0) {
                                    const { data: p } = await supabase.from('Products').select('stock').eq('id', item.productId).single();
                                    if (p) await supabase.from('Products').update({ stock: p.stock + delta }).eq('id', item.productId);
                                }
                            }
                        }
                        await supabase.from('Purchases').update(row).eq('id', item.id);
                    } else {
                        const { data: p } = await supabase.from('Products').select('stock').eq('id', item.productId).single();
                        if (p) await supabase.from('Products').update({ stock: p.stock + (parseFloat(item.quantity) || 0) }).eq('id', item.productId);
                        await supabase.from('Purchases').insert({ ...row, createdAt: now });
                    }
                }
                return formatRes({ message: 'Updated' });
            } catch (err) {
                console.error("PUT /purchases error:", err);
                return formatErr(err);
            }
        }

        const tableMap = { '/products': 'Products', '/customers': 'Customers', '/suppliers': 'Suppliers' };
        if (tableMap[resource]) {
            const { data, error } = await supabase.from(tableMap[resource]).update({ ...payload, updatedAt: now }).eq('id', id).select().single();
            if (error) return formatErr(error);
            return formatRes(data);
        }
        return formatRes({});
    }

    async delete(url) {
        const parts = url.split('/');
        const id = parts[parts.length - 1];
        const resource = '/' + parts[1];

        if (resource === '/sales') {
            try {
                // 1. Get Sale info to revert balances
                const { data: sale } = await supabase.from('Sales').select('id, customerId, amountDue').eq('id', id).single();
                
                // 2. Revert Customer Balance
                if (sale && sale.customerId && sale.amountDue > 0) {
                    const { data: cust } = await supabase.from('Customers').select('outstandingBalance').eq('id', sale.customerId).single();
                    if (cust) {
                        await supabase.from('Customers').update({ 
                            outstandingBalance: parseFloat(cust.outstandingBalance || 0) - parseFloat(sale.amountDue) 
                        }).eq('id', sale.customerId);
                    }
                }

                // 3. Revert Stock
                const { data: items } = await supabase.from('SaleItems').select('*').eq('saleId', id);
                for (const item of (items || [])) {
                    const { data: p } = await supabase.from('Products').select('stock').eq('id', item.productId).single();
                    if (p) await supabase.from('Products').update({ stock: p.stock + item.quantity }).eq('id', item.productId);
                }

                // 4. Delete related records
                await supabase.from('SaleItems').delete().eq('saleId', id);
                await supabase.from('CreditTransactions').delete().eq('saleId', id);
                const { error } = await supabase.from('Sales').delete().eq('id', id);
                if (error) return formatErr(error);

                return formatRes({ message: 'Deleted' });
            } catch (err) {
                console.error("DELETE /sales error:", err);
                return formatErr(err);
            }
        }
        if (resource === '/purchases') {
            try {
                const inv = id.startsWith('P-') ? id.substring(2) : id;
                
                // 1. Get Transaction info to revert balances
                const { data: tx } = await supabase.from('SupplierTransactions').select('*').eq('invoiceNumber', inv).eq('type', 'bill').single();
                
                // 2. Revert Supplier Balance
                if (tx && tx.supplierId && tx.amountDue > 0) {
                    const { data: sup } = await supabase.from('Suppliers').select('outstandingBalance').eq('id', tx.supplierId).single();
                    if (sup) {
                        await supabase.from('Suppliers').update({ 
                            outstandingBalance: parseFloat(sup.outstandingBalance || 0) - parseFloat(tx.amountDue) 
                        }).eq('id', tx.supplierId);
                    }
                }

                // 3. Revert Stock & Delete items
                const { data: rows } = await supabase.from('Purchases').select('*').eq('invoiceNumber', inv);
                for (const row of (rows || [])) {
                    const { data: p } = await supabase.from('Products').select('stock').eq('id', row.productId).single();
                    if (p) await supabase.from('Products').update({ stock: p.stock - row.quantityReceived }).eq('id', row.productId);
                }

                // 4. Delete records
                await supabase.from('Purchases').delete().eq('invoiceNumber', inv);
                await supabase.from('SupplierTransactions').delete().eq('invoiceNumber', inv).eq('type', 'bill');

                return formatRes({ message: 'Deleted' });
            } catch (err) {
                console.error("DELETE /purchases error:", err);
                return formatErr(err);
            }
        }
        const tableMap = { '/products': 'Products', '/customers': 'Customers', '/suppliers': 'Suppliers' };
        if (tableMap[resource]) {
             const { error } = await supabase.from(tableMap[resource]).delete().eq('id', id);
             if (error) return formatErr(error);
             return formatRes({ message: 'Deleted' });
        }
        return formatRes({});
    }
}

export default new SupabaseApiAdapter();
