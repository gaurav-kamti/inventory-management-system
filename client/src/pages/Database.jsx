import { useState, useEffect } from 'react'
import api from '../services/api'
import InvoiceTemplate from '../components/InvoiceTemplate'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { downloadPDF } from '../utils/pdfExport'
import './Inventory.css' // Reusing inventory styles for standard look

function Database() {
    const [activeTab, setActiveTab] = useState('sales')
    const [sales, setSales] = useState([])
    const [purchases, setPurchases] = useState([])
    const [vouchers, setVouchers] = useState([])
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState({ start: '', end: '' })
    const [searchQuery, setSearchQuery] = useState('')
    const [prevTab, setPrevTab] = useState('')

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
        return `${d}:${m}:${y}`
    }

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            await Promise.all([fetchSales(), fetchPurchases(), fetchVouchers()])
            setLoading(false)
        }
        loadData()
    }, [])

    const fetchSales = async () => {
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
                cgst: s.cgst || 0,
                sgst: s.sgst || 0,
                igst: s.igst || 0,
                roundOff: s.roundOff || 0,
                discount: s.discount || 0,
                amountDue: s.amountDue || 0,
                items: s.SaleItems,
                customer: s.Customer
            })).sort((a, b) => new Date(b.date) - new Date(a.date))
            setSales(salesData)
        } catch (error) {
            console.error('Error fetching sales:', error)
        }
    }

    const fetchPurchases = async () => {
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
            setPurchases(Object.values(purchasesMap).sort((a, b) => new Date(b.date) - new Date(a.date)))
        } catch (error) {
            console.error('Error fetching purchases:', error)
        }
    }

    const fetchVouchers = async () => {
        try {
            const res = await api.get('/vouchers/history')
            // Normalize voucher data for template
            const vouchersData = res.data.map(v => ({
                ...v,
                total: v.amount,
                invoiceNumber: v.id,
                items: [], // Vouchers have no items
                partyName: v.Customer?.name || v.Supplier?.name || 'Unknown',
                customer: v.Customer || v.Supplier // For template address etc
            }))
            setVouchers(vouchersData)
        } catch (error) {
            console.error('Error fetching vouchers:', error)
        }
    }

    // Set default date range whenever active data changes or tab changes
    useEffect(() => {
        if (activeTab !== prevTab) {
            const activeData = activeTab === 'sales' ? sales : (activeTab === 'purchases' ? purchases : vouchers);
            if (activeData.length > 0) {
                const dates = activeData.map(d => new Date(d.date)).filter(d => !isNaN(d));
                if (dates.length > 0) {
                    const earliest = new Date(Math.min(...dates));
                    const latest = new Date(Math.max(...dates));
                    setDateRange({
                        start: earliest.toISOString().split('T')[0],
                        end: latest.toISOString().split('T')[0]
                    });
                }
            }
            setPrevTab(activeTab);
        }
    }, [activeTab, sales, purchases, vouchers, prevTab]);

    const activeData = activeTab === 'sales' ? sales : (activeTab === 'purchases' ? purchases : vouchers)

    const filteredInvoices = activeData.filter(inv => {
        // Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matches =
                inv.partyName?.toLowerCase().includes(q) ||
                inv.invoiceNumber?.toString().toLowerCase().includes(q);
            if (!matches) return false;
        }

        // Date Filter
        if (!dateRange.start && !dateRange.end) return true;
        const d = new Date(inv.date);
        if (dateRange.start) {
            const start = new Date(dateRange.start);
            start.setHours(0, 0, 0, 0);
            if (d < start) return false;
        }
        if (dateRange.end) {
            const end = new Date(dateRange.end);
            end.setHours(23, 59, 59, 999);
            if (d > end) return false;
        }
        return true;
    })

    const openInvoiceDetails = (invoice) => {
        setSelectedInvoice(invoice)
        setShowInvoiceModal(true)
    }

    const handlePrint = () => {
        window.print();
    }

    const downloadInvoice = async () => {
        const fileName = `${selectedInvoice.type}_${selectedInvoice.invoiceNumber || selectedInvoice.id}.pdf`;
        await downloadPDF('invoice-print-template', fileName);
    }

    const exportToExcel = () => {
        const data = filteredInvoices.map(inv => ({
            Date: formatDate(inv.date),
            'Voucher No': inv.invoiceNumber || inv.id,
            'Party Name': inv.partyName,
            Type: inv.type,
            'Subtotal': inv.subtotal || inv.total,
            'Tax': inv.tax || 0,
            'Total Amount': inv.total
        }))

        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Records")
        XLSX.writeFile(wb, `Master_Records_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    const exportLedgerPDF = () => {
        const doc = new jsPDF()
        doc.setFontSize(18)
        doc.text(`Master Records - ${activeTab.toUpperCase()}`, 14, 22)

        doc.setFontSize(11)
        doc.setTextColor(100)
        doc.text(`Period: ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}`, 14, 30)

        const tableColumn = ["Date", "Voucher No", "Party Name", "Type", "Amount"]
        const tableRows = filteredInvoices.map(inv => [
            formatDate(inv.date),
            inv.invoiceNumber || inv.id,
            inv.partyName,
            inv.type,
            `$${parseFloat(inv.total).toFixed(2)}`
        ])

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [142, 182, 155] }
        })

        doc.save(`Master_Records_${activeTab}.pdf`)
    }




    return (
        <div className="inventory-page">
            <div className="page-header">
                <h1 className="page-title">Master Records</h1>
                <p className="page-subtitle">Centralized history of all sales, purchases, and vouchers</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: '30px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div
                    className={`stat-card ${activeTab === 'sales' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sales')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(142, 182, 155, 0.1)', color: 'var(--accent)' }}>📊</div>
                    <div className="stat-info">
                        <h3>Sales Ledger</h3>
                        <p className="stat-value">{sales.length}</p>
                    </div>
                </div>
                <div
                    className={`stat-card ${activeTab === 'purchases' ? 'active' : ''}`}
                    onClick={() => setActiveTab('purchases')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(78, 205, 196, 0.1)', color: '#4ecdc4' }}>🏛️</div>
                    <div className="stat-info">
                        <h3>Purchase Records</h3>
                        <p className="stat-value">{purchases.length}</p>
                    </div>
                </div>
                <div
                    className={`stat-card ${activeTab === 'vouchers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('vouchers')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(255, 107, 107, 0.1)', color: '#ff6b6b' }}>🧾</div>
                    <div className="stat-info">
                        <h3>Vouchers</h3>
                        <p className="stat-value">{vouchers.length}</p>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '20px' }}>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <h2 style={{ margin: 0 }}><span>📂</span> Records</h2>

                                {/* Search Box */}
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        placeholder="Search by Name or Invoice..."
                                        className="input"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        style={{ padding: '8px 15px 8px 35px', fontSize: '0.85rem', width: '220px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}
                                    />
                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                                </div>

                                {/* Date Range */}
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '5px 15px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                                        <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--accent)' }}>FROM</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={dateRange.start}
                                            onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                                            style={{ padding: '4px', fontSize: '0.8rem', width: '125px', background: 'transparent', border: 'none' }}
                                        />
                                    </div>
                                    <div style={{ width: '1px', height: '15px', background: 'var(--glass-border)' }}></div>
                                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                                        <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--accent)' }}>TO</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={dateRange.end}
                                            onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                                            style={{ padding: '4px', fontSize: '0.8rem', width: '125px', background: 'transparent', border: 'none' }}
                                        />
                                    </div>
                                    <button
                                        onClick={() => setDateRange({ start: '', end: '' })}
                                        style={{ background: 'rgba(142, 182, 155, 0.1)', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.65rem', fontWeight: '800', padding: '4px 8px', borderRadius: '6px' }}
                                    >
                                        RESET
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn btn-secondary" onClick={exportToExcel} style={{ padding: '8px 15px', fontSize: '0.8rem' }}>
                                    📊 Export Excel
                                </button>
                                <button className="btn btn-secondary" onClick={exportLedgerPDF} style={{ padding: '8px 15px', fontSize: '0.8rem' }}>
                                    📄 Export PDF
                                </button>
                            </div>
                        </div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>{activeTab === 'vouchers' ? 'Type' : 'Voucher No.'}</th>
                                    <th>Party Name</th>
                                    <th>{activeTab === 'vouchers' ? 'Mode/Note' : 'Amount'}</th>
                                    {activeTab === 'vouchers' && <th>Amount</th>}
                                    <th style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map(inv => (
                                    <tr key={inv.id}>
                                        <td style={{ fontSize: '0.85rem' }}>{formatDate(inv.date)}</td>
                                        <td style={{ fontWeight: '700', letterSpacing: '0.5px' }}>
                                            {activeTab === 'vouchers' ? (
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    background: inv.type === 'RECEIPT' ? 'rgba(142, 182, 155, 0.2)' : 'rgba(255, 107, 107, 0.2)',
                                                    color: inv.type === 'RECEIPT' ? 'var(--accent)' : '#ff6b6b'
                                                }}>
                                                    {inv.type}
                                                </span>
                                            ) : inv.invoiceNumber}
                                        </td>
                                        <td style={{ fontWeight: '600' }}>{inv.partyName}</td>
                                        {activeTab === 'vouchers' ? (
                                            <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{inv.mode}</td>
                                        ) : (
                                            <td style={{ fontWeight: '800', color: 'var(--accent)' }}>${parseFloat(inv.total).toFixed(2)}</td>
                                        )}
                                        {activeTab === 'vouchers' && (
                                            <td style={{ fontWeight: '800', color: inv.type === 'RECEIPT' ? 'var(--accent)' : '#ff6b6b' }}>
                                                ${parseFloat(inv.amount).toFixed(2)}
                                            </td>
                                        )}
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn" style={{ padding: '8px 20px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)' }} onClick={() => openInvoiceDetails(inv)}>
                                                {inv.type === 'SALE' ? 'View Invoice' : (inv.type === 'PURCHASE' ? 'View Bill' : 'View Voucher')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredInvoices.length === 0 && (
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

                        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                            <button className="btn" style={{ background: 'var(--accent)', color: 'var(--bg-deep)', padding: '15px 30px', fontWeight: '800' }} onClick={handlePrint}>
                                🖨️ Print
                            </button>
                            <button className="btn" style={{ background: 'var(--accent)', color: 'var(--bg-deep)', padding: '15px 30px', fontWeight: '800' }} onClick={downloadInvoice}>
                                📥 Download PDF
                            </button>
                            <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', padding: '15px 40px', fontWeight: '800' }} onClick={() => setShowInvoiceModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Print Template */}
            <div id="invoice-print-template" style={{ display: 'none' }}>
                <InvoiceTemplate sale={selectedInvoice} customer={selectedInvoice?.customer} />
            </div>
        </div>
    )
}

export default Database
