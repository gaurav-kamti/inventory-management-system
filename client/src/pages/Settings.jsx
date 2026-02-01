import { useState, useEffect } from 'react'
import api from '../utils/api'
import './Settings.css'

function Settings() {
    const [activeTab, setActiveTab] = useState('customers')
    const [customers, setCustomers] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [showCustomerModal, setShowCustomerModal] = useState(false)
    const [showSupplierModal, setShowSupplierModal] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState(null)
    const [editingSupplier, setEditingSupplier] = useState(null)

    const [customerForm, setCustomerForm] = useState({
        name: '', phone: '', email: '', address: '', pinCode: '', gstNumber: ''
    })
    const [supplierForm, setSupplierForm] = useState({
        name: '', contactPerson: '', phone: '', email: '', address: '', pinCode: '', gstNumber: ''
    })
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '', newPassword: '', confirmPassword: ''
    })
    const [invoiceForm, setInvoiceForm] = useState({
        prefix: 'RM/', sequence: 1, fiscalYear: '25-26'
    })

    useEffect(() => {
        fetchCustomers()
        fetchSuppliers()
        fetchInvoiceSettings()
    }, [])

    const fetchInvoiceSettings = async () => {
        try {
            const response = await api.get('/settings/invoice_config')
            if (response.data) {
                setInvoiceForm(response.data)
            }
        } catch (error) {
            console.error('Error fetching invoice settings:', error)
        }
    }

    const fetchCustomers = async () => {
        const response = await api.get('/customers')
        setCustomers(response.data)
    }

    const fetchSuppliers = async () => {
        const response = await api.get('/suppliers')
        setSuppliers(response.data)
    }

    const handleCustomerSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editingCustomer) {
                await api.put(`/customers/${editingCustomer.id}`, customerForm)
                alert('Customer updated successfully!')
            } else {
                await api.post('/customers', customerForm)
                alert('Customer added successfully!')
            }
            setShowCustomerModal(false)
            setEditingCustomer(null)
            fetchCustomers()
            setCustomerForm({ name: '', phone: '', email: '', address: '', pinCode: '', gstNumber: '' })
        } catch (error) {
            alert(error.response?.data?.error || 'Error saving customer')
        }
    }

    const handleSupplierSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editingSupplier) {
                await api.put(`/suppliers/${editingSupplier.id}`, supplierForm)
                alert('Supplier updated successfully!')
            } else {
                await api.post('/suppliers', supplierForm)
                alert('Supplier added successfully!')
            }
            setShowSupplierModal(false)
            setEditingSupplier(null)
            fetchSuppliers()
            setSupplierForm({ name: '', contactPerson: '', phone: '', email: '', address: '', pinCode: '', gstNumber: '' })
        } catch (error) {
            alert(error.response?.data?.error || 'Error saving supplier')
        }
    }

    const editCustomer = (customer) => {
        setEditingCustomer(customer)
        setCustomerForm({
            name: customer.name,
            phone: customer.phone,
            email: customer.email || '',
            address: customer.address || '',
            pinCode: customer.pinCode || '',
            gstNumber: customer.gstNumber || ''
        })
        setShowCustomerModal(true)
    }

    const editSupplier = (supplier) => {
        setEditingSupplier(supplier)
        setSupplierForm({
            name: supplier.name,
            contactPerson: supplier.contactPerson || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            address: supplier.address || '',
            pinCode: supplier.pinCode || '',
            gstNumber: supplier.gstNumber || ''
        })
        setShowSupplierModal(true)
    }

    const handlePasswordChange = async (e) => {
        e.preventDefault()
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            return alert('Passwords do not match!')
        }
        alert('Password change functionality - to be implemented')
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    }

    const handleInvoiceSettingsSubmit = async (e) => {
        e.preventDefault()
        try {
            await api.post('/settings', {
                key: 'invoice_config',
                value: {
                    ...invoiceForm,
                    sequence: parseInt(invoiceForm.sequence)
                }
            })
            alert('Invoice settings updated successfully!')
        } catch (error) {
            alert('Error updating invoice settings')
        }
    }

    return (
        <div className="settings-page">
            <h1 className="page-title">Settings</h1>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'customers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('customers')}
                >
                    <span>👥</span> Customers
                </button>
                <button
                    className={`tab ${activeTab === 'suppliers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('suppliers')}
                >
                    <span>🏢</span> Suppliers
                </button>
                <button
                    className={`tab ${activeTab === 'invoice' ? 'active' : ''}`}
                    onClick={() => setActiveTab('invoice')}
                >
                    <span>🧾</span> Invoice Config
                </button>
                <button
                    className={`tab ${activeTab === 'password' ? 'active' : ''}`}
                    onClick={() => setActiveTab('password')}
                >
                    <span>🔒</span> Security
                </button>
            </div>

            {activeTab === 'customers' && (
                <div className="card">
                    <div className="section-header">
                        <h2><span>👥</span> Customer List ({customers.length})</h2>
                        <button className="btn" style={{ background: 'var(--accent)', color: 'var(--bg-deep)' }} onClick={() => {
                            setEditingCustomer(null)
                            setCustomerForm({ name: '', phone: '', email: '', address: '', pinCode: '', gstNumber: '' })
                            setShowCustomerModal(true)
                        }}>
                            + Add New Customer
                        </button>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Customer Name</th>
                                    <th>Phone</th>
                                    <th>Address</th>
                                    <th>GST Number</th>
                                    <th style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map(customer => (
                                    <tr key={customer.id}>
                                        <td><strong style={{ color: 'var(--text-primary)' }}>{customer.name}</strong></td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{customer.phone}</td>
                                        <td>{customer.address ? `${customer.address}, ${customer.pinCode}` : <span style={{ opacity: 0.5 }}>Unrecorded</span>}</td>
                                        <td><span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{customer.gstNumber || '--'}</span></td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn" style={{ padding: '8px 16px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)' }} onClick={() => editCustomer(customer)}>
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'invoice' && (
                <div className="card">
                    <div className="section-header">
                        <h2><span>🧾</span> Invoice Configuration</h2>
                    </div>
                    <form onSubmit={handleInvoiceSettingsSubmit} className="settings-form">
                        <div className="form-group">
                            <label>Invoice Prefix (e.g. INV/)</label>
                            <input className="input" value={invoiceForm.prefix}
                                onChange={(e) => setInvoiceForm({ ...invoiceForm, prefix: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Starting Voucher No.</label>
                            <input type="number" className="input" value={invoiceForm.sequence}
                                onChange={(e) => setInvoiceForm({ ...invoiceForm, sequence: e.target.value })} />
                            <p style={{ marginTop: '12px', padding: '15px', background: 'rgba(142,182,155,0.05)', borderRadius: '12px', fontSize: '0.9rem', border: '1px solid var(--glass-border)' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Preview: </span>
                                <strong style={{ color: 'var(--accent)' }}>{invoiceForm.prefix}{String(invoiceForm.sequence).padStart(3, '0')}/{invoiceForm.fiscalYear}</strong>
                            </p>
                        </div>
                        <div className="form-group">
                            <label>Fiscal Year</label>
                            <input className="input" value={invoiceForm.fiscalYear}
                                onChange={(e) => setInvoiceForm({ ...invoiceForm, fiscalYear: e.target.value })} />
                        </div>
                        <button type="submit" className="btn" style={{ width: '100%', background: 'var(--accent)', color: 'var(--bg-deep)', padding: '18px' }}>Save Configuration</button>
                    </form>
                </div>
            )}

            {activeTab === 'suppliers' && (
                <div className="card">
                    <div className="section-header">
                        <h2><span>🏢</span> Supplier List ({suppliers.length})</h2>
                        <button className="btn" style={{ background: 'var(--accent)', color: 'var(--bg-deep)' }} onClick={() => {
                            setEditingSupplier(null)
                            setSupplierForm({ name: '', contactPerson: '', phone: '', email: '', address: '', pinCode: '', gstNumber: '' })
                            setShowSupplierModal(true)
                        }}>
                            + Add New Supplier
                        </button>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Supplier Name</th>
                                    <th>Contact Person</th>
                                    <th>Contact Detail</th>
                                    <th>GST Number</th>
                                    <th style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.map(supplier => (
                                    <tr key={supplier.id}>
                                        <td><strong style={{ color: 'var(--text-primary)' }}>{supplier.name}</strong></td>
                                        <td>{supplier.contactPerson || '--'}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{supplier.phone || supplier.email || '--'}</td>
                                        <td><span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{supplier.gstNumber || '--'}</span></td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn" style={{ padding: '8px 16px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)' }} onClick={() => editSupplier(supplier)}>
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'password' && (
                <div className="card">
                    <div className="section-header">
                        <h2><span>🔒</span> Change Password</h2>
                    </div>
                    <form onSubmit={handlePasswordChange} className="settings-form">
                        <div className="form-group">
                            <label>Current Password</label>
                            <input type="password" className="input" value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>New Password</label>
                            <input type="password" className="input" value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Confirm Password</label>
                            <input type="password" className="input" value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required />
                        </div>
                        <button type="submit" className="btn" style={{ width: '100%', background: 'var(--accent)', color: 'var(--bg-deep)', padding: '18px' }}>Update Password</button>
                    </form>
                </div>
            )}

            {/* Entity Modals */}
            {(showCustomerModal || showSupplierModal) && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(5, 31, 32, 0.9)', backdropFilter: 'blur(12px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }} onClick={() => { setShowCustomerModal(false); setShowSupplierModal(false); }}>
                    <div className="modal glass settings-modal" style={{
                        width: '90%', maxWidth: '700px', padding: '45px', background: 'var(--bg-dark)',
                        borderRadius: '32px', border: '1px solid var(--glass-border)'
                    }} onClick={(e) => e.stopPropagation()}>

                        <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '35px', color: 'var(--text-primary)' }}>
                            {showCustomerModal ? (editingCustomer ? 'Edit Customer' : 'Add Customer') : (editingSupplier ? 'Edit Supplier' : 'Add Supplier')}
                        </h2>

                        <form onSubmit={showCustomerModal ? handleCustomerSubmit : handleSupplierSubmit}>
                            <div className="settings-grid-form">
                                <div className="form-group full-width">
                                    <label>Name *</label>
                                    <input className="input" value={showCustomerModal ? customerForm.name : supplierForm.name}
                                        onChange={(e) => showCustomerModal ? setCustomerForm({ ...customerForm, name: e.target.value }) : setSupplierForm({ ...supplierForm, name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Phone Number *</label>
                                    <input className="input" value={showCustomerModal ? customerForm.phone : supplierForm.phone}
                                        onChange={(e) => showCustomerModal ? setCustomerForm({ ...customerForm, phone: e.target.value }) : setSupplierForm({ ...supplierForm, phone: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input className="input" value={showCustomerModal ? customerForm.email : supplierForm.email}
                                        onChange={(e) => showCustomerModal ? setCustomerForm({ ...customerForm, email: e.target.value }) : setSupplierForm({ ...supplierForm, email: e.target.value })} />
                                </div>
                                {showSupplierModal && (
                                    <div className="form-group full-width">
                                        <label>Contact Person</label>
                                        <input className="input" value={supplierForm.contactPerson}
                                            onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })} />
                                    </div>
                                )}
                                <div className="form-group full-width">
                                    <label>Address / Location</label>
                                    <textarea className="input" rows="3" value={showCustomerModal ? customerForm.address : supplierForm.address}
                                        onChange={(e) => showCustomerModal ? setCustomerForm({ ...customerForm, address: e.target.value }) : setSupplierForm({ ...supplierForm, address: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>PIN Code / Zip</label>
                                    <input className="input" value={showCustomerModal ? customerForm.pinCode : supplierForm.pinCode}
                                        onChange={(e) => showCustomerModal ? setCustomerForm({ ...customerForm, pinCode: e.target.value }) : setSupplierForm({ ...supplierForm, pinCode: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>GSTIN / Tax ID</label>
                                    <input className="input" value={showCustomerModal ? customerForm.gstNumber : supplierForm.gstNumber}
                                        onChange={(e) => showCustomerModal ? setCustomerForm({ ...customerForm, gstNumber: e.target.value }) : setSupplierForm({ ...supplierForm, gstNumber: e.target.value })} />
                                </div>
                            </div>

                            <div className="modal-actions" style={{ marginTop: '40px', display: 'flex', gap: '20px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }} onClick={() => { setShowCustomerModal(false); setShowSupplierModal(false); }}>Cancel</button>
                                <button type="submit" className="btn" style={{ background: 'var(--accent)', color: 'var(--bg-deep)', padding: '15px 40px' }}>
                                    {showCustomerModal ? (editingCustomer ? 'Update' : 'Create') : (editingSupplier ? 'Update' : 'Create')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Settings
