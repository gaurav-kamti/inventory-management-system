import { useState, useEffect, useRef } from 'react'
import api from '../utils/api'
import InvoiceTemplate from '../components/InvoiceTemplate'
import './Sales.css'

function Sales() {
    const [sales, setSales] = useState([])
    const [selectedSale, setSelectedSale] = useState(null)
    const [showInvoiceModal, setShowInvoiceModal] = useState(false)
    const invoiceRef = useRef()

    useEffect(() => {
        fetchSales()
    }, [])

    const fetchSales = async () => {
        const response = await api.get('/sales')
        setSales(response.data)
    }

    const handleViewInvoice = (sale) => {
        setSelectedSale(sale)
        setShowInvoiceModal(true)
    }

    const handlePrint = () => {
        window.print();
    }

    const closeInvoiceModal = () => {
        setShowInvoiceModal(false)
        setSelectedSale(null)
    }

    return (
        <div className="sales-page">
            <h1 className="page-title">Sales History</h1>

            <div className="card">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Invoice #</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Total</th>
                            <th>Paid</th>
                            <th>Due</th>
                            <th>Payment</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.map(sale => (
                            <tr key={sale.id}>
                                <td>{sale.invoiceNumber}</td>
                                <td>{sale.Customer?.name || 'Walk-in'}</td>
                                <td>{new Date(sale.createdAt).toLocaleDateString()}</td>
                                <td>₹{parseFloat(sale.total).toFixed(2)}</td>
                                <td>₹{parseFloat(sale.amountPaid).toFixed(2)}</td>
                                <td>₹{parseFloat(sale.amountDue).toFixed(2)}</td>
                                <td>
                                    <span className="badge badge-info">{sale.paymentMode}</span>
                                </td>
                                <td>
                                    {sale.status === 'completed' ? (
                                        <span className="badge badge-success">Completed</span>
                                    ) : (
                                        <span className="badge badge-warning">Pending</span>
                                    )}
                                </td>
                                <td>
                                    <button 
                                        className="btn-icon" 
                                        onClick={() => handleViewInvoice(sale)}
                                        title="View Invoice"
                                    >
                                        👁️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Invoice Modal */}
            {showInvoiceModal && selectedSale && (
                <div className="modal-overlay" onClick={closeInvoiceModal}>
                    <div className="modal-content glass" onClick={e => e.stopPropagation()} style={{ maxWidth: '950px', width: '95%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header" style={{ padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0 }}>Invoice Preview</h2>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn btn-secondary" onClick={handlePrint}>
                                    🖨️ Print Invoice
                                </button>
                                <button className="btn btn-danger" onClick={closeInvoiceModal}>
                                    ✕ Close
                                </button>
                            </div>
                        </div>
                        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#f5f5f5' }}>
                            <div id="invoice-print-template" ref={invoiceRef}>
                                <InvoiceTemplate sale={selectedSale} customer={selectedSale.Customer} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Sales
