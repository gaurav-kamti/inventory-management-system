import { useState, useEffect } from 'react'
import api from '../utils/api'
import './Customers.css'

function Customers() {
    const [customers, setCustomers] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', address: '', creditLimit: 0
    })

    useEffect(() => {
        fetchCustomers()
    }, [])

    const fetchCustomers = async () => {
        const response = await api.get('/customers')
        setCustomers(response.data)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await api.post('/customers', formData)
            setShowModal(false)
            fetchCustomers()
            setFormData({ name: '', phone: '', email: '', address: '', creditLimit: 0 })
        } catch (error) {
            alert(error.response?.data?.error || 'Error creating customer')
        }
    }

    return (
        <div className="customers-page">
            <div className="page-header">
                <h1 className="page-title">Customers</h1>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    + Add Customer
                </button>
            </div>

            <div className="card">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Credit Limit</th>
                            <th>Outstanding</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map(customer => (
                            <tr key={customer.id}>
                                <td>{customer.name}</td>
                                <td>{customer.phone}</td>
                                <td>{customer.email || '-'}</td>
                                <td>${customer.creditLimit}</td>
                                <td>${customer.outstandingBalance}</td>
                                <td>
                                    {customer.outstandingBalance > customer.creditLimit ? (
                                        <span className="badge badge-danger">Over Limit</span>
                                    ) : (
                                        <span className="badge badge-success">Good</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal glass" onClick={(e) => e.stopPropagation()}>
                        <h2>Add New Customer</h2>
                        <form onSubmit={handleSubmit}>
                            <input className="input" placeholder="Customer Name" value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                            <input className="input" placeholder="Phone" value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
                            <input className="input" placeholder="Email (optional)" value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            <textarea className="input" placeholder="Address (optional)" value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                            <input type="number" className="input" placeholder="Credit Limit" value={formData.creditLimit}
                                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })} />
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Add Customer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Customers
