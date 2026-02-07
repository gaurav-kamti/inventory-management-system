import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { formatOverdue } from '../utils/formatters'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import './Dues.css'

function Dues() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('debtors') // debtors or creditors
    const [customers, setCustomers] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState(null)
    const [expandedData, setExpandedData] = useState(null)
    const [historyLoading, setHistoryLoading] = useState(false)
    const [dateRange, setDateRange] = useState({ start: '', end: '' })
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [custRes, suppRes] = await Promise.all([
                api.get('/customers'),
                api.get('/suppliers')
            ])
            setCustomers(custRes.data)
            setSuppliers(suppRes.data)
            setLoading(false)
        } catch (error) {
            console.error('Error fetching dues:', error)
            setLoading(false)
        }
    }

    // Filter for non-zero balances and search query
    const debtors = customers.filter(c =>
        parseFloat(c.outstandingBalance) !== 0 &&
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const creditors = suppliers.filter(s =>
        parseFloat(s.outstandingBalance) !== 0 &&
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Helper for rendering history row
    const renderHistoryRow = (id, type) => {
        if (expandedId !== `${type}-${id}`) return null;
        return (
            <tr className="history-row">
                <td colSpan="5">
                    {renderHistoryTable()}
                </td>
            </tr>
        );
    };

    const totalDebtorDues = debtors.reduce((sum, c) => sum + parseFloat(c.outstandingBalance || 0), 0)
    const totalCreditorDues = creditors.reduce((sum, s) => sum + parseFloat(s.outstandingBalance || 0), 0)

    const toggleHistory = async (id, type) => {
        const uniqueId = `${type}-${id}`

        if (expandedId === uniqueId) {
            setExpandedId(null)
            setExpandedData(null)
            setDateRange({ start: '', end: '' })
            return
        }

        setExpandedId(uniqueId)
        setHistoryLoading(true)
        try {
            const endpoint = type === 'customer' ? `/customers/${id}/history` : `/suppliers/${id}/history`
            const res = await api.get(endpoint)
            const history = res.data.history
            setExpandedData({
                type,
                data: type === 'customer' ? res.data.customer : res.data.supplier,
                ledger: history
            })

            // Set default date range to first and last transaction
            if (history && history.length > 0) {
                const dates = history.map(h => new Date(h.date)).filter(d => !isNaN(d));
                if (dates.length > 0) {
                    const earliest = new Date(Math.min(...dates));
                    const latest = new Date(Math.max(...dates));
                    setDateRange({
                        start: earliest.toISOString().split('T')[0],
                        end: latest.toISOString().split('T')[0]
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching history:', error)
            alert('Failed to load history')
        } finally {
            setHistoryLoading(false)
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        const date = new Date(dateStr)
        const d = String(date.getDate()).padStart(2, '0')
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const y = date.getFullYear()
        return `${d}:${m}:${y}`
    }

    const getFilteredLedger = () => {
        if (!expandedData || !expandedData.ledger) return []

        let filtered = expandedData.ledger

        if (dateRange.start) {
            const startDate = new Date(dateRange.start)
            startDate.setHours(0, 0, 0, 0)
            filtered = filtered.filter(item => new Date(item.date) >= startDate)
        }

        if (dateRange.end) {
            const endDate = new Date(dateRange.end)
            endDate.setHours(23, 59, 59, 999)
            filtered = filtered.filter(item => new Date(item.date) <= endDate)
        }

        return filtered
    }

    const exportToExcel = () => {
        const filteredLedger = getFilteredLedger()
        if (filteredLedger.length === 0) return alert('No data to export')

        const data = filteredLedger.map(entry => ({
            Date: formatDate(entry.date),
            Type: entry.type,
            Description: entry.description,
            Debit: entry.debit > 0 ? entry.debit : '',
            Credit: entry.credit > 0 ? entry.credit : '',
            Balance: entry.balance
        }))

        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Ledger")

        const fileName = `${expandedData.data.name}_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`
        XLSX.writeFile(wb, fileName)
    }

    const exportToPDF = () => {
        const filteredLedger = getFilteredLedger()
        if (filteredLedger.length === 0) return alert('No data to export')

        const doc = new jsPDF()

        // Header
        doc.setFontSize(18)
        doc.text('Account Statement', 14, 22)

        doc.setFontSize(11)
        doc.setTextColor(100)
        doc.text(`Name: ${expandedData.data.name}`, 14, 32)
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 38)

        if (dateRange.start || dateRange.end) {
            const rangeText = `Period: ${dateRange.start || 'Start'} to ${dateRange.end || 'Now'}`
            doc.text(rangeText, 14, 44)
        }

        // Table
        const tableColumn = ["Date", "Type", "Description", "Debit", "Credit", "Balance"]
        const tableRows = []

        filteredLedger.forEach(entry => {
            const rowData = [
                formatDate(entry.date),
                entry.type,
                entry.description,
                entry.debit > 0 ? entry.debit.toFixed(2) : '',
                entry.credit > 0 ? entry.credit.toFixed(2) : '',
                entry.balance.toFixed(2)
            ]
            tableRows.push(rowData)
        })

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 50,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [78, 205, 196] }
        })

        const fileName = `${expandedData.data.name}_Ledger.pdf`
        doc.save(fileName)
    }

    const renderHistoryTable = () => {
        if (historyLoading) {
            return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading history...</div>
        }

        if (!expandedData || !expandedData.ledger) return null

        const filteredLedger = getFilteredLedger()

        return (
            <div className="history-container">
                <div className="ledger-summary" style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Transaction History</h4>
                        <div style={{ fontSize: '0.9rem', marginTop: '5px' }}>
                            Current Balance: <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>${parseFloat(expandedData.data.outstandingBalance).toFixed(2)}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                                className="btn btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                onClick={() => setDateRange({ start: '', end: '' })}
                            >
                                All Time
                            </button>
                            <button
                                className="btn btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                onClick={() => {
                                    const now = new Date();
                                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                                    setDateRange({
                                        start: firstDay.toISOString().split('T')[0],
                                        end: now.toISOString().split('T')[0]
                                    });
                                }}
                            >
                                This Month
                            </button>
                            <button
                                className="btn btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                onClick={() => {
                                    const now = new Date();
                                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
                                    setDateRange({
                                        start: lastMonth.toISOString().split('T')[0],
                                        end: lastDay.toISOString().split('T')[0]
                                    });
                                }}
                            >
                                Last Month
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '5px 12px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--accent)' }}>FROM</label>
                                <input
                                    type="date"
                                    className="input"
                                    style={{ padding: '2px', fontSize: '0.8rem', width: '125px', background: 'transparent', border: 'none' }}
                                    value={dateRange.start}
                                    onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                                />
                                <div style={{ width: '1px', height: '12px', background: 'var(--glass-border)' }}></div>
                                <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--accent)' }}>TO</label>
                                <input
                                    type="date"
                                    className="input"
                                    style={{ padding: '2px', fontSize: '0.8rem', width: '125px', background: 'transparent', border: 'none' }}
                                    value={dateRange.end}
                                    onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                                />
                            </div>
                            <button className="btn btn-secondary" onClick={exportToExcel} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                                📊 Excel
                            </button>
                            <button className="btn btn-secondary" onClick={exportToPDF} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                                📄 PDF
                            </button>
                        </div>
                    </div>
                </div>

                <table className="table" style={{ fontSize: '0.9rem' }}>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th style={{ textAlign: 'right' }}>Debit</th>
                            <th style={{ textAlign: 'right' }}>Credit</th>
                            <th style={{ textAlign: 'right' }}>Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLedger.map((entry, index) => (
                            <tr key={index}>
                                <td>{formatDate(entry.date)}</td>
                                <td>
                                    <span style={{
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        background: entry.type === 'SALE' || entry.type === 'PURCHASE' ? 'rgba(78, 205, 196, 0.1)' : 'rgba(255, 107, 107, 0.1)',
                                        color: entry.type === 'SALE' || entry.type === 'PURCHASE' ? '#4ecdc4' : '#ff6b6b',
                                        marginRight: '8px'
                                    }}>
                                        {entry.type}
                                    </span>
                                    {entry.description}
                                </td>
                                <td style={{ textAlign: 'right', color: '#ff6b6b' }}>
                                    {entry.debit > 0 ? `$${entry.debit.toFixed(2)}` : '-'}
                                </td>
                                <td style={{ textAlign: 'right', color: '#4ecdc4' }}>
                                    {entry.credit > 0 ? `$${entry.credit.toFixed(2)}` : '-'}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                    ${entry.balance.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                        {filteredLedger.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '15px' }}>
                                    {expandedData.ledger.length > 0 ? 'No transactions in selected date range' : 'No history found'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        )
    }

    return (
        <div className="inventory-page">

            <div className="page-header">
                <h1 className="page-title">Outstanding Balances</h1>
                <p className="page-subtitle">Monitor total receivables and payables</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: '30px' }}>
                <div
                    className={`stat-card ${activeTab === 'debtors' ? 'active' : ''}`}
                    onClick={() => setActiveTab('debtors')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(142, 182, 155, 0.1)', color: 'var(--accent)' }}>📥</div>
                    <div className="stat-info">
                        <h3>Receivables</h3>
                        <p className="stat-value" style={{ color: 'var(--accent)' }}>${totalDebtorDues.toLocaleString()}</p>
                    </div>
                </div>
                <div
                    className={`stat-card ${activeTab === 'creditors' ? 'active' : ''}`}
                    onClick={() => setActiveTab('creditors')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(255, 71, 87, 0.1)', color: '#ff4757' }}>📤</div>
                    <div className="stat-info">
                        <h3>Payables</h3>
                        <p className="stat-value" style={{ color: '#ff4757' }}>${totalCreditorDues.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div className="card">
                {/* Search Bar */}
                <div style={{ padding: '0 20px 20px 20px', borderBottom: '1px solid var(--glass-border)' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search by Name..."
                            className="input"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ padding: '10px 15px 10px 40px', fontSize: '1rem', width: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}
                        />
                        <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '1.2rem' }}>🔍</span>
                    </div>
                </div>

                {activeTab === 'debtors' ? (
                    <div className="table-container">
                        <h2><span>📥</span> Customer Dues</h2>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Customer Name</th>
                                    <th>Phone</th>
                                    <th>Aging</th>
                                    <th>Balance</th>
                                    <th style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {debtors.length > 0 ? debtors.map(customer => (
                                    <React.Fragment key={customer.id}>
                                        <tr key={customer.id}>
                                            <td
                                                onClick={() => toggleHistory(customer.id, 'customer')}
                                                className={`clickable-name ${expandedId === `customer-${customer.id}` ? 'expanded' : ''}`}
                                            >
                                                <strong style={{ color: 'var(--text-primary)' }}>{customer.name}</strong>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{customer.phone}</td>
                                            <td>
                                                <span className="badge badge-warning">
                                                    {formatOverdue(customer.daysOverdue)}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: '800', color: 'var(--accent)' }}>${parseFloat(customer.outstandingBalance).toFixed(2)}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    className="btn"
                                                    style={{ padding: '8px 16px', fontSize: '0.8rem', background: 'rgba(142, 182, 155, 0.1)', color: 'var(--accent)' }}
                                                    onClick={() => navigate(`/voucher/receipt?customerId=${customer.id}`)}
                                                >
                                                    Receive Payment
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedId === `customer-${customer.id}` && (
                                            <tr className="history-row">
                                                <td colSpan="5">
                                                    {renderHistoryTable()}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>No pending customer dues.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="table-container">
                        <h2><span>📤</span> Supplier Dues</h2>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Supplier Name</th>
                                    <th>Contact Person</th>
                                    <th>Phone</th>
                                    <th>Balance</th>
                                    <th style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {creditors.length > 0 ? creditors.map(supplier => (
                                    <React.Fragment key={supplier.id}>
                                        <tr key={supplier.id}>
                                            <td
                                                onClick={() => toggleHistory(supplier.id, 'supplier')}
                                                className={`clickable-name ${expandedId === `supplier-${supplier.id}` ? 'expanded' : ''}`}
                                            >
                                                <strong style={{ color: 'var(--text-primary)' }}>{supplier.name}</strong>
                                            </td>
                                            <td>{supplier.contactPerson || <span style={{ opacity: 0.5 }}>N/A</span>}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{supplier.phone}</td>
                                            <td style={{ fontWeight: '800', color: '#ff4757' }}>${parseFloat(supplier.outstandingBalance).toFixed(2)}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    className="btn"
                                                    style={{ padding: '8px 16px', fontSize: '0.8rem', background: 'rgba(255, 71, 87, 0.1)', color: '#ff4757' }}
                                                    onClick={() => navigate(`/voucher/payment?supplierId=${supplier.id}`)}
                                                >
                                                    Make Payment
                                                </button>
                                            </td>
                                        </tr>
                                        {renderHistoryRow(supplier.id, 'supplier')}
                                    </React.Fragment>
                                )) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>No pending supplier dues.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Dues
