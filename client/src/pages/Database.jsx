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
                <h1 className="page-title">Database & Records</h1>
            </div>

            <div className="tabs glass">
                <button
                    className={`tab ${activeTab === 'sales' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sales')}
                >
                    📤 Sales
                </button>
                <button
                    className={`tab ${activeTab === 'purchases' ? 'active' : ''}`}
                    onClick={() => setActiveTab('purchases')}
                >
                    📥 Purchases
                </button>
            </div>

            <div className="card">
                {loading ? (
                    <div style={{ padding: '20px', color: 'white' }}>Loading data...</div>
                ) : (
                    <>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Invoice No</th>
                                    <th>{activeTab === 'sales' ? 'Customer' : 'Supplier'}</th>
                                    <th>Total Amount</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map(inv => (
                                    <tr key={inv.id}>
                                        <td>{formatDate(inv.date)}</td>
                                        <td>{inv.invoiceNumber}</td>
                                        <td>{inv.partyName}</td>
                                        <td>${parseFloat(inv.total).toFixed(2)}</td>
                                        <td>
                                            <button className="btn btn-sm btn-primary" onClick={() => openInvoiceDetails(inv)}>
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {invoices.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center' }}>No records found</td></tr>}
                            </tbody>
                        </table>
                    </>
                )}
            </div>

            {/* Invoice Details Modal */}
            {/* Invoice Details Modal */}
            {showInvoiceModal && selectedInvoice && (
                <div className="modal-overlay" onClick={() => setShowInvoiceModal(false)}>
                    <div className="modal glass" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                        <h2 style={{ color: 'white', marginBottom: '20px' }}>
                            {selectedInvoice.type} Invoice: {selectedInvoice.invoiceNumber}
                        </h2>
                        <div style={{ color: 'white', marginBottom: '20px' }}>
                            <p><strong>Date:</strong> {formatDate(selectedInvoice.date)}</p>
                            <p><strong>{activeTab === 'sales' ? 'Customer' : 'Supplier'}:</strong> {selectedInvoice.partyName}</p>
                        </div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>HSN</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                    <th>Disc%</th>
                                    <th>CGST%</th>
                                    <th>SGST%</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedInvoice.items?.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{item.Product?.name || 'Unknown Product'}</td>
                                        <td>{item.hsn || '-'}</td>
                                        <td>{item.quantity}</td>
                                        <td>${parseFloat(item.price).toFixed(2)}</td>
                                        <td>{item.discount ? `${parseFloat(item.discount).toFixed(2)}%` : '-'}</td>
                                        <td>{item.cgst ? `${parseFloat(item.cgst).toFixed(2)}%` : '-'}</td>
                                        <td>{item.sgst ? `${parseFloat(item.sgst).toFixed(2)}%` : '-'}</td>
                                        <td>${parseFloat(item.total).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                {selectedInvoice.type === 'SALE' ? (
                                    <>
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'right' }}>Tax Amount:</td>
                                            <td>${parseFloat(selectedInvoice.tax || 0).toFixed(2)}</td>
                                        </tr>
                                        {selectedInvoice.discount > 0 && (
                                            <tr>
                                                <td colSpan="7" style={{ textAlign: 'right' }}>Discount:</td>
                                                <td>-${parseFloat(selectedInvoice.discount).toFixed(2)}</td>
                                            </tr>
                                        )}
                                        <tr style={{ fontSize: '1.2em', color: '#86efac' }}>
                                            <td colSpan="7" style={{ textAlign: 'right' }}><strong>Final Total:</strong></td>
                                            <td><strong>${parseFloat(selectedInvoice.total).toFixed(2)}</strong></td>
                                        </tr>
                                        {selectedInvoice.amountDue > 0 && (
                                            <tr style={{ color: '#fca5a5' }}>
                                                <td colSpan="7" style={{ textAlign: 'right' }}>Balance Due:</td>
                                                <td>${parseFloat(selectedInvoice.amountDue).toFixed(2)}</td>
                                            </tr>
                                        )}
                                    </>
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'right' }}><strong>Total Amount:</strong></td>
                                        <td><strong>${parseFloat(selectedInvoice.total).toFixed(2)}</strong></td>
                                    </tr>
                                )}
                            </tfoot>
                        </table>
                        <div style={{ marginTop: '20px', textAlign: 'right' }}>
                            <button className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Database
