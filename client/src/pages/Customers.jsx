import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { formatOverdue } from '../utils/formatters'
import { validateGSTIN, formatGSTIN } from '../utils/gstUtils'
import './Customers.css'

function Customers() {
    const [customers, setCustomers] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', address: '', state: 'West Bengal', stateCode: '19'
    })

    const nameInputRef = useRef(null)

    useEffect(() => {
        if (showModal) {
            const focusTarget = () => {
                if (nameInputRef.current && document.activeElement !== nameInputRef.current) {
                    nameInputRef.current.focus();
                }
            }
            const timer1 = setTimeout(focusTarget, 150);
            const timer2 = setTimeout(focusTarget, 450);
            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
            };
        }
    }, [showModal])

    useEffect(() => {
        fetchCustomers()
    }, [])

    const fetchCustomers = async () => {
        const response = await api.get('/customers')
        setCustomers(response.data)
    }

    const handleSubmit = async (e) => {
        if (!formData.name) return alert('Name is required')
        if (!formData.phone) return alert('Phone is required')
        
        try {
            await api.post('/customers', formData)
            setShowModal(false)
            fetchCustomers()
            setFormData({ name: '', phone: '', email: '', address: '', state: 'West Bengal', stateCode: '19' })
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
                                <td>₹{customer.outstandingBalance}</td>
                                <td>
                                    {customer.outstandingBalance > 0 ? (
                                        <span className="badge badge-warning">
                                            {formatOverdue(customer.daysOverdue)}
                                        </span>
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
                                ref={nameInputRef}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                                required 
                                autoComplete="off"
                            />
                            <div style={{ marginBottom: (formData.phone && formData.phone.length !== 10) ? '5px' : '15px' }}>
                                <input className={`input ${formData.phone && formData.phone.length !== 10 ? 'warning' : ''}`} style={{ width: '100%', marginBottom: 0 }} placeholder="Phone *" value={formData.phone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setFormData({ ...formData, phone: val })
                                    }} required maxLength={10} />
                                {formData.phone && formData.phone.length !== 10 && (
                                    <div style={{ color: '#ffa502', fontSize: '13px', marginTop: '6px' }}>⚠ Phone number should be 10 digits (Warning)</div>
                                )}
                            </div>
                            <input className="input" placeholder="Email (optional)" value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            <textarea className="input" placeholder="Address (optional)" value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                            <div style={{ position: 'relative', marginBottom: (formData.gstin && !validateGSTIN(formData.gstin).isValid) ? '5px' : '15px' }}>
                                <input className={`input ${(formData.gstin && !validateGSTIN(formData.gstin).isValid) ? 'warning' : formData.gstin ? 'valid' : ''}`} 
                                    style={{ width: '100%', marginBottom: 0 }} 
                                    placeholder="GSTIN (optional)" 
                                    value={formData.gstin}
                                    onChange={(e) => {
                                        const val = formatGSTIN(e.target.value);
                                        setFormData({ ...formData, gstin: val })
                                    }}
                                    aria-label="GST Identification Number"
                                />
                                {formData.gstin && (
                                    <div style={{ 
                                        position: 'absolute', 
                                        right: '12px', 
                                        top: '12px', 
                                        fontSize: '14px',
                                        color: validateGSTIN(formData.gstin).isValid ? '#2ed573' : '#ffa502'
                                    }}>
                                        {validateGSTIN(formData.gstin).isValid ? '✓' : '⚠'}
                                    </div>
                                )}
                                {formData.gstin && !validateGSTIN(formData.gstin).isValid && (
                                    <div role="alert" style={{ color: '#ffa502', fontSize: '13px', marginTop: '6px' }}>⚠ {validateGSTIN(formData.gstin).errors[0]}</div>
                                )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                                <input className="input" placeholder="State" value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                                <input className="input" placeholder="State Code" value={formData.stateCode}
                                    onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })} />
                            </div>
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
