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
                const { data, error } = await supabase.from('Settings').select('*').eq('key', 'invoice_config').maybeSingle();
                if (error || !data) {
                    return formatRes({ prefix: 'INV', sequence: 1, fiscalYear: '2023-24' });
                }
                return formatRes(data.value);
            }
            case '/settings/company_profile': {
                const { data, error } = await supabase.from('Settings').select('*').eq('key', 'company_profile').maybeSingle();
                if (error || !data) {
                    return formatRes({ name: '', address: '', phone: '', email: '', gstin: '' });
                }
                return formatRes(data.value);
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
            default: {
                if (path.includes('/vouchers/unused-advances/')) {
                    const parts = path.split('/');
                    const entity = parts[parts.length - 2];
                    const entityId = parts[parts.length - 1];
                    const table = entity === 'customer' ? 'CreditTransactions' : 'SupplierTransactions';
                    const idField = entity === 'customer' ? 'customerId' : 'supplierId';
                    const dateField = entity === 'customer' ? 'createdAt' : 'date';
                    const { data, error } = await supabase.from(table).select('*').eq(idField, entityId).eq('isAdvance', true).gt('remainingAdvance', 0).order(dateField, { ascending: true });
                    if (error) return formatErr(error);
                    return formatRes(data);
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
                const { items, customerId, paymentMode, amountPaid, advanceAdjustments, ...rest } = payload;
                const { data: sale, error: saleErr } = await supabase.from('Sales').insert({ ...rest, customerId, paymentMode, amountPaid, createdAt: now, updatedAt: now }).select().single();
                if (saleErr) throw saleErr;
                for (const item of items) {
                    const { error: itemErr } = await supabase.from('SaleItems').insert({ ...item, saleId: sale.id, createdAt: now, updatedAt: now });
                    if (itemErr) throw itemErr;
                    const { data: prod } = await supabase.from('Products').select('stock').eq('id', item.productId).single();
                    if (prod) {
                        await supabase.from('Products').update({ stock: prod.stock - item.quantity }).eq('id', item.productId);
                    }
                }
                return formatRes(sale);
            } catch (err) {
                return formatErr(err);
            }
        }
        if (url === '/settings') {
            const { key, value } = payload;
            const { data, error } = await supabase.from('Settings').upsert({ key, value, updatedAt: now }, { onConflict: 'key' }).select().single();
            if (error) return formatErr(error);
            return formatRes(data);
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
                const { items, Customer, SaleItems, advanceAdjustments, customer, ...saleData } = payload;
                const { error: saleErr } = await supabase.from('Sales').update({ ...saleData, updatedAt: now }).eq('id', id);
                if (saleErr) throw saleErr;

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
                    delete row.Product;
                    if (item.id) {
                        const old = currentItems.find(ci => ci.id === item.id);
                        if (old) {
                            if (old.productId !== item.productId) {
                                const { data: p1 } = await supabase.from('Products').select('stock').eq('id', old.productId).single();
                                if (p1) await supabase.from('Products').update({ stock: p1.stock + old.quantity }).eq('id', old.productId);
                                const { data: p2 } = await supabase.from('Products').select('stock').eq('id', item.productId).single();
                                if (p2) await supabase.from('Products').update({ stock: p2.stock - item.quantity }).eq('id', item.productId);
                            } else {
                                const delta = item.quantity - old.quantity;
                                const { data: p } = await supabase.from('Products').select('stock').eq('id', item.productId).single();
                                if (p) await supabase.from('Products').update({ stock: p.stock - delta }).eq('id', item.productId);
                            }
                        }
                        await supabase.from('SaleItems').update(row).eq('id', item.id);
                    } else {
                        const { data: p } = await supabase.from('Products').select('stock').eq('id', item.productId).single();
                        if (p) await supabase.from('Products').update({ stock: p.stock - item.quantity }).eq('id', item.productId);
                        await supabase.from('SaleItems').insert({ ...row, createdAt: now });
                    }
                }
                return formatRes({ message: 'Updated' });
            } catch (err) {
                return formatErr(err);
            }
        }
        if (resource === '/purchases') {
            try {
                const { items, ...purData } = payload;
                const inv = id.startsWith('P-') ? id.substring(2) : id;
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
                                if (p2) await supabase.from('Products').update({ stock: p2.stock + item.quantity }).eq('id', item.productId);
                            } else {
                                const delta = item.quantity - old.quantityReceived;
                                const { data: p } = await supabase.from('Products').select('stock').eq('id', item.productId).single();
                                if (p) await supabase.from('Products').update({ stock: p.stock + delta }).eq('id', item.productId);
                            }
                        }
                        await supabase.from('Purchases').update(row).eq('id', item.id);
                    } else {
                        const { data: p } = await supabase.from('Products').select('stock').eq('id', item.productId).single();
                        if (p) await supabase.from('Products').update({ stock: p.stock + item.quantity }).eq('id', item.productId);
                        await supabase.from('Purchases').insert({ ...row, createdAt: now });
                    }
                }
                return formatRes({ message: 'Updated' });
            } catch (err) {
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
            await supabase.from('SaleItems').delete().eq('saleId', id);
            await supabase.from('CreditTransactions').delete().eq('saleId', id);
            const { error } = await supabase.from('Sales').delete().eq('id', id);
            if (error) return formatErr(error);
            return formatRes({ message: 'Deleted' });
        }
        if (resource === '/purchases') {
            const inv = id.startsWith('P-') ? id.substring(2) : id;
            const { data: rows } = await supabase.from('Purchases').select('*').eq('invoiceNumber', inv);
            for (const row of (rows || [])) {
                const { data: p } = await supabase.from('Products').select('stock').eq('id', row.productId).single();
                if (p) await supabase.from('Products').update({ stock: p.stock - row.quantityReceived }).eq('id', row.productId);
            }
            await supabase.from('Purchases').delete().eq('invoiceNumber', inv);
            return formatRes({ message: 'Deleted' });
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
