import { useState, useEffect } from 'react'
import api from '../utils/api'
import './Dashboard.css'

function Dashboard() {
    const [stats, setStats] = useState({
        totalItems: 0,
        totalItemsWorth: 0,
        totalSold: 0,
        totalCustomers: 0,
        paymentReceived: 0,
        paymentRemaining: 0
    })
    const [customers, setCustomers] = useState([])

    useEffect(() => {
        fetchStats()
        fetchCustomers()
    }, [])

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
        <div className="dashboard">
            <h1 className="page-title">Dashboard</h1>

            <div className="stats-grid">
                <div className="stat-card glass">
                    <div className="stat-icon">📦</div>
                    <div className="stat-info">
                        <h3>Total Items</h3>
                        <p className="stat-value">{stats.totalItems}</p>
                        <p className="stat-label" style={{ fontSize: '0.9em', color: '#86efac', marginTop: '5px' }}>
                            Worth: ${stats.totalItemsWorth.toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="stat-card glass">
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                        <h3>Total Customers</h3>
                        <p className="stat-value">{stats.totalCustomers}</p>
                    </div>
                </div>

                <div className="stat-card glass">
                    <div className="stat-icon">📈</div>
                    <div className="stat-info">
                        <h3>Sales Overview</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <p style={{ margin: 0, fontSize: '1.2em', fontWeight: 'bold' }}>
                                Gross Sales: <span style={{ color: 'white' }}>${stats.totalSold.toFixed(2)}</span>
                            </p>
                            <p style={{ margin: 0, fontSize: '0.95em', color: '#86efac' }}>
                                Total Collections: ${stats.paymentReceived.toFixed(2)}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.95em', color: '#fca5a5' }}>
                                Total Outstanding: ${stats.paymentRemaining.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: '30px' }}>
                <h2 style={{ color: 'white', marginBottom: '20px' }}>Customer Payment Status</h2>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Customer Name</th>
                            <th>Phone</th>
                            <th>Outstanding Balance</th>
                            <th>Credit Limit</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map(customer => (
                            <tr key={customer.id}>
                                <td>{customer.name}</td>
                                <td>{customer.phone}</td>
                                <td>${parseFloat(customer.outstandingBalance || 0).toFixed(2)}</td>
                                <td>${parseFloat(customer.creditLimit || 0).toFixed(2)}</td>
                                <td>
                                    {customer.outstandingBalance > customer.creditLimit ? (
                                        <span className="badge badge-danger">Over Limit</span>
                                    ) : customer.outstandingBalance > 0 ? (
                                        <span className="badge badge-warning">Pending</span>
                                    ) : (
                                        <span className="badge badge-success">Clear</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default Dashboard
