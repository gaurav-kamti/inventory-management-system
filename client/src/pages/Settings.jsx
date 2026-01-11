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
        name: '', phone: '', email: '', address: '', pinCode: '', gstNumber: '', creditLimit: 0
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
            setCustomerForm({ name: '', phone: '', email: '', address: '', pinCode: '', gstNumber: '', creditLimit: 0 })
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
            gstNumber: customer.gstNumber || '',
            creditLimit: customer.creditLimit || 0
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

            <div className="tabs glass">
                <button
                    className={`tab ${activeTab === 'customers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('customers')}
                >
                    👥 Customers
                </button>
                <button
                    className={`tab ${activeTab === 'suppliers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('suppliers')}
                >
                    🏢 Suppliers
                </button>
                <button
                    className={`tab ${activeTab === 'invoice' ? 'active' : ''}`}
                    onClick={() => setActiveTab('invoice')}
                >
                    🧾 Invoice
                </button>
                <button
                    className={`tab ${activeTab === 'password' ? 'active' : ''}`}
                    onClick={() => setActiveTab('password')}
                >
                    🔒 Change Password
                </button>
            </div>

            {activeTab === 'customers' && (
                <div className="card">
                    <div className="section-header">
                        <h2>Customer List</h2>
                        <button className="btn btn-primary" onClick={() => {
                            setEditingCustomer(null)
                            setCustomerForm({ name: '', phone: '', email: '', address: '', pinCode: '', gstNumber: '', creditLimit: 0 })
                            setShowCustomerModal(true)
                        }}>
                            + Add Customer
                        </button>
                    </div>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Address</th>
                                <th>PIN Code</th>
                                <th>GST Number</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(customer => (
                                <tr key={customer.id}>
                                    <td>{customer.name}</td>
                                    <td>{customer.phone}</td>
                                    <td>{customer.address || '-'}</td>
                                    <td>{customer.pinCode || '-'}</td>
                                    <td>{customer.gstNumber || '-'}</td>
                                    <td>
                                        <button className="btn-icon" onClick={() => editCustomer(customer)}>✏️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'invoice' && (
                <div className="card">
                    <h2 style={{ color: 'white', marginBottom: '20px' }}>Invoice Configuration</h2>
                    <form onSubmit={handleInvoiceSettingsSubmit} style={{ maxWidth: '500px' }}>
                        <div className="form-group">
                            <label>Invoice Prefix (e.g., RM/)</label>
                            <input className="input" value={invoiceForm.prefix}
                                onChange={(e) => setInvoiceForm({ ...invoiceForm, prefix: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Next Sequence Number</label>
                            <input type="number" className="input" value={invoiceForm.sequence}
                                onChange={(e) => setInvoiceForm({ ...invoiceForm, sequence: e.target.value })} />
                            <small style={{ color: '#ccc' }}>Generated: {invoiceForm.prefix}{String(invoiceForm.sequence).padStart(3, '0')}/{invoiceForm.fiscalYear}</small>
                        </div>
                        <div className="form-group">
                            <label>Fiscal Year (e.g., 25-26)</label>
                            <input className="input" value={invoiceForm.fiscalYear}
                                onChange={(e) => setInvoiceForm({ ...invoiceForm, fiscalYear: e.target.value })} />
                        </div>
                        <button type="submit" className="btn btn-primary">Save Settings</button>
                    </form>
                </div>
            )}

            {activeTab === 'suppliers' && (
                <div className="card">
                    <div className="section-header">
                        <h2>Supplier List</h2>
                        <button className="btn btn-primary" onClick={() => {
                            setEditingSupplier(null)
                            setSupplierForm({ name: '', contactPerson: '', phone: '', email: '', address: '', pinCode: '', gstNumber: '' })
                            setShowSupplierModal(true)
                        }}>
                            + Add Supplier
                        </button>
                    </div>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Contact Person</th>
                                <th>Phone</th>
                                <th>Address</th>
                                <th>PIN Code</th>
                                <th>GST Number</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suppliers.map(supplier => (
                                <tr key={supplier.id}>
                                    <td>{supplier.name}</td>
                                    <td>{supplier.contactPerson || '-'}</td>
                                    <td>{supplier.phone || '-'}</td>
                                    <td>{supplier.address || '-'}</td>
                                    <td>{supplier.pinCode || '-'}</td>
                                    <td>{supplier.gstNumber || '-'}</td>
                                    <td>
                                        <button className="btn-icon" onClick={() => editSupplier(supplier)}>✏️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'password' && (
                <div className="card">
                    <h2 style={{ color: 'white', marginBottom: '20px' }}>Change Password</h2>
                    <form onSubmit={handlePasswordChange} style={{ maxWidth: '500px' }}>
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
                            <label>Confirm New Password</label>
                            <input type="password" className="input" value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required />
                        </div>
                        <button type="submit" className="btn btn-primary">Change Password</button>
                    </form>
                </div>
            )}

            {showCustomerModal && (
                <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
                    <div className="modal glass" onClick={(e) => e.stopPropagation()}>
                        <h2>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
                        <form onSubmit={handleCustomerSubmit}>
                            <input className="input" placeholder="Name *" value={customerForm.name}
                                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} required />
                            <input className="input" placeholder="Phone *" value={customerForm.phone}
                                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} required />
                            <input className="input" placeholder="Email" value={customerForm.email}
                                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
                            <textarea className="input" placeholder="Address" value={customerForm.address}
                                onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} />
                            <input className="input" placeholder="PIN Code" value={customerForm.pinCode}
                                onChange={(e) => setCustomerForm({ ...customerForm, pinCode: e.target.value })} />
                            <input className="input" placeholder="GST Number" value={customerForm.gstNumber}
                                onChange={(e) => setCustomerForm({ ...customerForm, gstNumber: e.target.value })} />
                            <input type="number" className="input" placeholder="Credit Limit" value={customerForm.creditLimit}
                                onChange={(e) => setCustomerForm({ ...customerForm, creditLimit: e.target.value })} />
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCustomerModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingCustomer ? 'Update' : 'Add'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showSupplierModal && (
                <div className="modal-overlay" onClick={() => setShowSupplierModal(false)}>
                    <div className="modal glass" onClick={(e) => e.stopPropagation()}>
                        <h2>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
                        <form onSubmit={handleSupplierSubmit}>
                            <input className="input" placeholder="Supplier Name *" value={supplierForm.name}
                                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} required />
                            <input className="input" placeholder="Contact Person" value={supplierForm.contactPerson}
                                onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })} />
                            <input className="input" placeholder="Phone" value={supplierForm.phone}
                                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
                            <input className="input" placeholder="Email" value={supplierForm.email}
                                onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
                            <textarea className="input" placeholder="Address" value={supplierForm.address}
                                onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} />
                            <input className="input" placeholder="PIN Code" value={supplierForm.pinCode}
                                onChange={(e) => setSupplierForm({ ...supplierForm, pinCode: e.target.value })} />
                            <input className="input" placeholder="GST Number" value={supplierForm.gstNumber}
                                onChange={(e) => setSupplierForm({ ...supplierForm, gstNumber: e.target.value })} />
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowSupplierModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingSupplier ? 'Update' : 'Add'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Settings
