import { useState, useEffect } from 'react'
import api from '../utils/api'
import './POS.css'

function POS() {
    const [products, setProducts] = useState([])
    const [customers, setCustomers] = useState([])
    const [cart, setCart] = useState([])
    const [search, setSearch] = useState('')
    const [selectedCustomer, setSelectedCustomer] = useState(null)
    const [paymentMode, setPaymentMode] = useState('full')
    const [discountPercent, setDiscountPercent] = useState(0)
    const [taxPercent, setTaxPercent] = useState(10)
    const [amountPaid, setAmountPaid] = useState('')
    const [salesChannel, setSalesChannel] = useState('in-store')
    const [customerEmail, setCustomerEmail] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [shippingAddress, setShippingAddress] = useState('')
    const [shippingMethod, setShippingMethod] = useState('')
    const [trackingNumber, setTrackingNumber] = useState('')
    const [notes, setNotes] = useState('')

    useEffect(() => {
        fetchProducts()
        fetchCustomers()
    }, [])

    const fetchProducts = async () => {
        const response = await api.get('/products')
        setProducts(response.data)
    }

    const fetchCustomers = async () => {
        const response = await api.get('/customers')
        setCustomers(response.data)
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
    )

    const addToCart = (product) => {
        const existing = cart.find(item => item.productId === product.id)
        if (existing) {
            if (existing.quantity >= product.stock) {
                alert(`Only ${product.stock} units available in stock`)
                return
            }
            setCart(cart.map(item =>
                item.productId === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ))
        } else {
            setCart([...cart, {
                productId: product.id,
                name: product.name,
                price: product.sellingPrice,
                quantity: 1,
                stock: product.stock,
                batchNumber: '',
                serialNumber: ''
            }])
        }
    }

    const updateQuantity = (productId, quantity) => {
        if (quantity <= 0) {
            setCart(cart.filter(item => item.productId !== productId))
        } else {
            const item = cart.find(i => i.productId === productId)
            if (quantity > item.stock) {
                alert(`Only ${item.stock} units available`)
                return
            }
            setCart(cart.map(item =>
                item.productId === productId ? { ...item, quantity } : item
            ))
        }
    }

    const updateItemField = (productId, field, value) => {
        setCart(cart.map(item =>
            item.productId === productId ? { ...item, [field]: value } : item
        ))
    }

    // Calculations
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const discountAmount = subtotal * (discountPercent / 100)
    const taxableAmount = subtotal - discountAmount
    const tax = taxableAmount * (taxPercent / 100)
    const total = taxableAmount + tax

    const paidAmount = paymentMode === 'credit' ? 0 : (parseFloat(amountPaid) || 0)
    const remainingAmount = total - paidAmount

    const handleCheckout = async () => {
        if (cart.length === 0) return alert('Cart is empty')

        if (paymentMode === 'full' && paidAmount < total) {
            return alert('Please enter the full payment amount')
        }

        if (paymentMode === 'partial' && paidAmount <= 0) {
            return alert('Please enter partial payment amount')
        }

        try {
            const actualPaymentMode = paymentMode === 'full' ? 'cash' : paymentMode

            const saleData = {
                items: cart.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    batchNumber: item.batchNumber,
                    serialNumber: item.serialNumber
                })),
                customerId: selectedCustomer,
                paymentMode: actualPaymentMode,
                discount: discountAmount,
                amountPaid: paymentMode === 'credit' ? 0 : paidAmount,
                salesChannel,
                customerEmail,
                customerPhone,
                shippingAddress,
                shippingMethod,
                trackingNumber,
                notes
            }

            const response = await api.post('/sales', saleData)
            alert(`Sale completed! Invoice: ${response.data.invoiceNumber}`)
            setCart([])
            setDiscountPercent(0)
            setTaxPercent(10)
            setAmountPaid('')
            setPaymentMode('full')
            setCustomerEmail('')
            setCustomerPhone('')
            setShippingAddress('')
            setShippingMethod('')
            setTrackingNumber('')
            setNotes('')
            fetchProducts()
        } catch (error) {
            alert(error.response?.data?.error || 'Error processing sale')
        }
    }

    return (
        <div className="pos-page">
            <h1 className="page-title">Point of Sale</h1>

            <div className="pos-layout">
                <div className="pos-left">
                    <input
                        className="input search-input"
                        placeholder="🔍 Search products by name or SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <div className="products-grid">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="product-card glass" onClick={() => addToCart(product)}>
                                <h3>{product.name}</h3>
                                <p className="product-sku">{product.sku}</p>
                                <p className="product-price">${product.sellingPrice}</p>
                                <p className="product-stock">Stock: {product.stock}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pos-right">
                    <div className="cart-section glass">
                        <h2>Cart</h2>

                        <div className="form-section">
                            <label>Customer</label>
                            <select className="input" value={selectedCustomer || ''} onChange={(e) => setSelectedCustomer(e.target.value || null)}>
                                <option value="">Walk-in Customer</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="form-section">
                            <label>Sales Channel</label>
                            <select className="input" value={salesChannel} onChange={(e) => setSalesChannel(e.target.value)}>
                                <option value="in-store">In-Store</option>
                                <option value="website">Website</option>
                                <option value="amazon">Amazon</option>
                                <option value="wholesale">Wholesale</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="cart-items">
                            {cart.length === 0 ? (
                                <div className="empty-cart">No items in cart</div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.productId} className="cart-item-detailed">
                                        <div className="cart-item-header">
                                            <div>
                                                <p className="cart-item-name">{item.name}</p>
                                                <p className="cart-item-price">${item.price} × {item.quantity} = ${(item.price * item.quantity).toFixed(2)}</p>
                                            </div>
                                            <div className="cart-item-controls">
                                                <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}>-</button>
                                                <span>{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</button>
                                            </div>
                                        </div>
                                        <div className="cart-item-tracking">
                                            <input
                                                className="input-small"
                                                placeholder="Batch #"
                                                value={item.batchNumber}
                                                onChange={(e) => updateItemField(item.productId, 'batchNumber', e.target.value)}
                                            />
                                            <input
                                                className="input-small"
                                                placeholder="Serial #"
                                                value={item.serialNumber}
                                                onChange={(e) => updateItemField(item.productId, 'serialNumber', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="form-section">
                            <label>Tax %</label>
                            <input
                                type="number"
                                step="0.1"
                                className="input"
                                placeholder="10"
                                value={taxPercent}
                                onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                            />
                        </div>

                        <div className="form-section">
                            <label>Discount %</label>
                            <input
                                type="number"
                                step="0.1"
                                className="input"
                                placeholder="0"
                                value={discountPercent}
                                onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                            />
                        </div>

                        <div className="form-section">
                            <label>Payment Method *</label>
                            <select className="input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                                <option value="full">Full Payment</option>
                                <option value="credit">Credit (Pay Later)</option>
                                <option value="partial">Partial Payment</option>
                            </select>
                        </div>

                        {paymentMode !== 'credit' && (
                            <div className="form-section">
                                <label>Amount Paid *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="input"
                                    placeholder="0.00"
                                    value={amountPaid}
                                    onChange={(e) => setAmountPaid(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <div className="form-section">
                            <label>Customer Contact (Optional)</label>
                            <input className="input" placeholder="Email" value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)} />
                            <input className="input" placeholder="Phone" value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)} />
                        </div>

                        {salesChannel !== 'in-store' && (
                            <>
                                <div className="form-section">
                                    <label>Shipping Address</label>
                                    <textarea className="input" rows="2" placeholder="Delivery address..." value={shippingAddress}
                                        onChange={(e) => setShippingAddress(e.target.value)} />
                                </div>

                                <div className="form-section">
                                    <label>Shipping Details</label>
                                    <input className="input" placeholder="Shipping Method (e.g., FedEx)" value={shippingMethod}
                                        onChange={(e) => setShippingMethod(e.target.value)} />
                                    <input className="input" placeholder="Tracking Number" value={trackingNumber}
                                        onChange={(e) => setTrackingNumber(e.target.value)} />
                                </div>
                            </>
                        )}

                        <div className="form-section">
                            <label>Notes</label>
                            <textarea className="input" rows="2" placeholder="Additional notes..." value={notes}
                                onChange={(e) => setNotes(e.target.value)} />
                        </div>

                        <div className="cart-totals">
                            <div className="total-row">
                                <span>Subtotal:</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="total-row">
                                <span>Discount ({discountPercent}%):</span>
                                <span>-${discountAmount.toFixed(2)}</span>
                            </div>
                            <div className="total-row">
                                <span>Tax ({taxPercent}%):</span>
                                <span>${tax.toFixed(2)}</span>
                            </div>
                            <div className="total-row total-final">
                                <span>Total:</span>
                                <span>${total.toFixed(2)}</span>
                            </div>
                            {paymentMode === 'partial' && amountPaid && (
                                <>
                                    <div className="total-row payment-row">
                                        <span>Amount Paid:</span>
                                        <span>${paidAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="total-row remaining-row">
                                        <span>Remaining:</span>
                                        <span>${remainingAmount.toFixed(2)}</span>
                                    </div>
                                </>
                            )}
                            {paymentMode === 'credit' && (
                                <div className="total-row credit-row">
                                    <span>Credit Amount:</span>
                                    <span>${total.toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        <button className="btn btn-primary checkout-btn" onClick={handleCheckout}>
                            Complete Sale
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default POS
