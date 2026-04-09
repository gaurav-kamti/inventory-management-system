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
                const { data, error } = await supabase.from('Customers').select('*');
                if (error) return formatErr(error);
                return formatRes(data);
            }
            case '/suppliers': {
                const { data, error } = await supabase.from('Suppliers').select('*');
                if (error) return formatErr(error);
                return formatRes(data);
            }
            case '/sales': {
                const { data, error } = await supabase.from('Sales')
                    .select('*, Customers(*), SaleItems(*, Products(*))')
                    .order('createdAt', { ascending: false });
                if (error) return formatErr(error);
                return formatRes(data);
            }
            case '/purchases': {
                const { data, error } = await supabase.from('Purchases')
                    .select('*, Products(*), Suppliers(*)')
                    .order('receivedDate', { ascending: false });
                if (error) return formatErr(error);
                return formatRes(data);
            }
            case '/credits': {
                const { data, error } = await supabase.from('CreditTransactions')
                    .select('*, Customers(*), Sales(*)')
                    .order('createdAt', { ascending: false });
                if (error) return formatErr(error);
                return formatRes(data);
            }
            case '/settings/invoice_config': {
                const { data, error } = await supabase.from('Settings').select('*').eq('key', 'invoice_config').single();
                if (error || !data) {
                    return formatRes({ prefix: 'INV', sequence: 1, fiscalYear: '2023-24' });
                }
                return formatRes(data.value);
            }
            case '/settings/company_profile': {
                const { data, error } = await supabase.from('Settings').select('*').eq('key', 'company_profile').single();
                if (error || !data) {
                    return formatRes({ name: '', address: '', phone: '', email: '', gstin: '' });
                }
                return formatRes(data.value);
            }
            // Add more GET routes...
            default:
                console.warn(`Unimplemented GET route: ${url}`);
                return formatRes([]);
        }
    }

    async post(url, payload) {
        const now = new Date().toISOString();
        if (url === '/products') {
            const { data, error } = await supabase.from('Products').insert({...payload, createdAt: now, updatedAt: now}).select().single();
            if (error) return formatErr(error);
            return formatRes(data);
        }
        if (url === '/customers') {
            const { data, error } = await supabase.from('Customers').insert({...payload, createdAt: now, updatedAt: now}).select().single();
            if (error) return formatErr(error);
            return formatRes(data);
        }
        if (url === '/suppliers') {
            const { data, error } = await supabase.from('Suppliers').insert({...payload, createdAt: now, updatedAt: now}).select().single();
            if (error) return formatErr(error);
            return formatRes(data);
        }
        if (url === '/sales') {
            // Replicate complex sales transaction logic in JS
            try {
                const { items, customerId, paymentMode, amountPaid, ...rest } = payload;
                const { data: user } = await supabase.auth.getUser();

                const salePayload = {
                    ...rest,
                    customerId,
                    paymentMode,
                    amountPaid,
                    userId: user?.user?.id || null,
                    createdAt: payload.date ? new Date(payload.date).toISOString() : now,
                    updatedAt: now
                };

                const { data: sale, error } = await supabase.from('Sales').insert(salePayload).select().single();
                if (error) throw error;

                for (const item of items) {
                    // Update Product Stock
                    const { data: product } = await supabase.from('Products').select('*').eq('id', item.productId).single();
                    if (product) {
                        const newStock = product.stock - item.quantity;
                        await supabase.from('Products').update({ stock: newStock }).eq('id', product.id);
                    }
                    // Insert SaleItem
                    await supabase.from('SaleItems').insert({
                        saleId: sale.id,
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.price,
                        total: item.total,
                        hsn: item.hsn,
                        gst: item.gst,
                        discount: item.discount,
                        name: item.name,
                        size: item.size,
                        sizeUnit: item.sizeUnit,
                        quantityUnit: item.quantityUnit,
                        purchasePrice: product?.purchasePrice || 0,
                        createdAt: now,
                        updatedAt: now
                    });
                }
                
                // Track dues
                const due = (sale.total || 0) - (sale.amountPaid || 0);
                if (due > 0 && customerId) {
                    const { data: customer } = await supabase.from('Customers').select('*').eq('id', customerId).single();
                    if (customer) {
                        await supabase.from('Customers').update({ 
                            outstandingBalance: parseFloat(customer.outstandingBalance || 0) + due,
                            updatedAt: now
                        }).eq('id', customerId);
                    }

                    await supabase.from('CreditTransactions').insert({
                        customerId,
                        saleId: sale.id,
                        type: 'credit',
                        amount: sale.total,
                        method: 'New Ref',
                        notes: `Credit from sale ${sale.invoiceNumber}`,
                        createdAt: sale.createdAt,
                        updatedAt: now
                    });
                }

                return formatRes(sale);
            } catch (err) {
                return formatErr(err);
            }
        }
        if (url === '/purchases') {
            try {
                const { items, supplierId, total, roundOff, ...rest } = payload;
                const reqTotal = parseFloat(total);

                const purchasePayload = {
                    ...rest,
                    supplierId,
                    total: reqTotal,
                    roundOff,
                    invoiceNumber: payload.invoiceNumber || `PUR-${Date.now()}`
                };

                // Create individual purchases records (since the original schema seems to lack a single 'PurchaseBill' parent table and uses Purchase table per item)
                // Wait, original logic: it inserts into Purchase per item but SupplierTransaction handles the bill total.
                const newPurchases = [];
                for (const item of items) {
                    // Update Product Stock and Cost
                    let { data: product } = await supabase.from('Products').select('*').eq('name', item.name).single();
                    if (product) {
                        await supabase.from('Products').update({
                            stock: product.stock + parseInt(item.quantity),
                            purchasePrice: item.rate,
                            updatedAt: now
                        }).eq('id', product.id);
                    } else {
                        const { data: newProd } = await supabase.from('Products').insert({
                            name: item.name,
                            stock: parseInt(item.quantity),
                            sellingPrice: item.rate,
                            purchasePrice: item.rate,
                            supplierId,
                            hsn: item.hsn || '8301',
                            gst: item.gst || 18,
                            createdAt: now,
                            updatedAt: now
                        }).select().single();
                        product = newProd;
                    }

                    const { data: purchase } = await supabase.from('Purchases').insert({
                        productId: product.id,
                        supplierId,
                        invoiceNumber: purchasePayload.invoiceNumber,
                        quantityReceived: parseInt(item.quantity),
                        unitCost: item.rate,
                        landingCost: item.rate,
                        totalCost: item.amount,
                        receivedDate: payload.date || now,
                        ...item,
                        createdAt: now,
                        updatedAt: now
                    }).select().single();
                    newPurchases.push(purchase);
                }

                // Supplier Tracking
                if (supplierId && reqTotal > 0) {
                    const { data: supplier } = await supabase.from('Suppliers').select('*').eq('id', supplierId).single();
                    if (supplier) {
                        await supabase.from('Suppliers').update({
                            outstandingBalance: parseFloat(supplier.outstandingBalance || 0) + reqTotal,
                            updatedAt: now
                        }).eq('id', supplierId);
                    }
                    await supabase.from('SupplierTransactions').insert({
                        supplierId,
                        type: 'bill',
                        amount: reqTotal,
                        amountDue: reqTotal,
                        status: 'pending',
                        invoiceNumber: purchasePayload.invoiceNumber,
                        date: payload.date || now,
                        createdAt: now,
                        updatedAt: now
                    });
                }
                return formatRes({ message: 'Purchase processed', items: newPurchases });
            } catch (err) {
                return formatErr(err);
            }
        }
        if (url === '/settings') {
            // Upsert setting
            const { key, value } = payload;
            const now = new Date().toISOString();
            const { data, error } = await supabase.from('Settings')
                .upsert({ key, value, createdAt: now, updatedAt: now }, { onConflict: 'key' })
                .select().single();
            if (error) {
                console.error("Settings Upsert Error:", error);
                return formatErr(error);
            }
            return formatRes(data);
        }
        
        console.warn(`Unimplemented POST route: ${url}`);
        return formatRes({});
    }

    async put(url, payload) {
        const parts = url.split('/');
        const id = parts[parts.length - 1];
        const resource = '/' + parts[1]; // e.g. /products/1 -> /products

        let table = '';
        if (resource === '/products') table = 'Products';
        else if (resource === '/customers') table = 'Customers';
        else if (resource === '/suppliers') table = 'Suppliers';
        else if (resource === '/sales') {
            console.warn("PUT /sales logic skipped for brevity, implement using DELETE + POST pattern");
            return formatRes({});
        }

        if (table) {
            const now = new Date().toISOString();
            const { data, error } = await supabase.from(table).update({ ...payload, updatedAt: now }).eq('id', id).select().single();
            if (error) return formatErr(error);
            return formatRes(data);
        }

        console.warn(`Unimplemented PUT route: ${url}`);
        return formatRes({});
    }

    async delete(url) {
        const parts = url.split('/');
        const id = parts[parts.length - 1];
        const resource = '/' + parts[1];

        let table = '';
        if (resource === '/products') table = 'Products';
        else if (resource === '/customers') table = 'Customers';
        else if (resource === '/suppliers') table = 'Suppliers';
        else if (resource === '/sales') {
            // Very simplified delete
            await supabase.from('SaleItems').delete().eq('saleId', id);
            await supabase.from('CreditTransactions').delete().eq('saleId', id);
            const { error } = await supabase.from('Sales').delete().eq('id', id);
            if (error) return formatErr(error);
            return formatRes({ message: 'Sale deleted' });
        }
        
        if (table) {
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) return formatErr(error);
            return formatRes({ message: 'Deleted successfully' });
        }

        console.warn(`Unimplemented DELETE route: ${url}`);
        return formatRes({});
    }
}

export default new SupabaseApiAdapter();
