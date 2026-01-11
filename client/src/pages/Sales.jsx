import { useState, useEffect } from 'react'
import api from '../utils/api'
import './Sales.css'

function Sales() {
    const [sales, setSales] = useState([])

    useEffect(() => {
        fetchSales()
    }, [])

    const fetchSales = async () => {
        const response = await api.get('/sales')
        setSales(response.data)
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
                        </tr>
                    </thead>
                    <tbody>
                        {sales.map(sale => (
                            <tr key={sale.id}>
                                <td>{sale.invoiceNumber}</td>
                                <td>{sale.Customer?.name || 'Walk-in'}</td>
                                <td>{new Date(sale.createdAt).toLocaleDateString()}</td>
                                <td>${parseFloat(sale.total).toFixed(2)}</td>
                                <td>${parseFloat(sale.amountPaid).toFixed(2)}</td>
                                <td>${parseFloat(sale.amountDue).toFixed(2)}</td>
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
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default Sales
