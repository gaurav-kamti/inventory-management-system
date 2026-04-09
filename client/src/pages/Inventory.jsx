import { useState, useEffect } from 'react'
import api from '../services/api'
import { formatOverdue } from '../utils/formatters'
import Analytics from './Analytics'
import './Inventory.css'


function Inventory() {
    const [products, setProducts] = useState([])
    const [stats, setStats] = useState({
        totalItems: 0,
        totalItemsWorth: 0,
        totalSold: 0,
        totalCustomers: 0,
        paymentReceived: 0,
        paymentRemaining: 0
    })
    const [customers, setCustomers] = useState([])
    const [sales, setSales] = useState([])
    const [activeView, setActiveView] = useState('inventory') // 'inventory', 'customers', 'sales', 'analytics'
    const [showEditModal, setShowEditModal] = useState(false)
    const [editProduct, setEditProduct] = useState(null)
    const [editForm, setEditForm] = useState({
        name: '',
        purchasePrice: 0,
        sellingPrice: 0,
        stock: 0,
        hsn: '8301',
        gst: 18,
        quantityUnit: 'Pcs',
        size: '',
        sizeUnit: 'mm'
    })

    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, product: null })

    useEffect(() => {
        const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [contextMenu]);

    const handleContextMenu = (e, product) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.pageX,
            y: e.pageY,
            product
        });
    };


    useEffect(() => {
        fetchProducts()
        fetchStats()
        fetchCustomers()
    }, [])

    const fetchProducts = async () => {
        try {
            const response = await api.get('/products')
            setProducts(response.data || [])
        } catch (error) {
            console.error('Error fetching products:', error)
        }
    }

    const fetchStats = async () => {
        try {
            const response = await api.get('/dashboard/stats');
            const s = response.data;
            
            // Set basic stats from optimized endpoint
            setStats(prev => ({
                ...prev,
                totalItems: s?.totalProducts || 0,
                totalItemsWorth: s?.totalInventoryWorth || 0,
                totalCustomers: s?.totalCustomers || 0,
                paymentRemaining: s?.totalOutstanding || 0
            }));

            const salesRes = await api.get('/sales');
            const fullSales = salesRes.data || [];
            const totalSold = fullSales.reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0);
            const totalReceived = fullSales.reduce((sum, sale) => sum + parseFloat(sale.amountPaid || 0), 0);
            const totalDue = fullSales.reduce((sum, sale) => sum + parseFloat(sale.amountDue || 0), 0);

            setSales(fullSales);
            setStats(prev => ({
                ...prev,
                totalSold,
                paymentReceived: totalReceived
            }));

        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers')
            setCustomers(response.data || [])
        } catch (error) {
            console.error('Error fetching customers:', error)
        }
    }

    const handleDeleteProduct = async (id) => {
        if (window.confirm('Are you sure you want to delete this product? This will remove it from the inventory permanently.')) {
            try {
                await api.delete(`/products/${id}`)
                fetchProducts()
                fetchStats()
            } catch (err) {
                alert('Error deleting product')
            }
        }
    }

    const openEditModal = (product) => {
        setEditProduct(product)
        setEditForm({
            name: product.name,
            purchasePrice: product.purchasePrice,
            sellingPrice: product.sellingPrice,
            stock: product.stock,
            hsn: product.hsn || '8301',
            gst: product.gst || 18,
            quantityUnit: product.quantityUnit || 'Pcs',
            size: product.size || '',
            sizeUnit: product.sizeUnit || 'mm'
        })
        setShowEditModal(true)
    }

    const handleUpdateProduct = async (e) => {
        e.preventDefault()
        try {
            await api.put(`/products/${editProduct.id}`, editForm)
            setShowEditModal(false)
            fetchProducts()
            fetchStats()
        } catch (err) {
            alert('Error updating product')
        }
    }

    return (
        <div className="inventory-page">
            <div className="page-header">
                <h1 className="page-title">Business Dashboard</h1>
                <p className="page-subtitle">Real-time enterprise dashboard and asset monitoring</p>
            </div>

            <div className="stats-grid">
                <div
                    className={`stat-card ${activeView === 'inventory' ? 'active' : ''}`}
                    onClick={() => setActiveView('inventory')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(142, 182, 155, 0.1)', color: 'var(--accent)' }}>📦</div>
                    <div className="stat-info">
                        <h3>Inventory</h3>
                        <p className="stat-value" style={{ fontSize: '1.2rem' }}>{stats.totalItems}</p>
                        <p className="stat-label" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: '600' }}>
                            Value: <span style={{ color: 'var(--accent)' }}>₹{stats.totalItemsWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </p>
                    </div>
                </div>

                <div
                    className={`stat-card ${activeView === 'customers' ? 'active' : ''}`}
                    onClick={() => setActiveView('customers')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(78, 205, 196, 0.1)', color: '#4ecdc4' }}>👥</div>
                    <div className="stat-info">
                        <h3>Customers</h3>
                        <p className="stat-value" style={{ fontSize: '1.2rem' }}>{stats.totalCustomers}</p>
                        <p className="stat-label" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: '600' }}>Active Accounts</p>
                    </div>
                </div>


                <div
                    className={`stat-card ${activeView === 'sales' ? 'active' : ''}`}
                    onClick={() => setActiveView('sales')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(255, 159, 67, 0.1)', color: '#ff9f43' }}>📈</div>
                    <div className="stat-info">
                        <h3>Total Sales</h3>
                        <p className="stat-value" style={{ fontSize: '1.2rem' }}>₹{stats.totalSold.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: '700' }}>Received: ₹{stats.paymentReceived.toFixed(0)}</span>
                            <span style={{ fontSize: '0.65rem', color: '#fca5a5', fontWeight: '700' }}>Due: ₹{stats.paymentRemaining.toFixed(0)}</span>
                        </div>
                    </div>
                </div>

                <div
                    className={`stat-card ${activeView === 'analytics' ? 'active' : ''}`}
                    onClick={() => setActiveView('analytics')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>📊</div>
                    <div className="stat-info">
                        <h3>Analytics</h3>
                        <p className="stat-value" style={{ fontSize: '1.2rem' }}>Review</p>
                        <p className="stat-label" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: '600' }}>Insights</p>
                    </div>
                </div>

            </div>


            <div className="dashboard-content">
                {activeView === 'inventory' && (
                    <div className="card">
                        <h2><span>📦</span> Stock List ({products.length})</h2>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Item Name</th>
                                        <th>Size</th>
                                        <th>Supplier</th>
                                        <th style={{ textAlign: 'center' }}>Qty</th>
                                        <th>Unit Cost</th>
                                        <th style={{ textAlign: 'right' }}>Stock Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(product => (
                                        <tr key={product.id} onContextMenu={(e) => handleContextMenu(e, product)} style={{ cursor: 'context-menu' }}>
                                            <td><strong style={{ color: 'var(--text-primary)' }}>{product.name}</strong></td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{product.size || '--'} {product.size ? product.sizeUnit : ''}</td>
                                            <td>{product.Supplier?.name || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Unlinked</span>}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{
                                                    background: product.stock < 10 ? 'rgba(255,71,87,0.1)' : 'rgba(142,182,155,0.1)',
                                                    color: product.stock < 10 ? '#ff4757' : 'var(--accent)',
                                                    padding: '4px 12px',
                                                    borderRadius: '8px',
                                                    fontWeight: '700'
                                                }}>
                                                    {product.stock}
                                                </span>
                                            </td>
                                            <td>₹{parseFloat(product.purchasePrice).toFixed(2)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--accent)' }}>
                                                ₹{(product.stock * product.purchasePrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: 'rgba(142,182,155,0.05)' }}>
                                        <td colSpan="5" style={{ fontWeight: '800', color: 'var(--text-primary)', padding: '25px' }}>Total Inventory Valuation</td>
                                        <td style={{ fontWeight: '900', color: 'var(--accent)', fontSize: '1.4rem', padding: '25px', textAlign: 'right' }}>
                                            ₹{products.reduce((sum, p) => sum + (p.stock * (p.purchasePrice || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {activeView === 'customers' && (
                    <div className="card">
                        <h2><span>👥</span> Customer Ledger</h2>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Customer Name</th>
                                        <th>Contact</th>
                                        <th>Outstanding</th>
                                        <th style={{ textAlign: 'right' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.map(customer => (
                                        <tr key={customer.id}>
                                            <td style={{ fontWeight: '700' }}>{customer.name}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{customer.phone}</td>
                                            <td style={{ color: customer.outstandingBalance > 0 ? '#ff4757' : 'var(--accent)', fontWeight: '700' }}>
                                                ₹{parseFloat(customer.outstandingBalance || 0).toLocaleString()}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                {customer.outstandingBalance > 0 ? (
                                                    <span className="badge badge-warning">
                                                        {formatOverdue(customer.daysOverdue)}
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-success">Account Clear</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeView === 'sales' && (
                    <div className="card">
                        <h2><span>📈</span> Sales Records</h2>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Invoice No.</th>
                                        <th>Customer</th>
                                        <th>Total Amount</th>
                                        <th style={{ textAlign: 'right' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sales.map(sale => (
                                        <tr key={sale.id}>
                                            <td style={{ fontSize: '0.85rem' }}>{new Date(sale.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td style={{ fontWeight: '700', letterSpacing: '0.5px' }}>{sale.invoiceNumber}</td>
                                            <td>{sale.Customer?.name || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Internal / Counter</span>}</td>
                                            <td style={{ fontWeight: '800' }}>₹{parseFloat(sale.total).toLocaleString()}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <span className={`badge ${sale.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                                                    {sale.status === 'completed' ? 'Verified' : 'Pending Verification'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeView === 'analytics' && (
                    <Analytics />
                )}
            </div>

            {/* Context Menu */}
            {contextMenu.visible && (
                <div style={{
                    position: 'absolute', top: contextMenu.y, left: contextMenu.x,
                    background: '#1e293b', border: '1px solid #334155', borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 10000, overflow: 'hidden',
                    minWidth: '150px'
                }}>
                    <div
                        className="context-item"
                        style={{ padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s' }}
                        onClick={() => openEditModal(contextMenu.product)}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <span>✏️</span> Edit
                    </div>
                    <div
                        className="context-item"
                        style={{ padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s', borderTop: '1px solid #334155', color: '#fca5a5' }}
                        onClick={() => handleDeleteProduct(contextMenu.product.id)}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <span>🗑️</span> Delete
                    </div>
                </div>
            )}

            {/* Edit Product Modal */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)} style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(5, 31, 32, 0.9)', backdropFilter: 'blur(12px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000
                }}>
                    <div className="modal glass" onClick={(e) => e.stopPropagation()} style={{
                        width: '95%', maxWidth: '700px', padding: '35px',
                        background: 'var(--bg-dark)', border: '1px solid var(--glass-border)',
                        borderRadius: '24px', boxShadow: '0 50px 100px rgba(0,0,0,0.7)', position: 'relative'
                    }}>
                        <div className="modal-close" onClick={() => setShowEditModal(false)} style={{
                            position: 'absolute', top: '20px', right: '30px', cursor: 'pointer',
                            fontSize: '1.6rem', color: 'var(--text-secondary)'
                        }}>✕</div>

                        <h2 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ fontSize: '2.5rem' }}>🛠️</span> Edit Product Details
                        </h2>

                        <form onSubmit={handleUpdateProduct} style={{ display: 'grid', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Product Name *</label>
                                <input className="input" style={{ width: '100%', padding: '15px' }}
                                    value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Purchase Price (₹) *</label>
                                    <input type="number" step="0.01" className="input" style={{ width: '100%', padding: '15px' }}
                                        value={editForm.purchasePrice} onChange={e => setEditForm({ ...editForm, purchasePrice: e.target.value })} required />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Selling Price (₹) *</label>
                                    <input type="number" step="0.01" className="input" style={{ width: '100%', padding: '15px' }}
                                        value={editForm.sellingPrice} onChange={e => setEditForm({ ...editForm, sellingPrice: e.target.value })} required />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Current Stock Level</label>
                                    <input type="number" className="input" style={{ width: '100%', padding: '15px' }}
                                        value={editForm.stock} onChange={e => setEditForm({ ...editForm, stock: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Unit (e.g. Pcs, Set)</label>
                                    <select className="input" style={{ width: '100%', padding: '15px' }}
                                        value={editForm.quantityUnit} onChange={e => setEditForm({ ...editForm, quantityUnit: e.target.value })}>
                                        <option value="Pcs">Pcs</option>
                                        <option value="Set">Set</option>
                                        <option value="Box">Box</option>
                                        <option value="Dzn">Dzn</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Size (Dimensions)</label>
                                    <input className="input" placeholder="e.g. 50, 4.5, Large" style={{ width: '100%', padding: '15px' }}
                                        value={editForm.size} onChange={e => setEditForm({ ...editForm, size: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Size Unit</label>
                                    <select className="input" style={{ width: '100%', padding: '15px' }}
                                        value={editForm.sizeUnit} onChange={e => setEditForm({ ...editForm, sizeUnit: e.target.value })}>
                                        <option value="mm">mm</option>
                                        <option value="cm">cm</option>
                                        <option value="inches">inches</option>
                                        <option value="Meter">Meter</option>
                                        <option value="--">None</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>HSN Code</label>
                                    <input className="input" style={{ width: '100%', padding: '15px' }}
                                        value={editForm.hsn} onChange={e => setEditForm({ ...editForm, hsn: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>GST (%)</label>
                                    <select className="input" style={{ width: '100%', padding: '15px' }}
                                        value={editForm.gst} onChange={e => setEditForm({ ...editForm, gst: e.target.value })}>
                                        <option value="18">18% (Standard)</option>
                                        <option value="12">12%</option>
                                        <option value="5">5%</option>
                                        <option value="28">28%</option>
                                        <option value="0">0% (Exempt)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="modal-actions" style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '20px' }}>
                                <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.05)', padding: '15px 40px' }} onClick={() => setShowEditModal(false)}>Cancel</button>
                                <button type="submit" className="btn" style={{ background: 'var(--accent)', color: 'var(--bg-deep)', padding: '15px 50px', fontWeight: '900' }}>Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Inventory
