import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import InvoiceTemplate from '../components/InvoiceTemplate'
import DatePicker from '../components/DatePicker'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

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
    const [companyProfile, setCompanyProfile] = useState({})
    const [showExportMenu, setShowExportMenu] = useState(false)
    const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, record: null })
    const navigate = useNavigate()

    // Helper for dd:mm:yyyy date format
    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        const date = new Date(dateStr)
        const d = String(date.getDate()).padStart(2, '0')
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const y = date.getFullYear()
        return `${d}/${m}/${y}`
    }

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            await Promise.all([fetchSales(), fetchPurchases(), fetchVouchers(), fetchCompanyProfile()])
            setLoading(false)
        }
        loadData()
    }, [])

    useEffect(() => {
        const handleClick = () => setContextMenu({ show: false, x: 0, y: 0, record: null })
        window.addEventListener('click', handleClick)
        return () => window.removeEventListener('click', handleClick)
    }, [])

    const fetchCompanyProfile = async () => {
        try {
            const response = await api.get('/settings/company_profile')
            if (response.data) {
                setCompanyProfile(response.data)
            }
        } catch (error) {
            console.error('Error fetching company profile:', error)
        }
    }

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
                taxableAmount: s.taxableAmount || s.subtotal || 0,
                roundOff: s.roundOff || 0,
                discountPercent: s.discountPercent || 0,
                discountAmount: s.discountAmount || s.discount || 0,
                amountDue: s.amountDue || 0,
                items: s.SaleItems,
                customer: s.Customer,
                deliveryNote: s.deliveryNote,
                paymentTerms: s.paymentTerms,
                supplierRef: s.supplierRef,
                buyerOrderNo: s.buyerOrderNo,
                buyerOrderDate: s.buyerOrderDate,
                despatchedThrough: s.despatchedThrough,
                termsOfDelivery: s.termsOfDelivery
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
                        subtotal: p.subtotal || 0,
                        discountPercent: p.discountPercent || 0,
                        discountAmount: p.discountAmount || 0,
                        taxableAmount: p.taxableAmount || 0,
                        tax: p.tax || 0,
                        roundOff: p.roundOff || 0,
                        deliveryNote: p.deliveryNote,
                        paymentTerms: p.paymentTerms,
                        supplierRef: p.supplierRef,
                        buyerOrderNo: p.buyerOrderNo,
                        buyerOrderDate: p.buyerOrderDate,
                        despatchedThrough: p.despatchedThrough,
                        termsOfDelivery: p.termsOfDelivery,
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

    // Clear the date filter when switching tabs so all records are visible by default
    useEffect(() => {
        if (activeTab !== prevTab) {
            setDateRange({ start: '', end: '' });
            setPrevTab(activeTab);
        }
    }, [activeTab, prevTab]);

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

    const handleContextMenu = (e, record) => {
        e.preventDefault()
        setContextMenu({
            show: true,
            x: e.pageX,
            y: e.pageY,
            record
        })
    }

    const handleDeleteRecord = async (inv) => {
        if (!window.confirm(`Are you sure you want to delete this ${inv.type.toLowerCase()} record? This action cannot be undone.`)) return

        try {
            if (activeTab === 'sales') {
                await api.delete(`/sales/${inv.id}`)
                setSales(prev => prev.filter(s => s.id !== inv.id))
            } else if (activeTab === 'purchases') {
                await api.delete(`/purchases/${encodeURIComponent(inv.invoiceNumber)}`)
                setPurchases(prev => prev.filter(p => p.invoiceNumber !== inv.invoiceNumber))
            } else if (activeTab === 'vouchers') {
                await api.delete(`/vouchers/${encodeURIComponent(inv.id)}`)
                setVouchers(prev => prev.filter(v => v.id !== inv.id))
            }
            // Use native alert or existing toast (using alert for simplicity if no toast exists here)
            alert("Record deleted successfully")
        } catch (error) {
            console.error('Error deleting record:', error)
            alert('Failed to delete record: ' + (error.response?.data?.error || error.message))
        }
        setContextMenu({ show: false, x: 0, y: 0, record: null })
    }

    const handlePrint = () => {
        window.print();
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
            `₹${parseFloat(inv.total).toFixed(2)}`
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
                                        <DatePicker
                                            value={dateRange.start}
                                            onChange={(val) => setDateRange({ ...dateRange, start: val })}
                                            style={{ padding: '4px', fontSize: '0.8rem', width: '125px', background: 'transparent', border: 'none' }}
                                        />
                                    </div>
                                    <div style={{ width: '1px', height: '15px', background: 'var(--glass-border)' }}></div>
                                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                                        <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--accent)' }}>TO</label>
                                        <DatePicker
                                            value={dateRange.end}
                                            onChange={(val) => setDateRange({ ...dateRange, end: val })}
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
                            <div style={{ display: 'flex', gap: '10px', position: 'relative' }}>
                                <button 
                                    className="btn btn-secondary" 
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    onBlur={() => setTimeout(() => setShowExportMenu(false), 200)}
                                    style={{ padding: '8px 20px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '12px' }}
                                >
                                    Export <span style={{ fontSize: '0.65rem', transform: showExportMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                                </button>

                                {showExportMenu && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '8px',
                                        background: 'rgba(5, 31, 32, 0.95)',
                                        backdropFilter: 'blur(12px)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px',
                                        padding: '8px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px',
                                        minWidth: '200px',
                                        zIndex: 100,
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.4)'
                                    }}>
                                        <button 
                                            onMouseDown={exportToExcel}
                                            style={{ textAlign: 'left', padding: '10px 15px', background: 'transparent', border: 'none', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <span style={{ color: '#4ecdc4', fontSize: '1.1rem' }}>📊</span> 
                                            <span style={{ fontWeight: 600 }}>Excel (.xlsx)</span>
                                        </button>
                                        <button 
                                            onMouseDown={exportLedgerPDF}
                                            style={{ textAlign: 'left', padding: '10px 15px', background: 'transparent', border: 'none', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <span style={{ color: '#ff6b6b', fontSize: '1.1rem' }}>📄</span> 
                                            <span style={{ fontWeight: 600 }}>PDF Document</span>
                                        </button>
                                    </div>
                                )}
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
                                    <tr key={inv.id} onContextMenu={(e) => handleContextMenu(e, inv)} style={{ cursor: 'context-menu' }}>
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
                                            <td style={{ fontWeight: '800', color: 'var(--accent)' }}>₹{parseFloat(inv.total).toFixed(2)}</td>
                                        )}
                                        {activeTab === 'vouchers' && (
                                            <td style={{ fontWeight: '800', color: inv.type === 'RECEIPT' ? 'var(--accent)' : '#ff6b6b' }}>
                                                ₹{parseFloat(inv.amount).toFixed(2)}
                                            </td>
                                        )}
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn" style={{ padding: '8px 16px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)' }} onClick={() => openInvoiceDetails(inv)}>
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
                        width: '85%', maxWidth: '850px', maxHeight: '92vh', overflow: 'auto',
                        padding: '24px', background: 'var(--bg-dark)', borderRadius: '24px',
                        border: '1px solid var(--glass-border)'
                    }} onClick={e => e.stopPropagation()}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
                            <div>
                                <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.5px' }}>
                                    {selectedInvoice.type} Voucher Details
                                </h2>
                                <p style={{ color: 'var(--accent)', fontWeight: '700', fontSize: '0.85rem' }}>Ref: {selectedInvoice.invoiceNumber}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700' }}>ENTRY DATE</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: '800' }}>{formatDate(selectedInvoice.date)}</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: '15px', padding: '10px 15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', borderLeft: '4px solid var(--accent)' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', marginBottom: '2px' }}>PARTY NAME</p>
                            <p style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)' }}>{selectedInvoice.partyName}</p>
                        </div>

                        <div className="table-container">
                            <table className="table">
                                <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    <tr>
                                        <th style={{ width: '100%' }}>Item Name</th>
                                        <th style={{ whiteSpace: 'nowrap', padding: '15px' }}>HSN</th>
                                        <th style={{ whiteSpace: 'nowrap', padding: '15px' }}>Size</th>
                                        <th style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '15px' }}>Qty</th>
                                        <th style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '15px' }}>Rate</th>
                                        <th style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '15px' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedInvoice.items?.map((item, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: '700' }}>{item.Product?.name || 'Unknown Item'}</td>
                                            <td>{item.hsn || '--'}</td>
                                            <td>{item.Product?.size || item.size || '--'}</td>
                                            <td style={{ textAlign: 'right', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                                {item.quantity} {item.unit || item.quantityUnit || 'Pcs'}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>₹{parseFloat(item.price).toFixed(2)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--accent)' }}>
                                                ₹{parseFloat(item.total).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'right', padding: '15px', fontWeight: '700', color: 'var(--text-secondary)' }}>Subtotal</td>
                                        <td style={{ textAlign: 'right', padding: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>₹{parseFloat(selectedInvoice.taxableAmount || selectedInvoice.subtotal || 0).toFixed(2)}</td>
                                    </tr>
                                    {selectedInvoice.tax > 0 && (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'right', padding: '10px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                                GST ({selectedInvoice.gstPercent || 18}%)
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '10px', fontWeight: '700' }}>₹{parseFloat(selectedInvoice.tax).toFixed(2)}</td>
                                        </tr>
                                    )}
                                    {(selectedInvoice.discountAmount > 0 || selectedInvoice.discountPercent > 0) && (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'right', padding: '10px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                                Discount {selectedInvoice.discountPercent > 0 ? `(${selectedInvoice.discountPercent}%)` : ''}
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '10px', fontWeight: '700', color: '#ff4757' }}>
                                                -₹{parseFloat(selectedInvoice.discountAmount || 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    )}
                                    {selectedInvoice.roundOff != null && selectedInvoice.roundOff !== 0 && (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'right', padding: '10px', fontWeight: '600', color: 'var(--text-secondary)' }}>Rounded Off</td>
                                            <td style={{ textAlign: 'right', padding: '10px', fontWeight: '700' }}>
                                                {selectedInvoice.roundOff >= 0 ? '+' : '-'}₹{Math.abs(selectedInvoice.roundOff).toFixed(2)}
                                            </td>
                                        </tr>
                                    )}
                                    <tr style={{ background: 'rgba(142, 182, 155, 0.05)' }}>
                                        <td colSpan="5" style={{ textAlign: 'right', padding: '10px 20px', fontWeight: '900', fontSize: '1.1rem', color: 'var(--accent)' }}>GRAND TOTAL</td>
                                        <td style={{ textAlign: 'right', padding: '10px 20px', fontWeight: '900', fontSize: '1.4rem', color: 'var(--accent)' }}>₹{parseFloat(selectedInvoice.total).toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                            <button className="btn" style={{ background: 'var(--accent)', color: 'var(--bg-deep)', padding: '15px 30px', fontWeight: '800' }} onClick={handlePrint}>
                                🖨️ Print
                            </button>

                            <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', padding: '15px 40px', fontWeight: '800' }} onClick={() => setShowInvoiceModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Print Template */}
            <div id="invoice-print-template" style={{ display: 'none' }}>
                <div className="print-page">
                    <InvoiceTemplate sale={selectedInvoice} customer={selectedInvoice?.customer} company={companyProfile} copyType="Buyer's Copy" />
                </div>
                <div className="print-page">
                    <InvoiceTemplate sale={selectedInvoice} customer={selectedInvoice?.customer} company={companyProfile} copyType="Seller's Copy" />
                </div>
            </div>

            {/* Context Menu (Right Click) */}
            {contextMenu.show && (
                <div style={{
                    position: 'absolute',
                    top: contextMenu.y,
                    left: contextMenu.x,
                    background: 'rgba(5, 31, 32, 0.95)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    padding: '5px 0',
                    zIndex: 2000,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                    minWidth: '150px'
                }}>
                    <button 
                        style={{ width: '100%', textAlign: 'left', padding: '10px 15px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', gap: '10px', alignItems: 'center' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => {
                            if (contextMenu.record.type === 'VOUCHER') {
                                alert("Voucher editing coming soon!");
                            } else {
                                navigate('/sell-purchase', { 
                                    state: { 
                                        editRecord: { type: contextMenu.record.type, record: contextMenu.record },
                                        previousLocation: '/database'
                                    } 
                                });
                            }
                            setContextMenu({ ...contextMenu, show: false });
                        }}
                    >
                        <span>✏️</span> Edit
                    </button>
                    <button 
                        style={{ width: '100%', textAlign: 'left', padding: '10px 15px', background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', gap: '10px', alignItems: 'center' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => handleDeleteRecord(contextMenu.record)}
                    >
                        <span>🗑️</span> Delete
                    </button>
                </div>
            )}
        </div>
    )
}

export default Database
