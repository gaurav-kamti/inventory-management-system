import { useState, useEffect } from 'react'
import api from '../utils/api'
import './Inventory.css' // We might need to create a separate CSS or share it

function SellPurchase() {
    const [products, setProducts] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [customers, setCustomers] = useState([])
    const [showPurchaseModal, setShowPurchaseModal] = useState(false) // Renamed from showAddModal
    const [showSellModal, setShowSellModal] = useState(false)

    // Helper for dd:mm:yyyy date format
    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        const date = new Date(dateStr)
        const d = String(date.getDate()).padStart(2, '0')
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const y = date.getFullYear()
        return `${d}-${m}-${y}`
    }

    // Purchase Item Form (formerly Add Item)
    const [addForm, setAddForm] = useState({
        invoice: `INV-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        supplierId: '',
        items: []
    })

    const [hsnCodes, setHsnCodes] = useState(['8301', '8302'])

    const [addItemRow, setAddItemRow] = useState({
        name: '',
        size: '',
        sizeUnit: 'mm',
        hsn: '8301',
        cgst: '9',
        sgst: '9',
        quantity: '',
        rate: '',
        discount: ''
    })

    // Sell Item Form
    const [sellForm, setSellForm] = useState({
        invoice: '',
        date: new Date().toISOString().split('T')[0],
        supplierId: '',
        roundOff: ''
    })

    const [cartItems, setCartItems] = useState([])
    const [addedItems, setAddedItems] = useState([])

    // Manual Entry State for Sell Modal
    const [sellItemInput, setSellItemInput] = useState({
        productId: '',
        name: '',
        size: '',
        sizeUnit: 'mm',
        hsn: '8301',
        cgst: '0',
        sgst: '0',
        quantity: '',
        rate: '',
        discount: ''
    })

    const addItemToList = () => {
        if (!addItemRow.name || !addItemRow.quantity || !addItemRow.rate) {
            return alert('Please fill required fields')
        }

        const amount = (parseFloat(addItemRow.quantity) || 0) * (parseFloat(addItemRow.rate) || 0)
        const discountAmt = amount * ((parseFloat(addItemRow.discount) || 0) / 100)
        const finalAmount = amount - discountAmt

        setAddedItems([...addedItems, { ...addItemRow, amount: finalAmount }])
        setAddItemRow({
            name: '',
            size: '',
            sizeUnit: 'mm',
            hsn: '8301',
            cgst: '9',
            sgst: '9',
            quantity: '',
            rate: '',
            discount: ''
        })
    }

    const removeAddedItem = (index) => {
        setAddedItems(addedItems.filter((_, i) => i !== index))
    }

    useEffect(() => {
        fetchProducts()
        fetchSuppliers()
        fetchCustomers()
    }, [])

    const fetchProducts = async () => {
        const response = await api.get('/products')
        setProducts(response.data)
    }

    const fetchSuppliers = async () => {
        const response = await api.get('/suppliers')
        setSuppliers(response.data)
    }

    const fetchCustomers = async () => {
        const response = await api.get('/customers')
        setCustomers(response.data)
    }

    const handlePurchaseItem = async (e) => {
        e.preventDefault()

        if (addedItems.length === 0) {
            return alert('Please add at least one item')
        }

        try {
            const purchaseData = {
                supplierId: addForm.supplierId,
                invoiceNumber: addForm.supplierInvoice || `INV-${Date.now()}`,
                date: addForm.date,
                items: addedItems.map(item => ({
                    name: `${item.name} ${item.size}${item.sizeUnit}`.trim(),
                    rate: item.rate,
                    quantity: item.quantity,
                    amount: item.amount,
                    hsn: item.hsn || '8301',
                    cgst: item.cgst,
                    sgst: item.sgst
                }))
            }

            await api.post('/purchases', purchaseData)

            alert('Purchase Invoice Recorded!')
            setAddForm({
                invoice: `INV-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                supplierId: '',
                items: []
            })
            setAddedItems([])
            setShowPurchaseModal(false)
            fetchProducts()
        } catch (error) {
            alert(error.response?.data?.error || 'Error recording purchase')
        }
    }

    const addToCart = (product) => {
        const existing = cartItems.find(item => item.productId === product.id)
        if (existing) {
            return alert('Item already in cart')
        } else {
            setCartItems([...cartItems, {
                productId: product.id,
                name: product.name,
                size: '',
                sizeUnit: 'mm',
                hsn: '8301',
                cgst: product.gst ? (parseFloat(product.gst) / 2).toString() : '9',
                sgst: product.gst ? (parseFloat(product.gst) / 2).toString() : '9',
                quantity: 1,
                rate: product.sellingPrice,
                discount: 0,
                stock: product.stock
            }])
        }
    }

    const updateCartItem = (productId, field, value) => {
        setCartItems(cartItems.map(item =>
            item.productId === productId ? { ...item, [field]: value } : item
        ))
    }

    const removeFromCart = (productId) => {
        setCartItems(cartItems.filter(item => item.productId !== productId))
    }

    // Calculations
    const sellSubtotal = cartItems.reduce((sum, item) => {
        const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)
        const discount = itemTotal * ((parseFloat(item.discount) || 0) / 100)
        return sum + (itemTotal - discount)
    }, 0)

    const sellTax = cartItems.reduce((sum, item) => {
        const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)
        const discountAmt = itemTotal * ((parseFloat(item.discount) || 0) / 100)
        const taxable = itemTotal - discountAmt
        return sum + (taxable * (((parseFloat(item.cgst) || 0) + (parseFloat(item.sgst) || 0)) / 100))
    }, 0)

    const sellRoundOff = Math.round(sellSubtotal + sellTax) - (sellSubtotal + sellTax)
    const sellTotal = sellSubtotal + sellTax + sellRoundOff

    const addSubtotal = addedItems.reduce((sum, item) => sum + item.amount, 0)
    const addTax = addedItems.reduce((sum, item) => {
        const cgst = (parseFloat(item.cgst) || 0) / 100
        const sgst = (parseFloat(item.sgst) || 0) / 100
        return sum + (item.amount * (cgst + sgst))
    }, 0)
    const addRoundOff = Math.round(addSubtotal + addTax) - (addSubtotal + addTax)
    const addTotal = addSubtotal + addTax + addRoundOff

    const handleSellItem = async (e) => {
        e.preventDefault()

        if (cartItems.length === 0) return alert('Please add items to sell')

        try {
            const saleData = {
                customerId: sellForm.customerId || null,
                items: cartItems.map(item => ({
                    productId: item.productId || null,
                    name: item.name,
                    quantity: item.quantity || 0,
                    price: item.rate,
                    hsn: item.hsn || '8301',
                    cgst: parseFloat(item.cgst) || 0,
                    sgst: parseFloat(item.sgst) || 0,
                    discount: parseFloat(item.discount) || 0,
                })),
                paymentMode: sellForm.customerId ? 'credit' : 'cash',
                subtotal: sellSubtotal,
                tax: sellTax,
                total: sellTotal,
                amountPaid: sellTotal,
                salesChannel: 'in-store',
                invoiceNumber: sellForm.invoice
            }

            const response = await api.post('/sales', saleData)
            alert(`Sale completed! Invoice: ${response.data.invoiceNumber}`)

            setCartItems([])
            setShowSellModal(false)
            fetchProducts()
        } catch (error) {
            alert(error.response?.data?.error || 'Error processing sale')
        }
    }

    const addItemToSellList = () => {
        if (!sellItemInput.name || !sellItemInput.quantity || !sellItemInput.rate) {
            return alert('Please enter item name, quantity and rate')
        }

        const newItem = {
            ...sellItemInput,
            // If productId is empty string, keep it simplified or make sure it's null logic downstream handles it
            productId: sellItemInput.productId ? parseInt(sellItemInput.productId) : null
        }

        // Check if item with same ID (if exists) or same NAME is already in cart?
        // simple duplicate check
        const existingIndex = cartItems.findIndex(i =>
            (newItem.productId && i.productId === newItem.productId) ||
            (!newItem.productId && i.name === newItem.name)
        )

        if (existingIndex >= 0) {
            return alert('Item already in cart')
        }

        setCartItems([...cartItems, newItem])

        setSellItemInput({
            productId: '',
            name: '',
            size: '',
            sizeUnit: 'mm',
            hsn: '8301',
            cgst: '0',
            sgst: '0',
            quantity: '',
            rate: '',
            discount: ''
        })
    }

    useEffect(() => {
        if (showSellModal) {
            setSellForm(prev => ({ ...prev, invoice: 'Generating...' }))
            const fetchInvoice = async () => {
                try {
                    const res = await api.get('/settings/invoice_config')
                    if (res.data) {
                        const { prefix, sequence, fiscalYear } = res.data
                        setSellForm(prev => ({
                            ...prev,
                            invoice: `${prefix}${String(sequence).padStart(3, '0')}/${fiscalYear}`
                        }))
                    } else {
                        setSellForm(prev => ({ ...prev, invoice: 'Error Gen' }))
                        alert('Could not generate invoice number. Please check settings.')
                    }
                } catch (err) {
                    console.error('Error fetching invoice config:', err)
                    setSellForm(prev => ({ ...prev, invoice: 'Auth Error' }))
                    if (err.response?.status === 401) {
                        alert('Session expired. Please log out and log in again.')
                    } else {
                        alert('Error generating invoice number. Ensure server is running.')
                    }
                }
            }
            fetchInvoice()
        }
    }, [showSellModal])

    // Shared Datalist for Product Suggestions
    const productDatalist = (
        <datalist id="product-suggestions">
            {products.map(p => (
                <option key={p.id} value={p.name} />
            ))}
        </datalist>
    )

    return (
        <div className="inventory-page"> {/* Reusing inventory-page class for layout */}
            <div className="page-header">
                <h1 className="page-title">Sell & Purchase</h1>
            </div>

            {productDatalist}

            <div className="actions-container" style={{ display: 'flex', gap: '20px', padding: '20px', justifyContent: 'center' }}>
                <button className="btn btn-success" style={{ padding: '30px', fontSize: '1.2em' }} onClick={() => setShowSellModal(true)}>
                    💰 Sell Item
                </button>
                <button className="btn btn-primary" style={{ padding: '30px', fontSize: '1.2em' }} onClick={() => setShowPurchaseModal(true)}>
                    🛒 Purchase Item
                </button>
            </div>

            {/* Purchase Item Modal (formerly Add Item) */}
            {showPurchaseModal && (
                <div className="modal-overlay" onClick={() => setShowPurchaseModal(false)}>
                    <div className="modal glass invoice-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="invoice-header">
                            <div className="invoice-info-row">
                                <div className="invoice-field">
                                    <input className="input" placeholder="Supplier Invoice" value={addForm.supplierInvoice || ''}
                                        onChange={(e) => setAddForm({ ...addForm, supplierInvoice: e.target.value })}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.parentElement.nextElementSibling?.querySelector('input')?.focus(); } }} />
                                </div>
                                <div className="invoice-field">
                                    <input type="date" className="input" value={addForm.date}
                                        onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.querySelector('.supplier-select-row select')?.focus(); } }}
                                        required />
                                </div>
                            </div>
                            <div className="supplier-select-row">
                                <select className="input" value={addForm.supplierId}
                                    onChange={(e) => setAddForm({ ...addForm, supplierId: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.querySelector('.input-row .input-table')?.focus(); } }}
                                    required>
                                    <option value="">Select Supplier</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="invoice-table-wrapper">
                            <table className="invoice-table">
                                <thead>
                                    <tr>
                                        <th className="col-name">Item description(name)</th>
                                        <th className="col-size">size</th>
                                        <th className="col-hsn">HSN*</th>
                                        <th className="col-cgst">CGST</th>
                                        <th className="col-sgst">SGST</th>
                                        <th className="col-qty">Quantity</th>
                                        <th className="col-rate">rate</th>
                                        <th className="col-disc">discount</th>
                                        <th className="col-amount">Amount*</th>
                                        <th className="col-action no-border"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {addedItems.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.name}</td>
                                            <td>{item.size}{item.sizeUnit}</td>
                                            <td>{item.hsn}</td>
                                            <td>{item.cgst}%</td>
                                            <td>{item.sgst}%</td>
                                            <td>{item.quantity} pcs</td>
                                            <td>{item.rate}</td>
                                            <td>{item.discount}%</td>
                                            <td>${item.amount.toFixed(2)}</td>
                                            <td className="no-border">
                                                <button type="button" className="btn-remove-small" onClick={() => removeAddedItem(index)}>✕</button>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="input-row">
                                        <td>
                                            <input
                                                className="input-table"
                                                list="product-suggestions"
                                                placeholder="Name"
                                                value={addItemRow.name}
                                                onChange={e => setAddItemRow({ ...addItemRow, name: e.target.value })}
                                                onKeyDown={e => {
                                                    // Handle Enter or Tab for autocomplete
                                                    if (e.key === 'Enter' || e.key === 'Tab') {
                                                        const val = e.target.value
                                                        const product = products.find(p => p.name === val)

                                                        // If no exact match, try partial match (starts with)
                                                        if (!product && val) {
                                                            const match = products.find(p => p.name.toLowerCase().startsWith(val.toLowerCase()))
                                                            if (match) {
                                                                setAddItemRow({
                                                                    ...addItemRow,
                                                                    name: match.name,
                                                                    size: '', // Reset size or could fetch if stored
                                                                    sizeUnit: 'mm',
                                                                    hsn: match.hsn || '8301',
                                                                    cgst: match.gst ? (parseFloat(match.gst) / 2).toString() : '9',
                                                                    sgst: match.gst ? (parseFloat(match.gst) / 2).toString() : '9',
                                                                    quantity: addItemRow.quantity,
                                                                    rate: match.purchasePrice || match.sellingPrice || '', // Use purchase price if available
                                                                    discount: addItemRow.discount
                                                                })
                                                                // Prevent default only if we want to stop tab navigation (unlikely we want to stop tab, just update state before move)
                                                                // But for Enter we want to move focus explicitly
                                                            }
                                                        }

                                                        if (e.key === 'Enter') {
                                                            e.target.parentElement.nextElementSibling?.querySelector('input')?.focus()
                                                        }
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td>
                                            <div className="size-group">
                                                <input className="input-table size-val" placeholder="0" value={addItemRow.size} onChange={e => setAddItemRow({ ...addItemRow, size: e.target.value })} onKeyDown={e => e.key === 'Enter' && e.target.nextElementSibling?.focus()} />
                                                <select className="input-table size-u" value={addItemRow.sizeUnit} onChange={e => setAddItemRow({ ...addItemRow, sizeUnit: e.target.value })} onKeyDown={e => e.key === 'Enter' && e.target.parentElement.parentElement.nextElementSibling?.querySelector('select')?.focus()}>
                                                    <option value="mm">mm</option>
                                                    <option value="cm">cm</option>
                                                    <option value="in">in</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td>
                                            <select className="input-table" value={addItemRow.hsn} onChange={e => setAddItemRow({ ...addItemRow, hsn: e.target.value })} onKeyDown={e => e.key === 'Enter' && e.target.parentElement.nextElementSibling?.querySelector('input')?.focus()}>
                                                {hsnCodes.map(code => <option key={code} value={code}>{code}</option>)}
                                            </select>
                                        </td>
                                        <td><input className="input-table" placeholder="9" type="number" value={addItemRow.cgst} onChange={e => setAddItemRow({ ...addItemRow, cgst: e.target.value })} onKeyDown={e => e.key === 'Enter' && e.target.parentElement.nextElementSibling?.querySelector('input')?.focus()} /></td>
                                        <td><input className="input-table" placeholder="9" type="number" value={addItemRow.sgst} onChange={e => setAddItemRow({ ...addItemRow, sgst: e.target.value })} onKeyDown={e => e.key === 'Enter' && e.target.parentElement.nextElementSibling?.querySelector('input')?.focus()} /></td>
                                        <td><input className="input-table" placeholder="0" type="number" value={addItemRow.quantity} onChange={e => setAddItemRow({ ...addItemRow, quantity: e.target.value })} onKeyDown={e => e.key === 'Enter' && e.target.parentElement.nextElementSibling?.querySelector('input')?.focus()} /></td>
                                        <td><input className="input-table" placeholder="0.00" type="number" value={addItemRow.rate} onChange={e => setAddItemRow({ ...addItemRow, rate: e.target.value })} onKeyDown={e => e.key === 'Enter' && e.target.parentElement.nextElementSibling?.querySelector('input')?.focus()} /></td>
                                        <td><input className="input-table" placeholder="%" type="number" value={addItemRow.discount} onChange={e => setAddItemRow({ ...addItemRow, discount: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItemToList(); } }} /></td>
                                        <td>
                                            ${(() => {
                                                const baseAmount = (parseFloat(addItemRow.quantity) || 0) * (parseFloat(addItemRow.rate) || 0) * (1 - (parseFloat(addItemRow.discount) || 0) / 100);
                                                const taxRate = ((parseFloat(addItemRow.cgst) || 0) + (parseFloat(addItemRow.sgst) || 0)) / 100;
                                                return (baseAmount * (1 + taxRate)).toFixed(2);
                                            })()}
                                        </td>
                                        <td className="no-border">
                                            <button type="button" className="btn-add-table" onClick={addItemToList}>(+)add</button>
                                        </td>
                                    </tr>
                                    <tr className="footer-row-total">
                                        <td colSpan="2">Total Amount</td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td>${(addSubtotal + addTax).toFixed(2)}</td>
                                        <td className="no-border"></td>
                                    </tr>
                                    <tr className="footer-row-light">
                                        <td colSpan="2">Rounded off</td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td>{addRoundOff >= 0 ? '+' : '-'}{Math.abs(addRoundOff).toFixed(2)}</td>
                                        <td className="no-border"></td>
                                    </tr>
                                    <tr className="footer-row-final">
                                        <td colSpan="2">Total Invoice Value</td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td>{addedItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0)} pcs</td>
                                        <td></td>
                                        <td></td>
                                        <td>${addTotal.toFixed(0)}</td>
                                        <td className="no-border"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="modal-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowPurchaseModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" onClick={handlePurchaseItem}>Complete Purchase</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sell Item Modal */}
            {showSellModal && (
                <div className="modal-overlay" onClick={() => setShowSellModal(false)}>
                    <div className="modal glass invoice-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="invoice-header">
                            <div className="invoice-info-row">
                                <div className="invoice-field">
                                    <input className="input" placeholder="Customer Invoice" value={sellForm.invoice || ''}
                                        onChange={(e) => setSellForm({ ...sellForm, invoice: e.target.value })}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.parentElement.nextElementSibling?.querySelector('input')?.focus(); } }} />
                                </div>
                                <div className="invoice-field">
                                    <input type="date" className="input" value={sellForm.date}
                                        onChange={(e) => setSellForm({ ...sellForm, date: e.target.value })}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.querySelectorAll('.supplier-select-row select')[1]?.focus(); } }}
                                        required />
                                </div>
                            </div>
                            <div className="supplier-select-row">
                                <select className="input" value={sellForm.customerId || ''}
                                    onChange={(e) => setSellForm({ ...sellForm, customerId: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.querySelectorAll('.input-row select')[1]?.focus(); } }}
                                    required>
                                    <option value="">Walk-in Customer</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="invoice-table-wrapper">
                            <table className="invoice-table">
                                <thead>
                                    <tr>
                                        <th className="col-name">Item description(name)</th>
                                        <th className="col-size">size</th>
                                        <th className="col-hsn">HSN*</th>
                                        <th className="col-cgst">CGST</th>
                                        <th className="col-sgst">SGST</th>
                                        <th className="col-qty">Quantity</th>
                                        <th className="col-rate">rate</th>
                                        <th className="col-disc">discount</th>
                                        <th className="col-amount">Amount*</th>
                                        <th className="col-action no-border"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cartItems.map((item, index) => (
                                        <tr key={item.productId}>
                                            <td>{item.name}</td>
                                            <td>
                                                <div className="size-group">
                                                    <input className="input-table size-val" value={item.size} onChange={e => updateCartItem(item.productId, 'size', e.target.value)} />
                                                    <select className="input-table size-u" value={item.sizeUnit} onChange={e => updateCartItem(item.productId, 'sizeUnit', e.target.value)}>
                                                        <option value="mm">mm</option>
                                                        <option value="cm">cm</option>
                                                        <option value="in">in</option>
                                                    </select>
                                                </div>
                                            </td>
                                            <td>
                                                <select className="input-table" value={item.hsn} onChange={e => updateCartItem(item.productId, 'hsn', e.target.value)}>
                                                    {hsnCodes.map(code => <option key={code} value={code}>{code}</option>)}
                                                </select>
                                            </td>
                                            <td><input className="input-table" type="number" value={item.cgst} onChange={e => updateCartItem(item.productId, 'cgst', e.target.value)} /></td>
                                            <td><input className="input-table" type="number" value={item.sgst} onChange={e => updateCartItem(item.productId, 'sgst', e.target.value)} /></td>
                                            <td><input className="input-table" type="number" value={item.quantity} onChange={e => updateCartItem(item.productId, 'quantity', e.target.value)} /></td>
                                            <td><input className="input-table" type="number" value={item.rate} onChange={e => updateCartItem(item.productId, 'rate', e.target.value)} /></td>
                                            <td><input className="input-table" type="number" value={item.discount} onChange={e => updateCartItem(item.productId, 'discount', e.target.value)} /></td>
                                            <td>
                                                ${(() => {
                                                    const baseAmount = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0) * (1 - (parseFloat(item.discount) || 0) / 100);
                                                    const taxRate = ((parseFloat(item.cgst) || 0) + (parseFloat(item.sgst) || 0)) / 100;
                                                    return (baseAmount * (1 + taxRate)).toFixed(2);
                                                })()}
                                            </td>
                                            <td>
                                                <button type="button" className="btn-remove-small" onClick={() => removeFromCart(item.productId)}>✕</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Product Selection Row - Manual Entry Enabled */}
                                    <tr className="input-row">
                                        <td>
                                            <input
                                                className="input-table"
                                                list="product-suggestions"
                                                placeholder="Type to search..."
                                                value={sellItemInput.name}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    const product = products.find(p => p.name === val)

                                                    if (product) {
                                                        // Exact match found - auto fill
                                                        setSellItemInput({
                                                            ...sellItemInput,
                                                            productId: String(product.id),
                                                            name: product.name,
                                                            rate: product.sellingPrice || '',
                                                            hsn: product.hsn || '8301',
                                                            cgst: product.gst ? (parseFloat(product.gst) / 2).toString() : '9',
                                                            sgst: product.gst ? (parseFloat(product.gst) / 2).toString() : '9',
                                                            size: '',
                                                            sizeUnit: 'mm',
                                                            quantity: sellItemInput.quantity,
                                                            discount: sellItemInput.discount
                                                        })
                                                    } else {
                                                        // No match - allow free typing but clear ID
                                                        setSellItemInput({
                                                            ...sellItemInput,
                                                            name: val,
                                                            productId: ''
                                                        })
                                                    }
                                                }}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' || e.key === 'Tab') {
                                                        const val = e.target.value
                                                        const product = products.find(p => p.name === val)

                                                        if (!product && val) {
                                                            const match = products.find(p => p.name.toLowerCase().startsWith(val.toLowerCase()))
                                                            if (match) {
                                                                setSellItemInput({
                                                                    ...sellItemInput,
                                                                    productId: String(match.id),
                                                                    name: match.name,
                                                                    rate: match.sellingPrice || '',
                                                                    hsn: match.hsn || '8301',
                                                                    cgst: match.gst ? (parseFloat(match.gst) / 2).toString() : '9',
                                                                    sgst: match.gst ? (parseFloat(match.gst) / 2).toString() : '9',
                                                                    size: '',
                                                                    sizeUnit: 'mm',
                                                                    quantity: sellItemInput.quantity,
                                                                    discount: sellItemInput.discount
                                                                })
                                                            }
                                                        }

                                                        if (e.key === 'Enter') {
                                                            e.target.parentElement.nextElementSibling?.querySelector('input')?.focus()
                                                        }
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td>
                                            <div className="size-group">
                                                <input className="input-table size-val" value={sellItemInput.size} onChange={e => setSellItemInput({ ...sellItemInput, size: e.target.value })} onKeyDown={e => e.key === 'Enter' && e.target.nextElementSibling?.focus()} />
                                                <select className="input-table size-u" value={sellItemInput.sizeUnit} onChange={e => setSellItemInput({ ...sellItemInput, sizeUnit: e.target.value })} onKeyDown={e => e.key === 'Enter' && e.target.parentElement.parentElement.nextElementSibling?.querySelector('input')?.focus()}>
                                                    <option>mm</option>
                                                    <option>cm</option>
                                                    <option>in</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td><input className="input-table" value={sellItemInput.hsn} onChange={e => setSellItemInput({ ...sellItemInput, hsn: e.target.value })} onKeyDown={e => e.key === 'Enter' && e.target.parentElement.nextElementSibling?.querySelector('input')?.focus()} /></td>
                                        <td><input className="input-table" value={sellItemInput.cgst} onChange={e => setSellItemInput({ ...sellItemInput, cgst: e.target.value })} onKeyDown={e => e.key === 'Enter' && e.target.parentElement.nextElementSibling?.querySelector('input')?.focus()} /></td>
                                        <td><input className="input-table" value={sellItemInput.sgst} onChange={e => setSellItemInput({ ...sellItemInput, sgst: e.target.value })} onKeyDown={e => e.key === 'Enter' && e.target.parentElement.nextElementSibling?.querySelector('input')?.focus()} /></td>
                                        <td><input className="input-table" value={sellItemInput.quantity} onChange={e => setSellItemInput({ ...sellItemInput, quantity: e.target.value })} onKeyDown={e => e.key === 'Enter' && e.target.parentElement.nextElementSibling?.querySelector('input')?.focus()} /></td>
                                        <td><input className="input-table" value={sellItemInput.rate} onChange={e => setSellItemInput({ ...sellItemInput, rate: e.target.value })} onKeyDown={e => e.key === 'Enter' && e.target.parentElement.nextElementSibling?.querySelector('input')?.focus()} /></td>
                                        <td><input className="input-table" value={sellItemInput.discount} onChange={e => setSellItemInput({ ...sellItemInput, discount: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItemToSellList(); } }} /></td>
                                        <td>
                                            ${(() => {
                                                const baseAmount = (parseFloat(sellItemInput.quantity) || 0) * (parseFloat(sellItemInput.rate) || 0) * (1 - (parseFloat(sellItemInput.discount) || 0) / 100);
                                                const taxRate = ((parseFloat(sellItemInput.cgst) || 0) + (parseFloat(sellItemInput.sgst) || 0)) / 100;
                                                return (baseAmount * (1 + taxRate)).toFixed(2);
                                            })()}
                                        </td>
                                        <td className="no-border"><button type="button" className="btn-add-table" onClick={addItemToSellList}>(+)add</button></td>
                                    </tr>
                                    <tr className="footer-row-total">
                                        <td colSpan="2">Total Amount</td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td>${(sellSubtotal + sellTax).toFixed(2)}</td>
                                        <td className="no-border"></td>
                                    </tr>
                                    <tr className="footer-row-light">
                                        <td colSpan="2">Rounded off</td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td>{sellRoundOff >= 0 ? '+' : '-'}{Math.abs(sellRoundOff).toFixed(2)}</td>
                                        <td className="no-border"></td>
                                    </tr>
                                    <tr className="footer-row-final">
                                        <td colSpan="2">Total Invoice Value</td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td>{cartItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0)} pcs</td>
                                        <td></td>
                                        <td></td>
                                        <td>${sellTotal.toFixed(0)}</td>
                                        <td className="no-border"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="modal-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowSellModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" onClick={handleSellItem}>Complete Sale</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SellPurchase
