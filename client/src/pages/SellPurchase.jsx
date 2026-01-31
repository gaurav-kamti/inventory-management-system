import { useState, useEffect, useRef } from 'react'
import api from '../utils/api'
import './Inventory.css' // We might need to create a separate CSS or share it

function SellPurchase() {
    const [products, setProducts] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [customers, setCustomers] = useState([])
    const [showPurchaseModal, setShowPurchaseModal] = useState(false) // Renamed from showAddModal
    const [showSellModal, setShowSellModal] = useState(false)

    // Refs for Focus Management
    const purchaseInvoiceRef = useRef(null)
    const purchaseSupplierRef = useRef(null)
    const purchaseItemNameRef = useRef(null)
    const purchaseQtyRef = useRef(null)
    const purchaseRateRef = useRef(null)
    const purchaseDiscountRef = useRef(null)
    const purchaseAddBtnRef = useRef(null)

    const sellInvoiceRef = useRef(null)
    const sellCustomerRef = useRef(null)
    const sellItemNameRef = useRef(null)
    const sellQtyRef = useRef(null)
    const sellRateRef = useRef(null)
    const sellDiscountRef = useRef(null)
    const sellAddBtnRef = useRef(null)

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
        gst: '18',
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
        gst: '18',
        quantity: '',
        rate: '',
        discount: ''
    })

    const [availableAdvances, setAvailableAdvances] = useState([])
    const [selectedAdvanceIds, setSelectedAdvanceIds] = useState([])

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
            gst: '18',
            quantity: '',
            rate: '',
            discount: ''
        })
        setTimeout(() => purchaseItemNameRef.current?.focus(), 0)
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

    // Initial Focus Logic
    useEffect(() => {
        if (showPurchaseModal) {
            setTimeout(() => purchaseInvoiceRef.current?.focus(), 100)
        }
    }, [showPurchaseModal])

    useEffect(() => {
        if (showSellModal) {
            setTimeout(() => sellCustomerRef.current?.focus(), 100)
        }
    }, [showSellModal])

    // Global Shortcut for Shift+Enter to Submit
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (e.shiftKey && e.key === 'Enter') {
                if (showPurchaseModal && addedItems.length > 0) {
                    e.preventDefault()
                    // Trigger purchase submission programmatically
                    // We can't pass 'e' directly if it expects form event, but our handler uses e.preventDefault
                    // Best to wrap handler logic or simulate
                    handlePurchaseItem({ preventDefault: () => { } })
                }
                if (showSellModal && cartItems.length > 0) {
                    e.preventDefault()
                    handleSellItem({ preventDefault: () => { } })
                }
            }
        }
        window.addEventListener('keydown', handleGlobalKeyDown)
        return () => window.removeEventListener('keydown', handleGlobalKeyDown)
    }, [showPurchaseModal, showSellModal, addedItems, cartItems, sellForm, addForm, selectedAdvanceIds]) // Add dependencies for form state closure

    const fetchAdvances = async (entity, id) => {
        if (!id) {
            setAvailableAdvances([]);
            setSelectedAdvanceIds([]);
            return;
        }
        try {
            const res = await api.get(`/vouchers/unused-advances/${entity}/${id}`);
            setAvailableAdvances(res.data);
            setSelectedAdvanceIds([]); // Reset on entity change
        } catch (err) {
            console.error('Error fetching advances:', err);
        }
    }

    useEffect(() => {
        if (addForm.supplierId) fetchAdvances('supplier', addForm.supplierId);
        else setAvailableAdvances([]);
    }, [addForm.supplierId]);

    useEffect(() => {
        if (sellForm.customerId) fetchAdvances('customer', sellForm.customerId);
        else setAvailableAdvances([]);
    }, [sellForm.customerId]);

    const toggleAdvance = (id) => {
        setSelectedAdvanceIds(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    }

    const totalAdjusted = selectedAdvanceIds.reduce((sum, id) => {
        const adv = availableAdvances.find(a => a.id === id);
        return sum + (parseFloat(adv?.remainingAdvance) || 0);
    }, 0);

    const advanceSection = (
        availableAdvances.length > 0 && (
            <div className="advance-adjustment-section" style={{
                marginTop: '15px',
                padding: '10px',
                backgroundColor: 'rgba(255,165,0,0.1)',
                borderRadius: '5px',
                border: '1px dashed orange'
            }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: 'orange' }}>Adjust Advance</h4>
                {availableAdvances.map(adv => (
                    <label key={adv.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85em', color: '#eee', marginBottom: '5px' }}>
                        <input type="checkbox" checked={selectedAdvanceIds.includes(adv.id)} onChange={() => toggleAdvance(adv.id)} />
                        <span>Date: {formatDate(adv.date || adv.createdAt)} | Amt: ${parseFloat(adv.remainingAdvance).toFixed(2)} {adv.notes ? `(${adv.notes})` : ''}</span>
                    </label>
                ))}
            </div>
        )
    )

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
                    gst: item.gst || 18
                })),
                advanceAdjustments: selectedAdvanceIds.map(id => {
                    const adv = availableAdvances.find(a => a.id === id);
                    return { id, amount: adv.remainingAdvance };
                })
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
            setAddedItems([])
            setShowPurchaseModal(false)
            fetchProducts()
            fetchSuppliers() // Refresh suppliers to reflect any meaningful updates if needed
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
                gst: product.gst || 18,
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
        return sum + (taxable * ((parseFloat(item.gst) || 18) / 100))
    }, 0)

    const sellRoundOff = Math.round(sellSubtotal + sellTax) - (sellSubtotal + sellTax)
    const sellTotal = sellSubtotal + sellTax + sellRoundOff

    const addSubtotal = addedItems.reduce((sum, item) => sum + item.amount, 0)
    const addTax = addedItems.reduce((sum, item) => {
        const gst = (parseFloat(item.gst) || 18) / 100
        return sum + (item.amount * gst)
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
                    gst: parseFloat(item.gst) || 18,
                    discount: parseFloat(item.discount) || 0,
                })),
                paymentMode: sellForm.customerId ? 'credit' : 'cash',
                subtotal: sellSubtotal,
                tax: sellTax,
                total: sellTotal,
                amountPaid: sellForm.customerId ? 0 : sellTotal,
                salesChannel: 'in-store',
                invoiceNumber: sellForm.invoice,
                advanceAdjustments: selectedAdvanceIds.map(id => {
                    const adv = availableAdvances.find(a => a.id === id);
                    return { id, amount: adv.remainingAdvance };
                })
            }

            const response = await api.post('/sales', saleData)
            alert(`Sale completed! Invoice: ${response.data.invoiceNumber}`)

            setCartItems([])
            setShowSellModal(false)
            setCartItems([])
            setShowSellModal(false)
            fetchProducts()
            fetchCustomers() // Refresh customers to ensure outstanding balance is updated locally if displayed
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
            gst: '18',
            quantity: '',
            rate: '',
            discount: ''
        })
        setTimeout(() => sellItemNameRef.current?.focus(), 0)
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
            <div className="page-header" style={{ marginBottom: '40px' }}>
                <h1 className="page-title" style={{
                    fontSize: '3rem',
                    fontWeight: '900',
                    color: 'var(--text-primary)',
                    textAlign: 'center',
                    letterSpacing: '-2px'
                }}>
                    Transactions
                </h1>
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>
                    Manage Sales and Purchase Vouchers
                </p>
            </div>

            {productDatalist}

            <div className="actions-container" style={{ display: 'flex', gap: '30px', padding: '40px', justifyContent: 'center' }}>
                <button className="btn" style={{
                    padding: '40px 60px',
                    fontSize: '1.4rem',
                    background: 'linear-gradient(135deg, var(--bg-light) 0%, var(--bg-mid) 100%)',
                    color: 'var(--text-primary)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '24px'
                }} onClick={() => setShowSellModal(true)}>
                    <span style={{ fontSize: '2rem' }}>💰</span> Sales Voucher
                </button>
                <button className="btn" style={{
                    padding: '40px 60px',
                    fontSize: '1.4rem',
                    background: 'rgba(255,255,255,0.03)',
                    color: 'var(--text-primary)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '24px'
                }} onClick={() => setShowPurchaseModal(true)}>
                    <span style={{ fontSize: '2rem' }}>🛒</span> Purchase Voucher
                </button>
            </div>

            {/* Purchase Item Modal */}
            {showPurchaseModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(5, 31, 32, 0.9)', backdropFilter: 'blur(12px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
                    animation: 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} onClick={() => setShowPurchaseModal(false)}>
                    <div className="modal glass" style={{
                        width: '98%', maxWidth: '1600px', height: '95vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        padding: '30px', background: 'var(--bg-dark)', border: '1px solid var(--glass-border)',
                        borderRadius: '24px', boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
                        position: 'relative'
                    }} onClick={(e) => e.stopPropagation()}>

                        <div className="modal-close" onClick={() => setShowPurchaseModal(false)} style={{
                            position: 'absolute', top: '25px', right: '25px', cursor: 'pointer',
                            fontSize: '1.5rem', color: 'var(--text-secondary)', transition: '0.3s', zIndex: 10
                        }}>✕</div>

                        <div className="invoice-header" style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
                                <div>
                                    <h2 style={{ color: 'var(--text-primary)', fontSize: '2.2rem', fontWeight: '900', letterSpacing: '-1px' }}>Purchase Bill</h2>
                                    <p style={{ color: 'var(--accent)', fontWeight: '600', fontSize: '0.9rem' }}>Entry of inward goods/services</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>Date</p>
                                    <p style={{ fontSize: '1.1rem', fontWeight: '700' }}>{new Date().toLocaleDateString('en-GB')}</p>
                                </div>
                            </div>

                            <div className="invoice-info-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '25px' }}>
                                <div className="invoice-field">
                                    <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>Supplier Invoice #</label>
                                    <input className="input" placeholder="e.g. SUP/2024/001" value={addForm.supplierInvoice || ''}
                                        ref={purchaseInvoiceRef}
                                        onChange={(e) => setAddForm({ ...addForm, supplierInvoice: e.target.value })}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '16px' }}
                                    />
                                </div>
                                <div className="invoice-field">
                                    <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>Invoice Date</label>
                                    <input type="date" className="input" value={addForm.date}
                                        onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                                        required style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '16px', colorScheme: 'dark' }}
                                    />
                                </div>
                                <div className="invoice-field">
                                    <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>Party Name (Supplier)</label>
                                    <select className="input" value={addForm.supplierId}
                                        ref={purchaseSupplierRef}
                                        onChange={(e) => setAddForm({ ...addForm, supplierId: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                purchaseItemNameRef.current?.focus()
                                            }
                                        }}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '16px' }}
                                        required>
                                        <option value="" style={{ background: 'var(--bg-deep)' }}>-- Select Registered Supplier --</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id} style={{ background: 'var(--bg-deep)' }}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="invoice-table-wrapper" style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
                            <table className="table" style={{ width: '100%', tableLayout: 'fixed' }}>
                                <thead style={{ background: 'rgba(255,255,255,0.02)', position: 'sticky', top: 0, zIndex: 5, backdropFilter: 'blur(5px)' }}>
                                    <tr>
                                        <th style={{ textAlign: 'center', width: '33%' }}>Product / Description</th>
                                        <th style={{ textAlign: 'center', width: '7%' }}>Size</th>
                                        <th style={{ textAlign: 'center', width: '8%' }}>HSN</th>
                                        <th style={{ textAlign: 'center', width: '6%' }}>Gst(%)</th>
                                        <th style={{ textAlign: 'center', width: '6%' }}>Qty</th>
                                        <th style={{ textAlign: 'center', width: '12%' }}>Rate</th>
                                        <th style={{ textAlign: 'center', width: '6%' }}>Disc</th>
                                        <th style={{ textAlign: 'center', width: '15%' }}>Amount</th>
                                        <th style={{ width: '50px', textAlign: 'center' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {addedItems.map((item, index) => (
                                        <tr key={index}>
                                            <td style={{ fontWeight: '700', color: 'var(--text-primary)', textAlign: 'center' }}>{item.name}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '14px', overflow: 'hidden' }}>
                                                    <input className="input" style={{ flex: 1, minWidth: '0', padding: '8px 4px 8px 8px', fontSize: '0.8rem', border: 'none', background: 'transparent', textAlign: 'right' }} value={item.size} readOnly />
                                                    <span className="input" style={{ width: 'auto', padding: '8px 8px 8px 0', fontSize: '0.8rem', border: 'none', background: 'transparent', textAlign: 'left', color: 'var(--text-primary)' }}>{item.sizeUnit}</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{item.hsn}</td>
                                            <td style={{ textAlign: 'center' }}>{item.gst}%</td>
                                            <td style={{ fontWeight: '600', textAlign: 'center' }}>{item.quantity}</td>
                                            <td style={{ fontWeight: '600', textAlign: 'center' }}>${parseFloat(item.rate).toFixed(2)}</td>
                                            <td style={{ color: '#ff4757', textAlign: 'center' }}>{item.discount}%</td>
                                            <td style={{ fontWeight: '800', color: 'var(--accent)', fontSize: '1.1rem', textAlign: 'center' }}>${item.amount.toFixed(2)}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button type="button" className="btn" style={{ minWidth: 'auto', padding: '8px', background: 'rgba(255,71,87,0.1)', color: '#ff4757', border: '1px solid rgba(255,71,87,0.2)' }} onClick={() => removeAddedItem(index)}>✕</button>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="input-row" style={{ background: 'rgba(142, 182, 155, 0.03)', borderTop: '2px solid var(--accent)' }}>
                                        <td style={{ textAlign: 'center' }}>
                                            <input className="input" style={{ padding: '12px', fontSize: '0.9rem', width: '100%' }}
                                                ref={purchaseItemNameRef}
                                                list="product-suggestions"
                                                placeholder="Search"
                                                value={addItemRow.name}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Tab') {
                                                        const val = e.target.value.toLowerCase()
                                                        const match = products.find(p => p.name.toLowerCase().includes(val))
                                                        if (match) {
                                                            e.preventDefault()
                                                            setAddItemRow(prev => ({ ...prev, name: match.name, size: match.size || '', sizeUnit: match.sizeUnit || 'mm', hsn: match.hsn || '', gst: match.gst || 18, rate: match.purchasePrice || '' }))
                                                        }
                                                    }
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        purchaseQtyRef.current?.focus()
                                                    }
                                                }}
                                                onChange={e => setAddItemRow({ ...addItemRow, name: e.target.value })}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '14px', overflow: 'hidden' }}>
                                                <input className="input" style={{ flex: 1, minWidth: '0', padding: '12px 4px 12px 12px', fontSize: '0.9rem', border: 'none', background: 'transparent', textAlign: 'right' }} placeholder="0" value={addItemRow.size}
                                                    onChange={e => setAddItemRow({ ...addItemRow, size: e.target.value })} />
                                                <select className="input" style={{ width: 'auto', padding: '12px 8px 12px 0', fontSize: '0.9rem', border: 'none', background: 'transparent', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', cursor: 'pointer', textAlign: 'left' }} value={addItemRow.sizeUnit}
                                                    onChange={e => setAddItemRow({ ...addItemRow, sizeUnit: e.target.value })}>
                                                    <option value="mm">mm</option>
                                                    <option value="cm">cm</option>
                                                    <option value="in">in</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <select className="input" style={{ padding: '12px', width: '100%', fontSize: '0.9rem' }} value={addItemRow.hsn}
                                                onChange={e => setAddItemRow({ ...addItemRow, hsn: e.target.value })}>
                                                {hsnCodes.map(code => <option key={code} value={code} style={{ background: 'var(--bg-deep)' }}>{code}</option>)}
                                            </select>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input className="input" style={{ padding: '12px', width: '100%', textAlign: 'center', fontSize: '0.9rem' }} placeholder="GST%" type="number" value={addItemRow.gst}
                                                onChange={e => setAddItemRow({ ...addItemRow, gst: e.target.value })} />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input className="input" style={{ padding: '12px', width: '100%', textAlign: 'center', fontSize: '0.9rem' }} placeholder="0" type="number"
                                                ref={purchaseQtyRef}
                                                value={addItemRow.quantity}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        purchaseRateRef.current?.focus()
                                                    }
                                                }}
                                                onChange={e => setAddItemRow({ ...addItemRow, quantity: e.target.value })}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input className="input" style={{ padding: '12px', width: '100%', textAlign: 'center', fontSize: '1rem', fontWeight: 'bold' }} placeholder="0.00" type="number"
                                                ref={purchaseRateRef}
                                                value={addItemRow.rate}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        purchaseAddBtnRef.current?.focus()
                                                    }
                                                }}
                                                onChange={e => setAddItemRow({ ...addItemRow, rate: e.target.value })}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input className="input" style={{ padding: '12px', width: '100%', textAlign: 'center', fontSize: '0.8rem' }} placeholder="%" type="number"
                                                ref={purchaseDiscountRef}
                                                value={addItemRow.discount}
                                                onChange={e => setAddItemRow({ ...addItemRow, discount: e.target.value })}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        addItemToList()
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td style={{ fontWeight: '800', fontSize: '1.1rem', textAlign: 'center' }}>
                                            ${(() => {
                                                const baseAmount = (parseFloat(addItemRow.quantity) || 0) * (parseFloat(addItemRow.rate) || 0) * (1 - (parseFloat(addItemRow.discount) || 0) / 100);
                                                const taxRate = (parseFloat(addItemRow.gst) || 18) / 100;
                                                return (baseAmount * (1 + taxRate)).toFixed(2);
                                            })()}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button type="button" ref={purchaseAddBtnRef} className="btn" style={{ padding: '12px', minWidth: 'auto', background: 'var(--accent)', color: 'var(--bg-deep)' }} onClick={addItemToList}>+</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="invoice-total-overview" style={{
                            display: 'flex', justifyContent: 'flex-end', gap: '80px', padding: '30px',
                            background: 'rgba(0,0,0,0.3)', borderRadius: '24px', border: '1px solid var(--glass-border)'
                        }}>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>Subtotal</p>
                                <p style={{ fontSize: '1.6rem', fontWeight: '800' }}>${addSubtotal.toFixed(2)}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>Total TAX (GST)</p>
                                <p style={{ fontSize: '1.6rem', fontWeight: '800' }}>${addTax.toFixed(2)}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ color: 'var(--accent)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '900', textTransform: 'uppercase' }}>Grand Total</p>
                                <p style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--accent)', letterSpacing: '-1px' }}>${addTotal.toFixed(0)}</p>
                                {totalAdjusted > 0 && (
                                    <div style={{ marginTop: '10px', color: 'orange', fontSize: '0.9rem', fontWeight: '700' }}>
                                        Adjusted: -${totalAdjusted.toFixed(2)}
                                        <p style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Net Due: ${Math.max(0, addTotal - totalAdjusted).toFixed(0)}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {advanceSection}

                        <div className="modal-actions" style={{ marginTop: '50px', display: 'flex', justifyContent: 'flex-end', gap: '20px' }}>
                            <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.05)', padding: '18px 40px', color: 'var(--text-secondary)' }} onClick={() => setShowPurchaseModal(false)}>Cancel</button>
                            <button type="submit" className="btn" style={{ background: 'var(--accent)', color: 'var(--bg-deep)', padding: '18px 50px', boxShadow: '0 10px 30px rgba(142, 182, 155, 0.2)' }} onClick={handlePurchaseItem}>Save Bill</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sell Item Modal */}
            {showSellModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(5, 31, 32, 0.9)', backdropFilter: 'blur(12px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
                    animation: 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} onClick={() => setShowSellModal(false)}>
                    <div className="modal glass" style={{
                        width: '98%', maxWidth: '1600px', height: '95vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        padding: '30px', background: 'var(--bg-dark)', border: '1px solid var(--glass-border)',
                        borderRadius: '24px', boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
                        position: 'relative'
                    }} onClick={(e) => e.stopPropagation()}>

                        <div className="modal-close" onClick={() => setShowSellModal(false)} style={{
                            position: 'absolute', top: '25px', right: '25px', cursor: 'pointer',
                            fontSize: '1.5rem', color: 'var(--text-secondary)', transition: '0.3s', zIndex: 10
                        }}>✕</div>

                        <div className="invoice-header" style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
                                <div>
                                    <h2 style={{ color: 'var(--text-primary)', fontSize: '2.2rem', fontWeight: '900', letterSpacing: '-1px' }}>Sales Invoice</h2>
                                    <p style={{ color: 'var(--accent)', fontWeight: '600', fontSize: '0.9rem' }}>Record of outward goods/services</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>Date</p>
                                    <p style={{ fontSize: '1.1rem', fontWeight: '700' }}>{new Date().toLocaleDateString('en-GB')}</p>
                                </div>
                            </div>

                            <div className="invoice-info-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '25px' }}>
                                <div className="invoice-field">
                                    <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>Invoice Number</label>
                                    <input className="input" placeholder="INV/001" value={sellForm.invoice || ''}
                                        ref={sellInvoiceRef}
                                        onChange={(e) => setSellForm({ ...sellForm, invoice: e.target.value })}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '16px' }}
                                    />
                                </div>
                                <div className="invoice-field">
                                    <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>Date of Issue</label>
                                    <input type="date" className="input" value={sellForm.date}
                                        onChange={(e) => setSellForm({ ...sellForm, date: e.target.value })}
                                        required style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '16px', colorScheme: 'dark' }}
                                    />
                                </div>
                                <div className="invoice-field">
                                    <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>Party Name (Customer)</label>
                                    <select className="input" value={sellForm.customerId || ''}
                                        ref={sellCustomerRef}
                                        onChange={(e) => setSellForm({ ...sellForm, customerId: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                sellItemNameRef.current?.focus()
                                            }
                                        }}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '16px' }}>
                                        <option value="">Walk-in Customer (Cash)</option>
                                        {customers.map(c => <option key={c.id} value={c.id} style={{ background: 'var(--bg-deep)' }}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="invoice-table-wrapper" style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
                            <table className="table" style={{ width: '100%', tableLayout: 'fixed' }}>
                                <thead style={{ background: 'rgba(255,255,255,0.02)', position: 'sticky', top: 0, zIndex: 5, backdropFilter: 'blur(5px)' }}>
                                    <tr>
                                        <th style={{ textAlign: 'center', width: '33%' }}>Product / Description</th>
                                        <th style={{ textAlign: 'center', width: '7%' }}>Size</th>
                                        <th style={{ textAlign: 'center', width: '8%' }}>HSN</th>
                                        <th style={{ textAlign: 'center', width: '6%' }}>Gst(%)</th>
                                        <th style={{ textAlign: 'center', width: '6%' }}>Qty</th>
                                        <th style={{ textAlign: 'center', width: '12%' }}>Rate</th>
                                        <th style={{ textAlign: 'center', width: '6%' }}>Disc</th>
                                        <th style={{ textAlign: 'center', width: '15%' }}>Amount</th>
                                        <th style={{ width: '50px', textAlign: 'center' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cartItems.map((item, index) => (
                                        <tr key={item.productId || index}>
                                            <td style={{ fontWeight: '700', color: 'var(--text-primary)', textAlign: 'center' }}>{item.name}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '14px', overflow: 'hidden' }}>
                                                    <input className="input" style={{ flex: 1, minWidth: '0', padding: '8px 4px 8px 8px', fontSize: '0.8rem', border: 'none', background: 'transparent', textAlign: 'right' }} value={item.size} onChange={e => updateCartItem(item.productId, 'size', e.target.value)} />
                                                    <select className="input" style={{ width: 'auto', padding: '8px 8px 8px 0', fontSize: '0.8rem', border: 'none', background: 'transparent', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', cursor: 'pointer', textAlign: 'left' }} value={item.sizeUnit} onChange={e => updateCartItem(item.productId, 'sizeUnit', e.target.value)}>
                                                        <option value="mm">mm</option>
                                                        <option value="cm">cm</option>
                                                        <option value="in">in</option>
                                                    </select>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <select className="input" style={{ padding: '8px', width: '70px', fontSize: '0.8rem' }} value={item.hsn} onChange={e => updateCartItem(item.productId, 'hsn', e.target.value)}>
                                                    {hsnCodes.map(code => <option key={code} value={code} style={{ background: 'var(--bg-deep)' }}>{code}</option>)}
                                                </select>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{item.gst}%</td>
                                            <td style={{ textAlign: 'center' }}><input type="number" className="input" style={{ padding: '8px', width: '100%', textAlign: 'center', fontSize: '0.8rem' }} value={item.quantity} onChange={e => updateCartItem(item.productId, 'quantity', e.target.value)} /></td>
                                            <td style={{ textAlign: 'center' }}><input type="number" className="input" style={{ padding: '8px', width: '100%', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold' }} value={item.rate} onChange={e => updateCartItem(item.productId, 'rate', e.target.value)} /></td>
                                            <td style={{ textAlign: 'center' }}><input type="number" className="input" style={{ padding: '8px', width: '100%', textAlign: 'center', fontSize: '0.8rem' }} value={item.discount} onChange={e => updateCartItem(item.productId, 'discount', e.target.value)} /></td>
                                            <td style={{ fontWeight: '800', color: 'var(--accent)', fontSize: '1.1rem', textAlign: 'center' }}>
                                                ${(() => {
                                                    const baseAmount = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0) * (1 - (parseFloat(item.discount) || 0) / 100);
                                                    const taxRate = (parseFloat(item.gst) || 18) / 100;
                                                    return (baseAmount * (1 + taxRate)).toFixed(2);
                                                })()}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button type="button" className="btn" style={{ minWidth: 'auto', padding: '8px', background: 'rgba(255,71,87,0.1)', color: '#ff4757' }} onClick={() => removeFromCart(item.productId)}>✕</button>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="input-row" style={{ background: 'rgba(142, 182, 155, 0.03)', borderTop: '2px solid var(--accent)' }}>
                                        <td style={{ textAlign: 'center' }}>
                                            <input className="input" style={{ padding: '12px', fontSize: '0.9rem', width: '100%' }}
                                                ref={sellItemNameRef}
                                                list="product-suggestions"
                                                placeholder="Search"
                                                value={sellItemInput.name}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Tab') {
                                                        const val = e.target.value.toLowerCase()
                                                        const match = products.find(p => p.name.toLowerCase().includes(val))
                                                        if (match) {
                                                            e.preventDefault()
                                                            setSellItemInput(prev => ({
                                                                ...prev,
                                                                productId: String(match.id),
                                                                name: match.name,
                                                                rate: match.sellingPrice || '',
                                                                hsn: match.hsn || '8301',
                                                                gst: match.gst || 18,
                                                            }))
                                                        }
                                                    }
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        sellQtyRef.current?.focus()
                                                    }
                                                }}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    const product = products.find(p => p.name === val)
                                                    if (product) {
                                                        setSellItemInput(prev => ({
                                                            ...prev,
                                                            productId: String(product.id),
                                                            name: product.name,
                                                            rate: product.sellingPrice || '',
                                                            hsn: product.hsn || '8301',
                                                            gst: product.gst || 18,
                                                        }))
                                                    } else {
                                                        setSellItemInput(prev => ({ ...prev, name: val, productId: '' }))
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '14px', overflow: 'hidden' }}>
                                                <input className="input" style={{ flex: 1, minWidth: '0', padding: '12px 4px 12px 12px', fontSize: '0.9rem', border: 'none', background: 'transparent', textAlign: 'right' }} placeholder="0" value={sellItemInput.size}
                                                    onChange={e => setSellItemInput({ ...sellItemInput, size: e.target.value })} />
                                                <select className="input" style={{ width: 'auto', padding: '12px 8px 12px 0', fontSize: '0.9rem', border: 'none', background: 'transparent', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', cursor: 'pointer', textAlign: 'left' }} value={sellItemInput.sizeUnit}
                                                    onChange={e => setSellItemInput({ ...sellItemInput, sizeUnit: e.target.value })}>
                                                    <option>mm</option>
                                                    <option>cm</option>
                                                    <option>in</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input className="input" style={{ padding: '12px', width: '80px', fontSize: '0.9rem' }} value={sellItemInput.hsn}
                                                onChange={e => setSellItemInput({ ...sellItemInput, hsn: e.target.value })} />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input className="input" style={{ padding: '12px', width: '60px', fontSize: '0.9rem' }} placeholder="GST%" type="number" value={sellItemInput.gst}
                                                onChange={e => setSellItemInput({ ...sellItemInput, gst: e.target.value })} />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input className="input" style={{ padding: '12px', width: '100%', textAlign: 'center', fontSize: '0.9rem' }} placeholder="0" type="number"
                                                ref={sellQtyRef}
                                                value={sellItemInput.quantity}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        sellRateRef.current?.focus()
                                                    }
                                                }}
                                                onChange={e => setSellItemInput({ ...sellItemInput, quantity: e.target.value })}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input className="input" style={{ padding: '12px', width: '100%', textAlign: 'center', fontSize: '1rem', fontWeight: 'bold' }} placeholder="0.00" type="number"
                                                ref={sellRateRef}
                                                value={sellItemInput.rate}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        sellAddBtnRef.current?.focus()
                                                    }
                                                }}
                                                onChange={e => setSellItemInput({ ...sellItemInput, rate: e.target.value })}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input className="input" style={{ padding: '12px', width: '60px', fontSize: '0.9rem' }} placeholder="%" type="number"
                                                ref={sellDiscountRef}
                                                value={sellItemInput.discount}
                                                onChange={e => setSellItemInput({ ...sellItemInput, discount: e.target.value })}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        addItemToSellList()
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td style={{ fontWeight: '800', fontSize: '1.1rem', textAlign: 'center' }}>
                                            ${(() => {
                                                const baseAmount = (parseFloat(sellItemInput.quantity) || 0) * (parseFloat(sellItemInput.rate) || 0) * (1 - (parseFloat(sellItemInput.discount) || 0) / 100);
                                                const taxRate = (parseFloat(sellItemInput.gst) || 18) / 100;
                                                return (baseAmount * (1 + taxRate)).toFixed(2);
                                            })()}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button type="button" ref={sellAddBtnRef} className="btn" style={{ padding: '12px', minWidth: 'auto', background: 'var(--accent)', color: 'var(--bg-deep)' }} onClick={addItemToSellList}>+</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="invoice-total-overview" style={{
                            display: 'flex', justifyContent: 'flex-end', gap: '80px', padding: '30px',
                            background: 'rgba(0,0,0,0.3)', borderRadius: '24px', border: '1px solid var(--glass-border)'
                        }}>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>Taxable Sales</p>
                                <p style={{ fontSize: '1.6rem', fontWeight: '800' }}>${sellSubtotal.toFixed(2)}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>GST Collection</p>
                                <p style={{ fontSize: '1.6rem', fontWeight: '800' }}>${sellTax.toFixed(2)}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ color: 'var(--accent)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '900', textTransform: 'uppercase' }}>Grand Total</p>
                                <p style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--accent)', letterSpacing: '-1px' }}>${sellTotal.toFixed(0)}</p>
                                {totalAdjusted > 0 && (
                                    <div style={{ marginTop: '10px', color: 'orange', fontSize: '0.9rem', fontWeight: '700' }}>
                                        Adjusted: -${totalAdjusted.toFixed(2)}
                                        <p style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Net Collectible: ${Math.max(0, sellTotal - totalAdjusted).toFixed(0)}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {advanceSection}

                        <div className="modal-actions" style={{ marginTop: '50px', display: 'flex', justifyContent: 'flex-end', gap: '20px' }}>
                            <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.05)', padding: '18px 40px', color: 'var(--text-secondary)' }} onClick={() => setShowSellModal(false)}>Discard Action</button>
                            <button type="submit" className="btn" style={{ background: 'var(--accent)', color: 'var(--bg-deep)', padding: '18px 50px', boxShadow: '0 10px 30px rgba(142, 182, 155, 0.2)' }} onClick={handleSellItem}>Issue Tax Invoice</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SellPurchase
