import { useState, useEffect } from 'react'
import api from '../utils/api'
import './Dues.css'

function Dues() {
    const [activeTab, setActiveTab] = useState('debtors') // debtors or creditors
    const [customers, setCustomers] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [loading, setLoading] = useState(true)

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

    const totalDebtorDues = debtors.reduce((sum, c) => sum + parseFloat(c.outstandingBalance || 0), 0)
    const totalCreditorDues = creditors.reduce((sum, s) => sum + parseFloat(s.outstandingBalance || 0), 0)

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
                                    <tr key={customer.id}>
                                        <td><strong style={{ color: 'var(--text-primary)' }}>{customer.name}</strong></td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{customer.phone}</td>
                                        <td><span className="badge badge-warning">Active Aging</span></td>
                                        <td style={{ fontWeight: '800', color: 'var(--accent)' }}>${parseFloat(customer.outstandingBalance).toFixed(2)}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn" style={{ padding: '8px 16px', fontSize: '0.8rem', background: 'rgba(142, 182, 155, 0.1)', color: 'var(--accent)' }}>Receive Payment</button>
                                        </td>
                                    </tr>
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
                                    <tr key={supplier.id}>
                                        <td><strong style={{ color: 'var(--text-primary)' }}>{supplier.name}</strong></td>
                                        <td>{supplier.contactPerson || <span style={{ opacity: 0.5 }}>N/A</span>}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{supplier.phone}</td>
                                        <td style={{ fontWeight: '800', color: '#ff4757' }}>${parseFloat(supplier.outstandingBalance).toFixed(2)}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn" style={{ padding: '8px 16px', fontSize: '0.8rem', background: 'rgba(255, 71, 87, 0.1)', color: '#ff4757' }}>Pay Supplier</button>
                                        </td>
                                    </tr>
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
