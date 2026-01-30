import { useState, useEffect } from 'react'
import api from '../utils/api'
import './Inventory.css' // Reusing inventory styles for standard look

function Database() {
    const [activeTab, setActiveTab] = useState('sales')
    const [invoices, setInvoices] = useState([])
    const [loading, setLoading] = useState(true)

    // For Bill Details Modal
    const [selectedInvoice, setSelectedInvoice] = useState(null)
    const [showInvoiceModal, setShowInvoiceModal] = useState(false)

    // Helper for dd:mm:yyyy date format
    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        const date = new Date(dateStr)
        const d = String(date.getDate()).padStart(2, '0')
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const y = date.getFullYear()
        return `${d}-${m}-${y}`
    }

    useEffect(() => {
        setInvoices([])
        if (activeTab === 'sales') fetchSales()
        if (activeTab === 'purchases') fetchPurchases()
    }, [activeTab])

    const fetchSales = async () => {
        setLoading(true)
        try {
            const res = await api.get('/sales')
            const salesData = res.data.map(s => ({
                id: s.id,
                date: s.createdAt,
                invoiceNumber: s.invoiceNumber,
                partyName: s.Customer?.name || 'Walk-in',
                type: 'SALE',
                total: s.total,
                subtotal: s.subtotal,
                tax: s.tax,
                discount: s.discount,
                amountDue: s.amountDue,
                items: s.SaleItems
            })).sort((a, b) => new Date(b.date) - new Date(a.date))
            setInvoices(salesData)
        } catch (error) {
            console.error('Error fetching sales:', error)
            setInvoices([])
        } finally {
            setLoading(false)
        }
    }

    const fetchPurchases = async () => {
        setLoading(true)
        try {
            const res = await api.get('/purchases')
            const purchasesMap = {}
            res.data.forEach(p => {
                const inv = p.invoiceNumber
                if (!purchasesMap[inv]) {
                    purchasesMap[inv] = {
                        id: `P-${inv}`,
                        date: p.receivedDate,
                        invoiceNumber: inv,
                        partyName: p.Supplier?.name || 'Unknown',
                        type: 'PURCHASE',
                        total: 0,
                        items: []
                    }
                }
                purchasesMap[inv].total += parseFloat(p.totalCost)
                purchasesMap[inv].items.push({
                    Product: { name: p.Product?.name || 'Unknown' },
                    quantity: p.quantityReceived,
                    price: p.unitCost,
                    total: p.totalCost
                })
            })
            setInvoices(Object.values(purchasesMap).sort((a, b) => new Date(b.date) - new Date(a.date)))
        } catch (error) {
            console.error('Error fetching purchases:', error)
            setInvoices([])
        } finally {
            setLoading(false)
        }
    }

    const openInvoiceDetails = (invoice) => {
        setSelectedInvoice(invoice)
        setShowInvoiceModal(true)
    }

    return (
        <div className="inventory-page">
            <div className="page-header">
                <h1 className="page-title">Master Records</h1>
                <p className="page-subtitle">Centralized history of all sales and purchase vouchers</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: '30px' }}>
                <div
                    className={`stat-card ${activeTab === 'sales' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sales')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(142, 182, 155, 0.1)', color: 'var(--accent)' }}>📊</div>
                    <div className="stat-info">
                        <h3>Sales Ledger</h3>
                        <p className="stat-value">{activeTab === 'sales' ? invoices.length : '--'}</p>
                    </div>
                </div>
                <div
                    className={`stat-card ${activeTab === 'purchases' ? 'active' : ''}`}
                    onClick={() => setActiveTab('purchases')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(78, 205, 196, 0.1)', color: '#4ecdc4' }}>🏛️</div>
                    <div className="stat-info">
                        <h3>Purchase Records</h3>
                        <p className="stat-value">{activeTab === 'purchases' ? invoices.length : '--'}</p>
                    </div>
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <div className="loader" style={{ fontSize: '1.5rem', color: 'var(--accent)' }}>Loading records...</div>
                    </div>
                ) : (
                    <div className="table-container">
                        <h2><span>📂</span> Transaction History</h2>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Voucher No.</th>
                                    <th>Party Name</th>
                                    <th>Amount</th>
                                    <th style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map(inv => (
                                    <tr key={inv.id}>
                                        <td style={{ fontSize: '0.85rem' }}>{formatDate(inv.date)}</td>
                                        <td style={{ fontWeight: '700', letterSpacing: '0.5px' }}>{inv.invoiceNumber}</td>
                                        <td style={{ fontWeight: '600' }}>{inv.partyName}</td>
                                        <td style={{ fontWeight: '800', color: 'var(--accent)' }}>${parseFloat(inv.total).toFixed(2)}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn" style={{ padding: '8px 20px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)' }} onClick={() => openInvoiceDetails(inv)}>
                                                View Bill
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {invoices.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>No records found for the selected category.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Invoice Details Modal */}
            {showInvoiceModal && selectedInvoice && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(5, 31, 32, 0.9)', backdropFilter: 'blur(12px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }} onClick={() => setShowInvoiceModal(false)}>
                    <div className="modal glass" style={{
                        width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflow: 'auto',
                        padding: '40px', background: 'var(--bg-dark)', borderRadius: '32px',
                        border: '1px solid var(--glass-border)'
                    }} onClick={e => e.stopPropagation()}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '35px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '20px' }}>
                            <div>
                                <h2 style={{ color: 'var(--text-primary)', fontSize: '2rem', fontWeight: '900', letterSpacing: '-1px' }}>
                                    {selectedInvoice.type} Voucher Details
                                </h2>
                                <p style={{ color: 'var(--accent)', fontWeight: '700', fontSize: '0.9rem' }}>Ref: {selectedInvoice.invoiceNumber}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700' }}>ENTRY DATE</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: '800' }}>{formatDate(selectedInvoice.date)}</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: '30px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', borderLeft: '4px solid var(--accent)' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', marginBottom: '5px' }}>PARTY NAME</p>
                            <p style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)' }}>{selectedInvoice.partyName}</p>
                        </div>

                        <div className="table-container">
                            <table className="table">
                                <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    <tr>
                                        <th>Item Name</th>
                                        <th>HSN</th>
                                        <th>Qty</th>
                                        <th>Rate</th>
                                        <th>Disc</th>
                                        <th>GST</th>
                                        <th style={{ textAlign: 'right' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedInvoice.items?.map((item, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: '700' }}>{item.Product?.name || 'Unknown Item'}</td>
                                            <td>{item.hsn || '--'}</td>
                                            <td style={{ fontWeight: '600' }}>{item.quantity}</td>
                                            <td>${parseFloat(item.price).toFixed(2)}</td>
                                            <td style={{ color: '#ff4757' }}>{item.discount ? `${parseFloat(item.discount)}%` : '--'}</td>
                                            <td>{item.gst ? `${parseFloat(item.gst)}%` : '--'}</td>
                                            <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--accent)' }}>
                                                ${parseFloat(item.total).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'right', padding: '15px', fontWeight: '700', color: 'var(--text-secondary)' }}>Subtotal</td>
                                        <td style={{ textAlign: 'right', padding: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>${parseFloat(selectedInvoice.total).toFixed(2)}</td>
                                    </tr>
                                    {selectedInvoice.tax > 0 && (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'right', padding: '10px', fontWeight: '600', color: 'var(--text-secondary)' }}>GST Component</td>
                                            <td style={{ textAlign: 'right', padding: '10px', fontWeight: '700' }}>${parseFloat(selectedInvoice.tax).toFixed(2)}</td>
                                        </tr>
                                    )}
                                    <tr style={{ background: 'rgba(142, 182, 155, 0.05)' }}>
                                        <td colSpan="6" style={{ textAlign: 'right', padding: '20px', fontWeight: '900', fontSize: '1.2rem', color: 'var(--accent)' }}>GRAND TOTAL</td>
                                        <td style={{ textAlign: 'right', padding: '20px', fontWeight: '900', fontSize: '1.6rem', color: 'var(--accent)' }}>${parseFloat(selectedInvoice.total).toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn" style={{ background: 'var(--accent)', color: 'var(--bg-deep)', padding: '15px 40px', fontWeight: '800' }} onClick={() => setShowInvoiceModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Database
