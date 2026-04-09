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
                    .select('*, Customer:Customers(*), SaleItems(*, Product:Products(*))')
                    .order('createdAt', { ascending: false });
                if (error) return formatErr(error);
                return formatRes(data);
            }
            case '/purchases': {
                const { data, error } = await supabase.from('Purchases')
                    .select('*, Product:Products(*), Supplier:Suppliers(*)')
                    .order('receivedDate', { ascending: false });
                if (error) return formatErr(error);
                return formatRes(data);
            }
            case '/credits': {
                const { data, error } = await supabase.from('CreditTransactions')
                    .select('*, Customer:Customers(*), Sales(*)')
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
            // Replicate complex sales transaction logic in JS
            try {
                const { 
                    items, customerId, paymentMode, amountPaid, 
                    advanceAdjustments, afterGST, salesChannel, date, ...rest 
                } = payload;
                const { data: user } = await supabase.auth.getUser();

                const salePayload = {
                    ...rest,
                    buyerOrderDate: rest.buyerOrderDate || null,
                    customerId,
                    paymentMode,
                    amountPaid,
                    userId: null,
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
                        await supabase.from('Products').update({ stock: newStock, updatedAt: now }).eq('id', product.id);
                    }
                    // Insert SaleItem
                    const sQuantity = parseFloat(item.quantity) || 0;
                    const sPrice = parseFloat(item.price || item.rate) || 0;
                    const { error: itemErr } = await supabase.from('SaleItems').insert({
                        saleId: sale.id,
                        productId: item.productId || null,
                        quantity: sQuantity,
                        price: sPrice,
                        total: sQuantity * sPrice,
                        hsn: item.hsn || '',
                        gst: parseFloat(item.gst) || 18,
                        discount: parseFloat(item.discount) || 0,
                        name: item.name || '',
                        size: item.size || '',
                        sizeUnit: item.sizeUnit || '',
                        quantityUnit: item.quantityUnit || 'Pcs',
                        purchasePrice: product?.purchasePrice || 0,
                        createdAt: now,
                        updatedAt: now
                    });
                    
                    if (itemErr) {
                        console.error("Critical error saving item:", itemErr);
                        throw itemErr; 
                    }
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
                        createdAt: sale.createdAt || now,
                        updatedAt: now
                    });
                }

                // Auto-increment the invoice configuration sequence
                try {
                    let { data: configRecord } = await supabase.from('Settings')
                        .select('value')
                        .eq('key', 'invoice_config')
                        .single();
                        
                    let currentConfig = configRecord?.value;
                    if (!currentConfig || !currentConfig.sequence) {
                        currentConfig = { prefix: 'INV', sequence: 1, fiscalYear: '2023-24' };
                    }
                    
                    currentConfig.sequence = parseInt(currentConfig.sequence, 10) + 1;
                    
                    await supabase.from('Settings')
                        .upsert({ key: 'invoice_config', value: currentConfig, createdAt: now, updatedAt: now }, { onConflict: 'key' });
                } catch (seqErr) {
                    console.error("Failed to automatically increment invoice sequence:", seqErr);
                }

                return formatRes(sale);
            } catch (err) {
                return formatErr(err);
            }
        }
        if (url === '/purchases') {
            try {
                const { 
                    items, supplierId, total, roundOff, 
                    advanceAdjustments, afterGST, salesChannel, ...rest 
                } = payload;
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
                        productId: item.productId,
                        quantityReceived: parseFloat(item.quantity) || 0,
                        unitCost: parseFloat(item.price || item.rate) || 0,
                        landingCost: parseFloat(item.price || item.rate) || 0,
                        totalCost: parseFloat(item.amount) || ((parseFloat(item.quantity) || 0) * (parseFloat(item.price || item.rate) || 0)),
                        receivedDate: payload.date || new Date().toISOString(),
                        name: item.name,
                        size: item.size,
                        sizeUnit: item.sizeUnit,
                        quantityUnit: item.quantityUnit,
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
                        date: payload.date || new Date().toISOString(),
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
        const now = new Date().toISOString();

        let table = '';
        if (resource === '/products') table = 'Products';
        else if (resource === '/customers') table = 'Customers';
        else if (resource === '/suppliers') table = 'Suppliers';
        else if (resource === '/sales') {
            try {
                const { items, ...saleData } = payload;
                const saleId = id;

                // 1. Update the parent Sales record
                const { error: saleErr } = await supabase.from('Sales')
                    .update({
                        ...saleData,
                        updatedAt: now
                        // Removed createdAt to prevent overwriting original timestamp
                    })
                    .eq('id', saleId);
                if (saleErr) throw saleErr;

                // 2. Fetch current SaleItems to handle surgical updates/deletes
                const { data: currentItems, error: fetchErr } = await supabase.from('SaleItems')
                    .select('*')
                    .eq('saleId', saleId);
                if (fetchErr) throw fetchErr;

                const payloadItemIds = items.filter(i => i.id).map(i => i.id);
                const itemsToDelete = currentItems.filter(ci => !payloadItemIds.includes(ci.id));

                // 3. Handle Deletions
                for (const delItem of currentItems) {
                    if (!payloadItemIds.includes(delItem.id)) {
                        // Revert stock
                        if (delItem.productId) {
                            const { data: prod, error: pErr } = await supabase.from('Products').select('stock').eq('id', delItem.productId).single();
                            if (pErr) throw pErr;
                            if (prod) {
                                const { error: upErr } = await supabase.from('Products').update({ stock: prod.stock + delItem.quantity, updatedAt: now }).eq('id', delItem.productId);
                                if (upErr) throw upErr;
                            }
                        }
                        const { error: dErr } = await supabase.from('SaleItems').delete().eq('id', delItem.id);
                        if (dErr) throw dErr;
                    }
                }

                // 4. Handle Updates and Additions
                for (const item of items) {
                    const sQuantity = parseFloat(item.quantity) || 0;
                    const sPrice = parseFloat(item.price || item.rate) || 0;
                    const itemPayload = {
                        saleId,
                        productId: item.productId || null,
                        quantity: sQuantity,
                        price: sPrice,
                        total: sQuantity * sPrice,
                        hsn: item.hsn || '',
                        gst: parseFloat(item.gst) || 18,
                        discount: parseFloat(item.discount) || 0,
                        name: item.name || '',
                        size: item.size || '',
                        sizeUnit: item.sizeUnit || '',
                        quantityUnit: item.quantityUnit || 'Pcs',
                        updatedAt: now
                    };

                    if (item.id) {
                        // Update existing item
                        const oldItem = currentItems.find(ci => ci.id === item.id);
                        if (oldItem) {
                            // CASE: Product changed during edit
                            if (oldItem.productId !== item.productId) {
                                // Revert old product stock
                                if (oldItem.productId) {
                                    const { data: oldProd, error: opErr } = await supabase.from('Products').select('stock').eq('id', oldItem.productId).single();
                                    if (opErr) throw opErr;
                                    await supabase.from('Products').update({ stock: oldProd.stock + oldItem.quantity, updatedAt: now }).eq('id', oldItem.productId);
                                }
                                // Subtract new product stock
                                if (item.productId) {
                                    const { data: newProd, error: npErr } = await supabase.from('Products').select('stock').eq('id', item.productId).single();
                                    if (npErr) throw npErr;
                                    await supabase.from('Products').update({ stock: newProd.stock - sQuantity, updatedAt: now }).eq('id', item.productId);
                                }
                            } else if (oldItem.productId) {
                                // Adjust stock by delta for SAME product
                                const delta = sQuantity - oldItem.quantity;
                                const { data: prod, error: prodErr } = await supabase.from('Products').select('stock').eq('id', oldItem.productId).single();
                                if (prodErr) throw prodErr;
                                if (prod) {
                                    const { error: upErr } = await supabase.from('Products').update({ stock: prod.stock - delta, updatedAt: now }).eq('id', oldItem.productId);
                                    if (upErr) throw upErr;
                                }
                            }
                        }
                        const { error: upItemErr } = await supabase.from('SaleItems').update(itemPayload).eq('id', item.id);
                        if (upItemErr) throw upItemErr;
                    } else {
                        // Insert new item
                        if (item.productId) {
                            const { data: prod, error: prodErr } = await supabase.from('Products').select('stock').eq('id', item.productId).single();
                            if (prodErr) throw prodErr;
                            if (prod) {
                                const { error: upErr } = await supabase.from('Products').update({ stock: prod.stock - sQuantity, updatedAt: now }).eq('id', item.productId);
                                if (upErr) throw upErr;
                            }
                        }
                        const { error: insErr } = await supabase.from('SaleItems').insert({ ...itemPayload, createdAt: now });
                        if (insErr) throw insErr;
                    }
                }

                return formatRes({ id: saleId, message: 'Sale updated surgically' });
            } catch (err) {
                console.error("PUT /sales error:", err);
                return formatErr(err);
            }
        }
        else if (resource === '/purchases') {
            try {
                const { items, supplierId, ...purchaseData } = payload;
                const invoiceNumber = id.startsWith('P-') ? id.substring(2) : id;

                const { data: currentRows, error: fetchErr } = await supabase.from('Purchases')
                    .select('*')
                    .eq('invoiceNumber', invoiceNumber);
                if (fetchErr) throw fetchErr;

                const payloadItemIds = items.filter(i => i.id).map(i => i.id);

                // 1. Handle Deletions
                for (const delItem of currentRows) {
                    if (!payloadItemIds.includes(delItem.id)) {
                        // Revert stock (Purchases ADDED stock, so deletion SUBTRACTS it)
                        const { data: prod, error: pErr } = await supabase.from('Products').select('stock').eq('id', delItem.productId).single();
                        if (pErr) throw pErr;
                        if (prod) {
                            const { error: upErr } = await supabase.from('Products').update({ stock: prod.stock - delItem.quantityReceived, updatedAt: now }).eq('id', delItem.productId);
                            if (upErr) throw upErr;
                        }
                        const { error: dErr } = await supabase.from('Purchases').delete().eq('id', delItem.id);
                        if (dErr) throw dErr;
                    }
                }

                // 2. Handle Updates and Additions
                for (const item of items) {
                    const quantity = parseFloat(item.quantity) || 0;
                    const price = parseFloat(item.price || item.rate) || 0;
                    
                    const rowPayload = {
                        supplierId,
                        productId: item.productId,
                        invoiceNumber,
                        quantityReceived: quantity,
                        unitCost: price,
                        landingCost: price,
                        totalCost: quantity * price,
                        receivedDate: payload.date || now,
                        name: item.name,
                        size: item.size,
                        sizeUnit: item.sizeUnit,
                        quantityUnit: item.quantityUnit,
                        updatedAt: now
                    };

                    if (item.id) {
                        const oldRow = currentRows.find(cr => cr.id === item.id);
                        if (oldRow) {
                            // CASE: Product changed during edit
                            if (oldRow.productId !== item.productId) {
                                // Revert old product stock (Subtract what was added before)
                                if (oldRow.productId) {
                                    const { data: oldProd, error: opErr } = await supabase.from('Products').select('stock').eq('id', oldRow.productId).single();
                                    if (opErr) throw opErr;
                                    await supabase.from('Products').update({ stock: oldProd.stock - oldRow.quantityReceived, updatedAt: now }).eq('id', oldRow.productId);
                                }
                                // Add new product stock
                                if (item.productId) {
                                    const { data: newProd, error: npErr } = await supabase.from('Products').select('stock').eq('id', item.productId).single();
                                    if (npErr) throw npErr;
                                    await supabase.from('Products').update({ stock: newProd.stock + quantity, updatedAt: now }).eq('id', item.productId);
                                }
                            } else if (oldRow.productId) {
                                // Adjust stock by delta for SAME product
                                const delta = quantity - oldRow.quantityReceived;
                                const { data: prod, error: prodErr } = await supabase.from('Products').select('stock').eq('id', oldRow.productId).single();
                                if (prodErr) throw prodErr;
                                if (prod) {
                                    const { error: upErr } = await supabase.from('Products').update({ stock: prod.stock + delta, updatedAt: now }).eq('id', oldRow.productId);
                                    if (upErr) throw upErr;
                                }
                            }
                        }
                        const { error: upRowErr } = await supabase.from('Purchases').update(rowPayload).eq('id', item.id);
                        if (upRowErr) throw upRowErr;
                    } else {
                        // Insert new row
                        if (item.productId) {
                            const { data: prod, error: prodErr } = await supabase.from('Products').select('stock').eq('id', item.productId).single();
                            if (prodErr) throw prodErr;
                            if (prod) {
                                const { error: upErr } = await supabase.from('Products').update({ stock: prod.stock + quantity, updatedAt: now }).eq('id', item.productId);
                                if (upErr) throw upErr;
                            }
                        }
                        const { error: insErr } = await supabase.from('Purchases').insert({ ...rowPayload, createdAt: now });
                        if (insErr) throw insErr;
                    }
                }

                return formatRes({ message: 'Purchase updated surgically' });
            } catch (err) {
                console.error("PUT /purchases error:", err);
                return formatErr(err);
            }
        }

        if (table) {
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
        
        else if (resource === '/purchases') {
            const invoiceNumber = id.startsWith('P-') ? id.substring(2) : id;
            const { data: rows } = await supabase.from('Purchases').select('*').eq('invoiceNumber', invoiceNumber);
            if (rows) {
                for (const row of rows) {
                    // Revert stock (Purchases ADDED stock, so deletion SUBTRACTS it)
                    const { data: prod } = await supabase.from('Products').select('stock').eq('id', row.productId).single();
                    if (prod) {
                        await supabase.from('Products').update({ stock: prod.stock - row.quantityReceived }).eq('id', row.productId);
                    }
                }
            }
            const { error } = await supabase.from('Purchases').delete().eq('invoiceNumber', invoiceNumber);
            if (error) return formatErr(error);
            return formatRes({ message: 'Purchase deleted' });
        }

        console.warn(`Unimplemented DELETE route: ${url}`);
        return formatRes({});
    }
}

export default new SupabaseApiAdapter();
