import { useState, useEffect } from 'react'
import api from '../utils/api'
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
    const [activeView, setActiveView] = useState('inventory') // 'inventory', 'customers', 'sales'

    useEffect(() => {
        fetchProducts()
        fetchStats()
        fetchCustomers()
    }, [])

    const fetchProducts = async () => {
        const response = await api.get('/products')
        setProducts(response.data)
    }

    const fetchStats = async () => {
        try {
            const productsRes = await api.get('/products')
            const customersRes = await api.get('/customers')
            const salesRes = await api.get('/sales')

            const totalItems = productsRes.data.length
            const totalItemsWorth = productsRes.data.reduce((sum, p) => sum + (p.stock * (p.purchasePrice || 0)), 0)
            const totalCustomers = customersRes.data.length

            let paymentReceived = 0
            let paymentRemaining = 0
            let totalSold = 0

            salesRes.data.forEach(sale => {
                const saleTotal = parseFloat(sale.total || 0)
                totalSold += saleTotal
                paymentReceived += parseFloat(sale.amountPaid || 0)
                paymentRemaining += parseFloat(sale.amountDue || 0)
            })

            setSales(salesRes.data)

            setStats({
                totalItems,
                totalItemsWorth,
                totalSold,
                totalCustomers,
                paymentReceived,
                paymentRemaining
            })
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }

    const fetchCustomers = async () => {
        const response = await api.get('/customers')
        setCustomers(response.data)
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
                        <h3>Inventory Assets</h3>
                        <p className="stat-value">{stats.totalItems}</p>
                        <p className="stat-label" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: '600' }}>
                            Valuation: <span style={{ color: 'var(--accent)' }}>${stats.totalItemsWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
                        <p className="stat-value">{stats.totalCustomers}</p>
                        <p className="stat-label" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: '600' }}>Active Accounts</p>
                    </div>
                </div>

                <div
                    className={`stat-card ${activeView === 'sales' ? 'active' : ''}`}
                    onClick={() => setActiveView('sales')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(255, 159, 67, 0.1)', color: '#ff9f43' }}>📈</div>
                    <div className="stat-info">
                        <h3>Total Sales</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <p className="stat-value" style={{ fontSize: '1.6rem' }}>${stats.totalSold.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: '700' }}>Rec: ${stats.paymentReceived.toFixed(0)}</span>
                                <span style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: '700' }}>Due: ${stats.paymentRemaining.toFixed(0)}</span>
                            </div>
                        </div>
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
                                        <th>Supplier</th>
                                        <th style={{ textAlign: 'center' }}>Qty</th>
                                        <th>Unit Cost</th>
                                        <th style={{ textAlign: 'right' }}>Stock Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(product => (
                                        <tr key={product.id}>
                                            <td><strong style={{ color: 'var(--text-primary)' }}>{product.name}</strong></td>
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
                                            <td>${parseFloat(product.purchasePrice).toFixed(2)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--accent)' }}>
                                                ${(product.stock * product.purchasePrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: 'rgba(142,182,155,0.05)' }}>
                                        <td colSpan="4" style={{ fontWeight: '800', color: 'var(--text-primary)', padding: '25px' }}>Total Inventory Valuation</td>
                                        <td style={{ fontWeight: '900', color: 'var(--accent)', fontSize: '1.4rem', padding: '25px', textAlign: 'right' }}>
                                            ${products.reduce((sum, p) => sum + (p.stock * (p.purchasePrice || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                                        <th>Credit Limit</th>
                                        <th style={{ textAlign: 'right' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.map(customer => (
                                        <tr key={customer.id}>
                                            <td style={{ fontWeight: '700' }}>{customer.name}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{customer.phone}</td>
                                            <td style={{ color: customer.outstandingBalance > 0 ? '#ff4757' : 'var(--accent)', fontWeight: '700' }}>
                                                ${parseFloat(customer.outstandingBalance || 0).toLocaleString()}
                                            </td>
                                            <td>${parseFloat(customer.creditLimit || 0).toLocaleString()}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                {customer.outstandingBalance > customer.creditLimit ? (
                                                    <span className="badge badge-danger">Critical Limit</span>
                                                ) : customer.outstandingBalance > 0 ? (
                                                    <span className="badge badge-warning">Active Aging</span>
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
                                            <td style={{ fontWeight: '800' }}>${parseFloat(sale.total).toLocaleString()}</td>
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
            </div>
        </div>
    )
}

export default Inventory
