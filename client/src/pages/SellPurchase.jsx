import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { numberToWords, calculateGSTSplit, generateHSNSummary, round2 } from '../utils/invoiceUtils'
import InvoiceTemplate from '../components/InvoiceTemplate'
import { downloadPDF } from '../utils/pdfExport'
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
        return `${d}:${m}:${y}`
    }

    // Purchase Item Form (formerly Add Item)
    const [addForm, setAddForm] = useState({
        invoice: `INV-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        supplierId: '',
        supplierName: '',
        deliveryNote: '',
        paymentTerms: '',
        supplierRef: '',
        buyerOrderNo: '',
        buyerOrderDate: '',
        despatchedThrough: '',
        termsOfDelivery: '',
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
        discount: '',
        quantityUnit: 'Pcs'
    })

    // Sell Item Form
    const [sellForm, setSellForm] = useState({
        invoice: '',
        date: new Date().toISOString().split('T')[0],
        customerId: '',
        customerName: '',
        roundOff: '',
        deliveryNote: '',
        paymentTerms: '',
        supplierRef: '',
        buyerOrderNo: '',
        buyerOrderDate: '',
        despatchedThrough: '',
        termsOfDelivery: ''
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
        discount: '',
        quantityUnit: 'Pcs'
    })

    const [availableAdvances, setAvailableAdvances] = useState([])
    const [selectedAdvanceIds, setSelectedAdvanceIds] = useState([])

    // Quick Add Party State
    const [showQuickAddModal, setShowQuickAddModal] = useState(false)
    const [quickAddType, setQuickAddType] = useState('customer') // 'customer' or 'supplier'

    // Success Modal State
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [showPurchaseSuccessModal, setShowPurchaseSuccessModal] = useState(false)
    const [lastSaleData, setLastSaleData] = useState(null)
    const [lastPurchaseData, setLastPurchaseData] = useState(null)
    const [quickAddForm, setQuickAddForm] = useState({
        name: '',
        phone: '',
        address: '',
        gstNumber: ''
    })

    const handleQuickAdd = async () => {
        try {
            if (!quickAddForm.name) return alert('Name is required')
            if (quickAddType === 'customer' && !quickAddForm.phone) return alert('Phone is required for customers')

            const endpoint = quickAddType === 'customer' ? '/customers' : '/suppliers'
            const res = await api.post(endpoint, quickAddForm)

            const newParty = res.data

            if (quickAddType === 'customer') {
                setCustomers(prev => [...prev, newParty])
                setSellForm(prev => ({
                    ...prev,
                    customerId: newParty.id,
                    customerName: newParty.name
                }))
            } else {
                setSuppliers(prev => [...prev, newParty])
                setAddForm(prev => ({
                    ...prev,
                    supplierId: newParty.id,
                    supplierName: newParty.name
                }))
            }

            setShowQuickAddModal(false)
            alert(`${quickAddType === 'customer' ? 'Customer' : 'Supplier'} added successfully!`)

        } catch (error) {
            console.error('Error adding party:', error)
            alert(error.response?.data?.error || 'Error adding party')
        }
    }

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
            discount: '',
            quantityUnit: 'Pcs'
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
                deliveryNote: addForm.deliveryNote,
                paymentTerms: addForm.paymentTerms,
                supplierRef: addForm.supplierRef,
                buyerOrderNo: addForm.buyerOrderNo,
                buyerOrderDate: addForm.buyerOrderDate,
                despatchedThrough: addForm.despatchedThrough,
                termsOfDelivery: addForm.termsOfDelivery,
                total: addTotal,
                roundOff: addRoundOff,
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

            const response = await api.post('/purchases', purchaseData)

            const completedPurchase = {
                ...response.data,
                type: 'PURCHASE',
                items: addedItems.map(item => ({
                    ...item,
                    Product: { name: item.name },
                    total: item.amount,
                    gst: item.gst || 18
                })),
                total: addTotal,
                invoiceNumber: addForm.supplierInvoice || `PUR-${Date.now()}`,
                date: addForm.date,
                partyName: addForm.supplierName,
                customer: suppliers.find(s => s.id === addForm.supplierId) || { name: addForm.supplierName }
            }

            setLastPurchaseData(completedPurchase)
            setShowPurchaseSuccessModal(true)

            setAddForm({
                invoice: `INV-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                supplierId: '',
                supplierName: '',
                deliveryNote: '',
                paymentTerms: '',
                supplierRef: '',
                buyerOrderNo: '',
                buyerOrderDate: '',
                despatchedThrough: '',
                termsOfDelivery: '',
                items: []
            })
            setAddedItems([])
            setShowPurchaseModal(false)
            fetchProducts()
            fetchSuppliers() // Refresh suppliers to reflect any meaningful updates if needed
        } catch (error) {
            alert(error.response?.data?.error || 'Error recording purchase')
        }
    }

    const addToCart = (product) => {
        const existing = cartItems.find(item => item.productId === product.id && item.size === '' && item.sizeUnit === 'mm')
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
                    quantityUnit: item.quantityUnit || 'Pcs'
                })),
                paymentMode: sellForm.customerId ? 'credit' : 'cash',
                subtotal: sellSubtotal,
                tax: sellTax,
                cgst: gstSplit.cgst,
                sgst: gstSplit.sgst,
                igst: gstSplit.igst,
                total: sellTotal,
                roundOff: sellRoundOff,
                amountPaid: sellForm.customerId ? 0 : sellTotal,
                salesChannel: 'in-store',
                invoiceNumber: sellForm.invoice,
                deliveryNote: sellForm.deliveryNote,
                paymentTerms: sellForm.paymentTerms,
                supplierRef: sellForm.supplierRef,
                buyerOrderNo: sellForm.buyerOrderNo,
                buyerOrderDate: sellForm.buyerOrderDate,
                despatchedThrough: sellForm.despatchedThrough,
                termsOfDelivery: sellForm.termsOfDelivery,
                advanceAdjustments: selectedAdvanceIds.map(id => {
                    const adv = availableAdvances.find(a => a.id === id);
                    return { id, amount: adv.remainingAdvance };
                })
            }

            const response = await api.post('/sales', saleData)
            setLastSaleData({ ...response.data, items: cartItems.map(i => ({ ...i, total: (parseFloat(i.quantity) || 0) * (parseFloat(i.rate) || 0) * (1 - (parseFloat(i.discount) || 0) / 100) })), customer: selectedCustomer, type: 'SALE' })
            setShowSuccessModal(true)

            setCartItems([])
            setShowSellModal(false)
            setSellForm({
                invoice: '',
                date: new Date().toISOString().split('T')[0],
                customerId: '',
                customerName: '',
                roundOff: '',
                deliveryNote: '',
                paymentTerms: '',
                supplierRef: '',
                buyerOrderNo: '',
                buyerOrderDate: '',
                despatchedThrough: '',
                termsOfDelivery: ''
            })
            fetchProducts()
            fetchCustomers() // Refresh customers to ensure outstanding balance is updated locally if displayed
        } catch (error) {
            alert(error.response?.data?.error || 'Error processing sale')
        }
    }

    const handlePrint = () => {
        window.print();
    }

    const handleDownloadPDF = async (type) => {
        const data = type === 'sale' ? lastSaleData : lastPurchaseData;
        const fileName = `${type.toUpperCase()}_${data.invoiceNumber}.pdf`;
        await downloadPDF('invoice-print-template', fileName);
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
            ((newItem.productId && i.productId === newItem.productId) ||
                (!newItem.productId && i.name === newItem.name)) &&
            i.size === newItem.size &&
            i.sizeUnit === newItem.sizeUnit
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
            discount: '',
            quantityUnit: 'Pcs'
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

    const supplierDatalist = (
        <datalist id="supplier-suggestions">
            {suppliers.map(s => (
                <option key={s.id} value={s.name} />
            ))}
        </datalist>
    )

    const customerDatalist = (
        <datalist id="customer-suggestions">
            {customers.map(c => (
                <option key={c.id} value={c.name} />
            ))}
        </datalist>
    )


    // Get company and customer state codes for GST split
    const companyStateCode = '19'; // Default: West Bengal - should come from settings
    const selectedCustomer = customers.find(c => c.id === sellForm.customerId);
    const customerStateCode = selectedCustomer?.stateCode || companyStateCode;

    // Calculate GST split for sell modal
    const gstSplit = calculateGSTSplit(cartItems, companyStateCode, customerStateCode);

    // Convert total to words
    const amountInWords = numberToWords(Math.round(sellTotal));

    // Generate HSN summary for sell
    const hsnSummary = generateHSNSummary(cartItems);

    // Get supplier state code for purchase GST split
    const selectedSupplier = suppliers.find(s => s.id === addForm.supplierId);
    const supplierStateCode = selectedSupplier?.stateCode || companyStateCode;
    const purchaseGstSplit = calculateGSTSplit(addedItems, companyStateCode, supplierStateCode);
    const purchaseHsnSummary = generateHSNSummary(addedItems);
    const purchaseAmountInWords = numberToWords(Math.round(addTotal));

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
            {supplierDatalist}
            {customerDatalist}

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
                        width: '98%', maxWidth: '1600px', height: '98vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
                        padding: '20px', background: 'var(--bg-dark)', border: '1px solid var(--glass-border)',
                        borderRadius: '24px', boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
                        position: 'relative'
                    }} onClick={(e) => e.stopPropagation()}>

                        <div className="modal-close" onClick={() => setShowPurchaseModal(false)} style={{
                            position: 'absolute', top: '15px', right: '25px', cursor: 'pointer',
                            fontSize: '1.5rem', color: 'var(--text-secondary)', transition: '0.3s', zIndex: 10
                        }}>✕</div>

                        <div className="invoice-header" style={{ flexShrink: 0, marginBottom: '15px' }}>
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
                                    <input className="input" placeholder="Search Supplier" value={addForm.supplierName}
                                        ref={purchaseSupplierRef}
                                        list="supplier-suggestions"
                                        onBlur={() => {
                                            if (addForm.supplierName && !addForm.supplierId) {
                                                const exists = suppliers.find(s => s.name.toLowerCase() === addForm.supplierName.toLowerCase())
                                                if (!exists) {
                                                    setQuickAddType('supplier')
                                                    setQuickAddForm({ name: addForm.supplierName, phone: '', address: '', gstNumber: '' })
                                                    setShowQuickAddModal(true)
                                                } else {
                                                    setAddForm(prev => ({ ...prev, supplierId: exists.id, supplierName: exists.name }))
                                                }
                                            }
                                        }}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            const supplier = suppliers.find(s => s.name === val)
                                            if (supplier) {
                                                setAddForm({ ...addForm, supplierName: supplier.name, supplierId: supplier.id })
                                            } else {
                                                setAddForm({ ...addForm, supplierName: val, supplierId: '' })
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Tab') {
                                                const val = e.target.value.toLowerCase()
                                                const match = suppliers.find(s => s.name.toLowerCase().includes(val))
                                                if (match) {
                                                    e.preventDefault()
                                                    setAddForm(prev => ({ ...prev, supplierName: match.name, supplierId: match.id }))
                                                }
                                            }
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                purchaseItemNameRef.current?.focus()
                                            }
                                        }}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '16px' }}
                                    />
                                </div>
                            </div>

                            <div className="invoice-info-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '12px' }}>
                                <div className="invoice-field">
                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>DELIVERY NOTE</label>
                                    <input className="input" style={{ padding: '6px 8px', fontSize: '0.8rem' }} value={addForm.deliveryNote} onChange={e => setAddForm({ ...addForm, deliveryNote: e.target.value })} />
                                </div>
                                <div className="invoice-field">
                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>PAYMENT TERMS</label>
                                    <input className="input" style={{ padding: '6px 8px', fontSize: '0.8rem' }} value={addForm.paymentTerms} onChange={e => setAddForm({ ...addForm, paymentTerms: e.target.value })} />
                                </div>
                                <div className="invoice-field">
                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>SUPPLIER REF</label>
                                    <input className="input" style={{ padding: '6px 8px', fontSize: '0.8rem' }} value={addForm.supplierRef} onChange={e => setAddForm({ ...addForm, supplierRef: e.target.value })} />
                                </div>
                                <div className="invoice-field">
                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>BUYER ORDER NO</label>
                                    <input className="input" style={{ padding: '6px 8px', fontSize: '0.8rem' }} value={addForm.buyerOrderNo} onChange={e => setAddForm({ ...addForm, buyerOrderNo: e.target.value })} />
                                </div>
                                <div className="invoice-field">
                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>ORDER DATE</label>
                                    <input type="date" className="input" style={{ padding: '6px 8px', fontSize: '0.8rem', colorScheme: 'dark' }} value={addForm.buyerOrderDate} onChange={e => setAddForm({ ...addForm, buyerOrderDate: e.target.value })} />
                                </div>
                                <div className="invoice-field">
                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>DESPATCHED VIA</label>
                                    <input className="input" style={{ padding: '6px 8px', fontSize: '0.8rem' }} value={addForm.despatchedThrough} onChange={e => setAddForm({ ...addForm, despatchedThrough: e.target.value })} />
                                </div>
                                <div className="invoice-field" style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>TERMS OF DELIVERY</label>
                                    <input className="input" style={{ padding: '6px 8px', fontSize: '0.8rem' }} value={addForm.termsOfDelivery} onChange={e => setAddForm({ ...addForm, termsOfDelivery: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="invoice-table-wrapper" style={{ marginBottom: '20px' }}>
                            <table className="table" style={{ width: '100%', tableLayout: 'fixed' }}>
                                <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    <tr>
                                        <th style={{ textAlign: 'center', width: '29%' }}>Product / Description</th>
                                        <th style={{ textAlign: 'center', width: '7%' }}>Size</th>
                                        <th style={{ textAlign: 'center', width: '8%' }}>HSN</th>
                                        <th style={{ textAlign: 'center', width: '6%' }}>Gst(%)</th>
                                        <th style={{ textAlign: 'center', width: '10%' }}>Qty</th>
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
                                            <td style={{ fontWeight: '600', textAlign: 'center', fontSize: '0.85rem' }}>{item.quantity} {item.quantityUnit || 'Pcs'}</td>
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
                                            <input className="input" style={{ padding: '8px 12px', fontSize: '0.9rem', width: '100%' }}
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
                                                <input className="input" style={{ flex: 1, minWidth: '0', padding: '8px 4px 8px 12px', fontSize: '0.9rem', border: 'none', background: 'transparent', textAlign: 'right' }} placeholder="0" value={addItemRow.size}
                                                    onChange={e => setAddItemRow({ ...addItemRow, size: e.target.value })} />
                                                <select className="input" style={{ width: 'auto', padding: '8px 8px 8px 0', fontSize: '0.9rem', border: 'none', background: 'transparent', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', cursor: 'pointer', textAlign: 'left' }} value={addItemRow.sizeUnit}
                                                    onChange={e => setAddItemRow({ ...addItemRow, sizeUnit: e.target.value })}>
                                                    <option value="mm" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>mm</option>
                                                    <option value="cm" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>cm</option>
                                                    <option value="in" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>in</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input className="input" style={{ padding: '8px', width: '80px', fontSize: '0.9rem' }} value={addItemRow.hsn}
                                                onChange={e => setAddItemRow({ ...addItemRow, hsn: e.target.value })} />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input className="input" style={{ padding: '8px', width: '60px', textAlign: 'center', fontSize: '0.9rem' }} placeholder="GST%" type="number" value={addItemRow.gst}
                                                onChange={e => setAddItemRow({ ...addItemRow, gst: e.target.value })} />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 55px', alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '14px', overflow: 'hidden', width: '100%' }}>
                                                <input className="input" style={{ width: '100%', minWidth: '0', padding: '10px 5px', textAlign: 'center', fontSize: '0.85rem', border: 'none', background: 'transparent', borderRadius: 0 }} placeholder="0" type="number"
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
                                                <select className="input" style={{ width: '100%', padding: '10px 0', fontSize: '0.75rem', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'center', color: 'var(--text-primary)', borderRadius: 0 }}
                                                    value={addItemRow.quantityUnit} onChange={e => setAddItemRow({ ...addItemRow, quantityUnit: e.target.value })}>
                                                    <option value="Pcs" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>Pcs</option>
                                                    <option value="Set" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>Set</option>
                                                    <option value="Box" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>Box</option>
                                                    <option value="Dzn" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>Dzn</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input className="input" style={{ padding: '8px', width: '100%', textAlign: 'center', fontSize: '1rem', fontWeight: 'bold' }} placeholder="0.00" type="number"
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
                                            <input className="input" style={{ padding: '8px', width: '60px', textAlign: 'center', fontSize: '0.8rem' }} placeholder="%" type="number"
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

                        {/* HSN Summary Section for Purchase */}
                        {addedItems.length > 0 && (
                            <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '15px' }}>HSN / Tax Summary</h4>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                            <th style={{ textAlign: 'left', padding: '8px' }}>HSN/SAC</th>
                                            <th style={{ textAlign: 'right', padding: '8px' }}>Taxable Value</th>
                                            {purchaseGstSplit.type === 'CGST/SGST' ? (
                                                <>
                                                    <th style={{ textAlign: 'right', padding: '8px' }}>CGST</th>
                                                    <th style={{ textAlign: 'right', padding: '8px' }}>SGST</th>
                                                </>
                                            ) : (
                                                <th style={{ textAlign: 'right', padding: '8px' }}>IGST</th>
                                            )}
                                            <th style={{ textAlign: 'right', padding: '8px' }}>Total Tax</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {purchaseHsnSummary.map((sum, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '8px' }}>{sum.hsn}</td>
                                                <td style={{ textAlign: 'right', padding: '8px' }}>${sum.taxableValue.toFixed(2)}</td>
                                                {purchaseGstSplit.type === 'CGST/SGST' ? (
                                                    <>
                                                        <td style={{ textAlign: 'right', padding: '8px' }}>${(sum.totalTax / 2).toFixed(2)}</td>
                                                        <td style={{ textAlign: 'right', padding: '8px' }}>${(sum.totalTax / 2).toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <td style={{ textAlign: 'right', padding: '8px' }}>${sum.totalTax.toFixed(2)}</td>
                                                )}
                                                <td style={{ textAlign: 'right', padding: '8px', fontWeight: '700' }}>${sum.totalTax.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="invoice-total-overview" style={{
                            display: 'flex', flexDirection: 'column', gap: '20px', padding: '30px',
                            background: 'rgba(0,0,0,0.3)', borderRadius: '24px', border: '1px solid var(--glass-border)',
                            marginTop: '20px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '80px' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>Taxable Purchase</p>
                                    <p style={{ fontSize: '1.6rem', fontWeight: '800' }}>${addSubtotal.toFixed(2)}</p>
                                </div>

                                {purchaseGstSplit.type === 'CGST/SGST' ? (
                                    <>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>CGST</p>
                                            <p style={{ fontSize: '1.4rem', fontWeight: '700' }}>${purchaseGstSplit.cgst.toFixed(2)}</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>SGST</p>
                                            <p style={{ fontSize: '1.4rem', fontWeight: '700' }}>${purchaseGstSplit.sgst.toFixed(2)}</p>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>IGST</p>
                                        <p style={{ fontSize: '1.4rem', fontWeight: '700' }}>${purchaseGstSplit.igst.toFixed(2)}</p>
                                    </div>
                                )}

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

                            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '5px' }}>Amount in Words</p>
                                <p style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: '600', fontStyle: 'italic' }}>{purchaseAmountInWords}</p>
                            </div>
                        </div>

                        {advanceSection}

                        <div className="modal-actions" style={{ marginTop: '50px', display: 'flex', justifyContent: 'flex-end', gap: '20px' }}>
                            <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.05)', padding: '18px 40px', color: 'var(--text-secondary)' }} onClick={() => setShowPurchaseModal(false)}>Discard Action</button>
                            <button type="submit" className="btn" style={{ background: 'var(--accent)', color: 'var(--bg-deep)', padding: '18px 50px', boxShadow: '0 10px 30px rgba(142, 182, 155, 0.2)' }} onClick={handlePurchaseItem}>Record Purchase Bill</button>
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
                        width: '98%', maxWidth: '1600px', height: '98vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
                        padding: '20px', background: 'var(--bg-dark)', border: '1px solid var(--glass-border)',
                        borderRadius: '24px', boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
                        position: 'relative'
                    }} onClick={(e) => e.stopPropagation()}>

                        <div className="modal-close" onClick={() => setShowSellModal(false)} style={{
                            position: 'absolute', top: '15px', right: '25px', cursor: 'pointer',
                            fontSize: '1.5rem', color: 'var(--text-secondary)', transition: '0.3s', zIndex: 10
                        }}>✕</div>

                        <div className="invoice-header" style={{ flexShrink: 0, marginBottom: '15px' }}>
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
                                    <input className="input" placeholder="Search Customer" value={sellForm.customerName}
                                        ref={sellCustomerRef}
                                        list="customer-suggestions"
                                        onBlur={() => {
                                            if (sellForm.customerName && !sellForm.customerId) {
                                                const exists = customers.find(c => c.name.toLowerCase() === sellForm.customerName.toLowerCase())
                                                if (!exists) {
                                                    setQuickAddType('customer')
                                                    setQuickAddForm({ name: sellForm.customerName, phone: '', address: '', gstNumber: '' })
                                                    setShowQuickAddModal(true)
                                                } else {
                                                    setSellForm(prev => ({ ...prev, customerId: exists.id, customerName: exists.name }))
                                                }
                                            }
                                        }}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            const customer = customers.find(c => c.name === val)
                                            if (customer) {
                                                setSellForm({ ...sellForm, customerName: customer.name, customerId: customer.id })
                                            } else {
                                                setSellForm({ ...sellForm, customerName: val, customerId: '' })
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Tab') {
                                                const val = e.target.value.toLowerCase()
                                                const match = customers.find(c => c.name.toLowerCase().includes(val))
                                                if (match) {
                                                    e.preventDefault()
                                                    setSellForm(prev => ({ ...prev, customerName: match.name, customerId: match.id }))
                                                }
                                            }
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                sellItemNameRef.current?.focus()
                                            }
                                        }}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '16px' }}
                                    />
                                </div>
                            </div>

                            {/* Transaction Fields - Compact Layout */}
                            <div className="invoice-info-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '12px' }}>
                                <div className="invoice-field">
                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>DELIVERY NOTE</label>
                                    <input className="input" style={{ padding: '6px 8px', fontSize: '0.8rem' }} value={sellForm.deliveryNote} onChange={e => setSellForm({ ...sellForm, deliveryNote: e.target.value })} />
                                </div>
                                <div className="invoice-field">
                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>PAYMENT TERMS</label>
                                    <input className="input" style={{ padding: '6px 8px', fontSize: '0.8rem' }} value={sellForm.paymentTerms} onChange={e => setSellForm({ ...sellForm, paymentTerms: e.target.value })} />
                                </div>
                                <div className="invoice-field">
                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>SUPPLIER REF</label>
                                    <input className="input" style={{ padding: '6px 8px', fontSize: '0.8rem' }} value={sellForm.supplierRef} onChange={e => setSellForm({ ...sellForm, supplierRef: e.target.value })} />
                                </div>
                                <div className="invoice-field">
                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>BUYER ORDER NO</label>
                                    <input className="input" style={{ padding: '6px 8px', fontSize: '0.8rem' }} value={sellForm.buyerOrderNo} onChange={e => setSellForm({ ...sellForm, buyerOrderNo: e.target.value })} />
                                </div>
                                <div className="invoice-field">
                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>ORDER DATE</label>
                                    <input type="date" className="input" style={{ padding: '6px 8px', fontSize: '0.8rem', colorScheme: 'dark' }} value={sellForm.buyerOrderDate} onChange={e => setSellForm({ ...sellForm, buyerOrderDate: e.target.value })} />
                                </div>
                                <div className="invoice-field">
                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>DESPATCHED VIA</label>
                                    <input className="input" style={{ padding: '6px 8px', fontSize: '0.8rem' }} value={sellForm.despatchedThrough} onChange={e => setSellForm({ ...sellForm, despatchedThrough: e.target.value })} />
                                </div>
                                <div className="invoice-field" style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>TERMS OF DELIVERY</label>
                                    <input className="input" style={{ padding: '6px 8px', fontSize: '0.8rem' }} value={sellForm.termsOfDelivery} onChange={e => setSellForm({ ...sellForm, termsOfDelivery: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="invoice-table-wrapper" style={{ marginBottom: '20px' }}>
                            <table className="table" style={{ width: '100%', tableLayout: 'fixed' }}>
                                <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    <tr>
                                        <th style={{ textAlign: 'center', width: '29%' }}>Product / Description</th>
                                        <th style={{ textAlign: 'center', width: '7%' }}>Size</th>
                                        <th style={{ textAlign: 'center', width: '8%' }}>HSN</th>
                                        <th style={{ textAlign: 'center', width: '6%' }}>Gst(%)</th>
                                        <th style={{ textAlign: 'center', width: '10%' }}>Qty</th>
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
                                                        <option value="mm" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>mm</option>
                                                        <option value="cm" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>cm</option>
                                                        <option value="in" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>in</option>
                                                    </select>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <select className="input" style={{ padding: '8px', width: '70px', fontSize: '0.8rem' }} value={item.hsn} onChange={e => updateCartItem(item.productId, 'hsn', e.target.value)}>
                                                    {hsnCodes.map(code => <option key={code} value={code} style={{ background: 'var(--bg-deep)' }}>{code}</option>)}
                                                </select>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{item.gst}%</td>
                                            <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>{item.quantity} {item.quantityUnit || 'Pcs'}</td>
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
                                                    <option style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>mm</option>
                                                    <option style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>cm</option>
                                                    <option style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>in</option>
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
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 55px', alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '14px', overflow: 'hidden', width: '100%' }}>
                                                <input className="input" style={{ width: '100%', minWidth: '0', padding: '10px 5px', textAlign: 'center', fontSize: '0.85rem', border: 'none', background: 'transparent', borderRadius: 0 }} placeholder="0" type="number"
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
                                                <select className="input" style={{ width: '100%', padding: '10px 0', fontSize: '0.75rem', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'center', color: 'var(--text-primary)', borderRadius: 0 }}
                                                    value={sellItemInput.quantityUnit} onChange={e => setSellItemInput({ ...sellItemInput, quantityUnit: e.target.value })}>
                                                    <option value="Pcs" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>Pcs</option>
                                                    <option value="Set" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>Set</option>
                                                    <option value="Box" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>Box</option>
                                                    <option value="Dzn" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>Dzn</option>
                                                </select>
                                            </div>
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
                            {/* HSN Summary Section */}
                            {cartItems.length > 0 && (
                                <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                    <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '15px' }}>HSN / Tax Summary</h4>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                                <th style={{ textAlign: 'left', padding: '8px' }}>HSN/SAC</th>
                                                <th style={{ textAlign: 'right', padding: '8px' }}>Taxable Value</th>
                                                {gstSplit.type === 'CGST/SGST' ? (
                                                    <>
                                                        <th style={{ textAlign: 'right', padding: '8px' }}>CGST</th>
                                                        <th style={{ textAlign: 'right', padding: '8px' }}>SGST</th>
                                                    </>
                                                ) : (
                                                    <th style={{ textAlign: 'right', padding: '8px' }}>IGST</th>
                                                )}
                                                <th style={{ textAlign: 'right', padding: '8px' }}>Total Tax</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {hsnSummary.map((sum, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '8px' }}>{sum.hsn}</td>
                                                    <td style={{ textAlign: 'right', padding: '8px' }}>${sum.taxableValue.toFixed(2)}</td>
                                                    {gstSplit.type === 'CGST/SGST' ? (
                                                        <>
                                                            <td style={{ textAlign: 'right', padding: '8px' }}>${(sum.totalTax / 2).toFixed(2)}</td>
                                                            <td style={{ textAlign: 'right', padding: '8px' }}>${(sum.totalTax / 2).toFixed(2)}</td>
                                                        </>
                                                    ) : (
                                                        <td style={{ textAlign: 'right', padding: '8px' }}>${sum.totalTax.toFixed(2)}</td>
                                                    )}
                                                    <td style={{ textAlign: 'right', padding: '8px', fontWeight: '700' }}>${sum.totalTax.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="invoice-total-overview" style={{
                            display: 'flex', flexDirection: 'column', gap: '20px', padding: '30px',
                            background: 'rgba(0,0,0,0.3)', borderRadius: '24px', border: '1px solid var(--glass-border)',
                            marginTop: '20px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '80px' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>Taxable Sales</p>
                                    <p style={{ fontSize: '1.6rem', fontWeight: '800' }}>${sellSubtotal.toFixed(2)}</p>
                                </div>

                                {gstSplit.type === 'CGST/SGST' ? (
                                    <>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>CGST</p>
                                            <p style={{ fontSize: '1.4rem', fontWeight: '700' }}>${gstSplit.cgst.toFixed(2)}</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>SGST</p>
                                            <p style={{ fontSize: '1.4rem', fontWeight: '700' }}>${gstSplit.sgst.toFixed(2)}</p>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>IGST</p>
                                        <p style={{ fontSize: '1.4rem', fontWeight: '700' }}>${gstSplit.igst.toFixed(2)}</p>
                                    </div>
                                )}

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

                            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '5px' }}>Amount in Words</p>
                                <p style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: '600', fontStyle: 'italic' }}>{amountInWords}</p>
                            </div>
                        </div>

                        {advanceSection}

                        <div className="modal-actions" style={{ marginTop: '50px', display: 'flex', justifyContent: 'flex-end', gap: '20px' }}>
                            <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.05)', padding: '18px 40px', color: 'var(--text-secondary)' }} onClick={() => setShowSellModal(false)}>Discard Action</button>
                            <button type="submit" className="btn" style={{ background: 'var(--accent)', color: 'var(--bg-deep)', padding: '18px 50px', boxShadow: '0 10px 30px rgba(142, 182, 155, 0.2)' }} onClick={handleSellItem}>Issue Tax Invoice</button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Quick Add Party Modal */}
            {
                showQuickAddModal && (
                    <div className="modal-overlay" style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(5, 31, 32, 0.9)', backdropFilter: 'blur(12px)',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000,
                        animation: 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} onClick={() => setShowQuickAddModal(false)}>
                        <div className="modal glass" style={{
                            width: '95%', maxWidth: '600px', display: 'flex', flexDirection: 'column',
                            padding: '30px', background: 'var(--bg-dark)', border: '1px solid var(--glass-border)',
                            borderRadius: '24px', boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
                            position: 'relative'
                        }} onClick={(e) => e.stopPropagation()}>

                            <div className="modal-close" onClick={() => setShowQuickAddModal(false)} style={{
                                position: 'absolute', top: '15px', right: '25px', cursor: 'pointer',
                                fontSize: '1.5rem', color: 'var(--text-secondary)', transition: '0.3s'
                            }}>✕</div>

                            <h2 style={{ color: 'var(--text-primary)', marginBottom: '30px', fontSize: '1.8rem', fontWeight: '900' }}>
                                Add New {quickAddType === 'customer' ? 'Customer' : 'Supplier'}
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Name *</label>
                                    <input className="input" style={{ width: '100%', padding: '12px' }}
                                        value={quickAddForm.name}
                                        onChange={e => setQuickAddForm({ ...quickAddForm, name: e.target.value })}
                                        placeholder="Business or Person Name"
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                                            Phone {quickAddType === 'customer' ? '*' : '(Optional)'}
                                        </label>
                                        <input className="input" style={{ width: '100%', padding: '12px' }}
                                            value={quickAddForm.phone}
                                            onChange={e => setQuickAddForm({ ...quickAddForm, phone: e.target.value })}
                                            placeholder="Contact Number"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>GST Number</label>
                                        <input className="input" style={{ width: '100%', padding: '12px' }}
                                            value={quickAddForm.gstNumber}
                                            onChange={e => setQuickAddForm({ ...quickAddForm, gstNumber: e.target.value })}
                                            placeholder="Optional"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Address</label>
                                    <textarea className="input" style={{ width: '100%', padding: '12px', minHeight: '80px', resize: 'vertical' }}
                                        value={quickAddForm.address}
                                        onChange={e => setQuickAddForm({ ...quickAddForm, address: e.target.value })}
                                        placeholder="Full Address (Optional)"
                                    />
                                </div>
                            </div>

                            <div className="modal-actions" style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                                <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 30px' }} onClick={() => setShowQuickAddModal(false)}>Cancel</button>
                                <button className="btn" style={{ background: 'var(--accent)', color: 'var(--bg-deep)', padding: '12px 40px' }} onClick={handleQuickAdd}>Save & Select</button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Success & Print Modal */}
            {
                showSuccessModal && lastSaleData && (
                    <div className="modal-overlay" style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(5, 31, 32, 0.95)', backdropFilter: 'blur(20px)',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000
                    }}>
                        <div className="modal glass" style={{
                            width: '90%', maxWidth: '500px', padding: '40px', textAlign: 'center',
                            background: 'var(--bg-dark)', borderRadius: '32px', border: '1px solid var(--glass-border)'
                        }}>
                            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✅</div>
                            <h2 style={{ fontSize: '2rem', marginBottom: '10px', fontWeight: '900' }}>Sale Successful!</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
                                Invoice No: <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{lastSaleData.invoiceNumber}</span> has been generated successfully.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <button className="btn" style={{ background: 'var(--accent)', color: 'var(--bg-deep)', padding: '20px', fontWeight: '800' }} onClick={handlePrint}>
                                    🖨️ Print Invoice
                                </button>
                                <button className="btn" style={{ background: 'var(--accent)', color: 'var(--bg-deep)', padding: '20px', fontWeight: '800' }} onClick={() => handleDownloadPDF('sale')}>
                                    📥 Download PDF
                                </button>
                                <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', padding: '15px' }} onClick={() => setShowSuccessModal(false)}>
                                    Proceed to New Sale
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            {/* Purchase Success & Print Modal */}
            {
                showPurchaseSuccessModal && lastPurchaseData && (
                    <div className="modal-overlay" style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(5, 31, 32, 0.95)', backdropFilter: 'blur(20px)',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000
                    }}>
                        <div className="modal glass" style={{
                            width: '90%', maxWidth: '500px', padding: '40px', textAlign: 'center',
                            background: 'var(--bg-dark)', borderRadius: '32px', border: '1px solid var(--glass-border)'
                        }}>
                            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✅</div>
                            <h2 style={{ fontSize: '2rem', marginBottom: '10px', fontWeight: '900' }}>Purchase Recorded!</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
                                Bill No: <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{lastPurchaseData.invoiceNumber}</span> has been saved.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <button className="btn" style={{ background: 'var(--accent)', color: 'var(--bg-deep)', padding: '20px', fontWeight: '800' }} onClick={handlePrint}>
                                    🖨️ Print Bill
                                </button>
                                <button className="btn" style={{ background: 'var(--accent)', color: 'var(--bg-deep)', padding: '20px', fontWeight: '800' }} onClick={() => handleDownloadPDF('purchase')}>
                                    📥 Download PDF
                                </button>
                                <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', padding: '15px' }} onClick={() => setShowPurchaseSuccessModal(false)}>
                                    Record New Purchase
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            {/* Hidden Print Template for Purchase */}
            <div id="invoice-print-template" style={{ display: 'none' }}>
                {/* Render either Sale or Purchase template depending on what's active/available */}
                {(showSuccessModal && lastSaleData) ? (
                    <InvoiceTemplate sale={lastSaleData} customer={lastSaleData?.customer} />
                ) : (showPurchaseSuccessModal && lastPurchaseData) ? (
                    <InvoiceTemplate sale={lastPurchaseData} customer={lastPurchaseData?.customer} />
                ) : null}
            </div>
        </div>
    )
}

export default SellPurchase
