import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { formatOverdue } from '../utils/formatters'
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

    // Filter for non-zero balances
    const debtors = customers.filter(c => parseFloat(c.outstandingBalance) !== 0)
    const creditors = suppliers.filter(s => parseFloat(s.outstandingBalance) !== 0)

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
            return
        }

        setExpandedId(uniqueId)
        setHistoryLoading(true)
        try {
            const endpoint = type === 'customer' ? `/customers/${id}/history` : `/suppliers/${id}/history`
            const res = await api.get(endpoint)
            setExpandedData({
                type,
                data: type === 'customer' ? res.data.customer : res.data.supplier,
                ledger: res.data.history
            })
        } catch (error) {
            console.error('Error fetching history:', error)
            alert('Failed to load history')
        } finally {
            setHistoryLoading(false)
        }
    }

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString()
    }

    const renderHistoryTable = () => {
        if (historyLoading) {
            return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading history...</div>
        }

        if (!expandedData || !expandedData.ledger) return null

        return (
            <div className="history-container">
                <div className="ledger-summary" style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Transaction History</h4>
                    <div style={{ fontSize: '0.9rem' }}>
                        Current Balance: <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>${parseFloat(expandedData.data.outstandingBalance).toFixed(2)}</span>
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
                        {expandedData.ledger.map((entry, index) => (
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
                        {expandedData.ledger.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '15px' }}>No history found</td>
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
