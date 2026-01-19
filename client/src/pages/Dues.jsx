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
        <div className="dues-page">
            <div className="page-header">
                <h1>Dues Management</h1>
            </div>

            <div className="tabs">
                <button
                    className={`tab-btn ${activeTab === 'debtors' ? 'active' : ''}`}
                    onClick={() => setActiveTab('debtors')}
                >
                    Debtor Dues (Receivables)
                </button>
                <button
                    className={`tab-btn ${activeTab === 'creditors' ? 'active' : ''}`}
                    onClick={() => setActiveTab('creditors')}
                >
                    Creditor Dues (Payables)
                </button>
            </div>

            <div className="dues-summary" style={{ marginBottom: '20px', fontSize: '18px' }}>
                Total {activeTab === 'debtors' ? 'Receivables' : 'Payables'}:
                <span style={{
                    fontWeight: 'bold',
                    marginLeft: '10px',
                    color: activeTab === 'debtors' ? '#10b981' : '#ef4444'
                }}>
                    ${(activeTab === 'debtors' ? totalDebtorDues : totalCreditorDues).toFixed(2)}
                </span>
            </div>

            <div className="dues-table-container">
                {activeTab === 'debtors' ? (
                    <table className="dues-table">
                        <thead>
                            <tr>
                                <th>Customer Name</th>
                                <th>Phone</th>
                                <th>Last Follow-up</th>
                                <th>Amount Due</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {debtors.length > 0 ? debtors.map(customer => (
                                <tr key={customer.id}>
                                    <td><strong>{customer.name}</strong></td>
                                    <td>{customer.phone}</td>
                                    <td>-</td>
                                    <td className="amount-negative">${parseFloat(customer.outstandingBalance).toFixed(2)}</td>
                                    <td>
                                        <button className="action-btn">Record Payment</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>No pending dues from customers</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table className="dues-table">
                        <thead>
                            <tr>
                                <th>Supplier Name</th>
                                <th>Contact Person</th>
                                <th>Phone</th>
                                <th>Amount To Pay</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {creditors.length > 0 ? creditors.map(supplier => (
                                <tr key={supplier.id}>
                                    <td><strong>{supplier.name}</strong></td>
                                    <td>{supplier.contactPerson || '-'}</td>
                                    <td>{supplier.phone}</td>
                                    <td className="amount-positive">${parseFloat(supplier.outstandingBalance).toFixed(2)}</td>
                                    <td>
                                        <button className="action-btn">Make Payment</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>No pending payments to suppliers</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}

export default Dues
