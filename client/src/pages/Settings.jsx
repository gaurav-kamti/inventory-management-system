import React, { useState, useEffect } from 'react'
import api from '../services/api'
import './Settings.css'

const INDIAN_STATES = [
    { name: 'Andaman & Nicobar Islands', code: '35' },
    { name: 'Andhra Pradesh', code: '37' },
    { name: 'Arunachal Pradesh', code: '12' },
    { name: 'Assam', code: '18' },
    { name: 'Bihar', code: '10' },
    { name: 'Chandigarh', code: '04' },
    { name: 'Chhattisgarh', code: '22' },
    { name: 'Dadra & Nagar Haveli and Daman & Diu', code: '26' },
    { name: 'Delhi', code: '07' },
    { name: 'Goa', code: '30' },
    { name: 'Gujarat', code: '24' },
    { name: 'Haryana', code: '06' },
    { name: 'Himachal Pradesh', code: '02' },
    { name: 'Jammu & Kashmir', code: '01' },
    { name: 'Jharkhand', code: '20' },
    { name: 'Karnataka', code: '29' },
    { name: 'Kerala', code: '32' },
    { name: 'Ladakh', code: '38' },
    { name: 'Lakshadweep', code: '31' },
    { name: 'Madhya Pradesh', code: '23' },
    { name: 'Maharashtra', code: '27' },
    { name: 'Manipur', code: '14' },
    { name: 'Meghalaya', code: '17' },
    { name: 'Mizoram', code: '15' },
    { name: 'Nagaland', code: '13' },
    { name: 'Odisha', code: '21' },
    { name: 'Puducherry', code: '34' },
    { name: 'Punjab', code: '03' },
    { name: 'Rajasthan', code: '08' },
    { name: 'Sikkim', code: '11' },
    { name: 'Tamil Nadu', code: '33' },
    { name: 'Telangana', code: '36' },
    { name: 'Tripura', code: '16' },
    { name: 'Uttar Pradesh', code: '09' },
    { name: 'Uttarakhand', code: '05' },
    { name: 'West Bengal', code: '19' },
]

function Field({ label, required, children, className = '' }) {
    return (
        <div className={`cp-field ${className}`}>
            <label className="cp-label">
                {label}
                {required && <span className="cp-label-required">·</span>}
            </label>
            {children}
        </div>
    )
}

function Input({ value, onChange, placeholder, maxLength, className = '', ...props }) {
    const len = value?.length || 0
    const isValid = value && value.length > 0
    const stateClass = isValid ? 'valid' : ''
    return (
        <div className="cp-input-wrap" style={{ width: '100%', position: 'relative' }}>
            <input
                className={`cp-input ${stateClass} ${className}`}
                value={value || ''}
                onChange={onChange}
                placeholder={placeholder}
                maxLength={maxLength}
                {...props}
            />
            {maxLength && len > 0 && (
                <span className="cp-char-count" style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                }}>
                    {len}/{maxLength}
                </span>
            )}
        </div>
    )
}

function PrefixInput({ prefix, value, onChange, placeholder }) {
    const isValid = value && value.length > 0
    return (
        <div className="cp-input-prefix">
            <span className="cp-prefix-tag">{prefix}</span>
            <input
                className={`cp-input ${isValid ? 'valid' : ''}`}
                value={value || ''}
                onChange={onChange}
                placeholder={placeholder}
            />
        </div>
    )
}

function Settings() {
    const [activeTab, setActiveTab] = useState('profile')
    const [customers, setCustomers] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [showCustomerModal, setShowCustomerModal] = useState(false)
    const [showSupplierModal, setShowSupplierModal] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState(null)
    const [editingSupplier, setEditingSupplier] = useState(null)
    const [expandedId, setExpandedId] = useState(null)

    const [customerForm, setCustomerForm] = useState({
        name: '', phone: '', email: '', address: '', pinCode: '', gstNumber: '', state: 'West Bengal', stateCode: '19'
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
    const [companyForm, setCompanyForm] = useState({
        name: 'R.M.TRADING',
        address: '2 & 3 MAHENDRA NATH ROY LANE,\nMULLICK FATAK, GROUND FLOOR\nHOWRAH 711101',
        pincode: '',
        gstin: '19ABKFR7112F1Z3',
        pan: 'ABKFR7112F',
        phone: '7003866764',
        altPhone: '',
        email: 'rmtrading65@gmail.com',
        altEmail: 'manishjee789@gmail.com',
        state: 'West Bengal',
        stateCode: '19',
        bankName: 'IDBI BANK',
        accNo: '0359102000049443',
        ifsc: 'IBKL0000359',
        branch: 'Howrah',
        jurisdiction: 'Howrah',
    })

    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [showToast, setShowToast] = useState(false)
    const [errors, setErrors] = useState({})
    const [lastSaved, setLastSaved] = useState(null)

    useEffect(() => {
        fetchCustomers()
        fetchSuppliers()
        fetchInvoiceSettings()
        fetchCompanyProfile()
    }, [])

    const fetchInvoiceSettings = async () => {
        try {
            const response = await api.get('/settings/invoice_config')
            if (response.data) setInvoiceForm(response.data)
        } catch (error) {
            console.error('Error fetching invoice settings:', error)
        }
    }

    const fetchCompanyProfile = async () => {
        try {
            const response = await api.get('/settings/company_profile')
            if (response.data) setCompanyForm(prev => ({ ...prev, ...response.data }))
        } catch (error) {
            console.error('Error fetching company profile:', error)
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
            setCustomerForm({ name: '', phone: '', email: '', address: '', pinCode: '', gstNumber: '', state: 'West Bengal', stateCode: '19' })
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
            state: customer.state || 'West Bengal',
            stateCode: customer.stateCode || '19'
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

    const validateCompany = () => {
        const errs = {}
        if (!companyForm.name.trim()) errs.name = 'Company name is required'
        if (!companyForm.gstin.trim()) errs.gstin = 'GSTIN is required'
        else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(companyForm.gstin))
            errs.gstin = 'Invalid GSTIN format'
        if (!companyForm.pan.trim()) errs.pan = 'PAN is required'
        else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(companyForm.pan))
            errs.pan = 'Invalid PAN format'
        if (!companyForm.phone.trim()) errs.phone = 'Primary phone is required'
        if (!companyForm.email.trim()) errs.email = 'Email is required'
        return errs
    }

    const handleCompanyProfileSubmit = async (e) => {
        if (e) e.preventDefault()
        const errs = validateCompany()
        if (Object.keys(errs).length > 0) {
            setErrors(errs)
            return
        }
        setErrors({})
        setSaving(true)
        try {
            await api.post('/settings', {
                key: 'company_profile',
                value: companyForm
            })
            setSaving(false)
            setSaved(true)
            setLastSaved(new Date())
            setShowToast(true)
            setTimeout(() => {
                setSaved(false)
                setShowToast(false)
            }, 3000)
        } catch (error) {
            setSaving(false)
            alert('Error updating company profile')
        }
    }

    return (
        <div className="settings-page">
            <div className="settings-sticky-header">
                <h1 className="page-title">Settings</h1>

                <div className="tabs">
                    <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                        <span>🏢</span> Company Profile
                    </button>
                    <button className={`tab ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>
                        <span>👥</span> Customers
                    </button>
                    <button className={`tab ${activeTab === 'suppliers' ? 'active' : ''}`} onClick={() => setActiveTab('suppliers')}>
                        <span>🏢</span> Suppliers
                    </button>
                    <button className={`tab ${activeTab === 'invoice' ? 'active' : ''}`} onClick={() => setActiveTab('invoice')}>
                        <span>🧾</span> Invoice Config
                    </button>
                    <button className={`tab ${activeTab === 'password' ? 'active' : ''}`} onClick={() => setActiveTab('password')}>
                        <span>🔒</span> Security
                    </button>
                </div>
            </div>

            {activeTab === 'profile' && (
                <div className="cp-container">
                    <div className="cp-header">
                        <div className="cp-header-left">
                            <div className="cp-eyebrow">Settings · Business</div>
                            <h1 className="cp-title">Company <em>Profile</em></h1>
                        </div>
                        <div className="cp-header-badge">
                            {lastSaved
                                ? `Last saved: ${String(lastSaved.getDate()).padStart(2, '0')}/${String(lastSaved.getMonth() + 1).padStart(2, '0')}/${lastSaved.getFullYear()}`
                                : 'Not yet saved'
                            }
                        </div>
                    </div>

                    <div className="cp-section">
                        <div className="cp-section-header">
                            <div className="cp-section-icon">◈</div>
                            <span className="cp-section-title">Business Identity</span>
                            <span className="cp-section-num">01 / 03</span>
                        </div>
                        <div className="cp-fields">
                            <Field label="Company Name" required error={errors.name}>
                                <Input value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} placeholder="M/s. Your Trading Co." maxLength={80} />
                            </Field>

                            <div className="cp-state-row">
                                <Field label="State">
                                    <select
                                        className={`cp-select ${companyForm.state ? 'valid' : ''}`}
                                        value={companyForm.state}
                                        onChange={(e) => {
                                            const selected = INDIAN_STATES.find(s => s.name === e.target.value)
                                            setCompanyForm(f => ({ ...f, state: e.target.value, stateCode: selected?.code || '' }))
                                        }}
                                    >
                                        <option value="">Select State</option>
                                        {INDIAN_STATES.map(s => (
                                            <option key={s.code} value={s.name}>{s.name}</option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Code">
                                    <input
                                        className={`cp-input cp-code-input ${companyForm.stateCode ? 'valid' : ''}`}
                                        value={companyForm.stateCode || ''}
                                        readOnly
                                        placeholder="—"
                                        style={{ textAlign: 'center', cursor: 'default', opacity: companyForm.stateCode ? 1 : 0.5 }}
                                    />
                                </Field>
                                <Field label="PIN Code">
                                    <Input value={companyForm.pincode} onChange={(e) => setCompanyForm({ ...companyForm, pincode: e.target.value })} placeholder="700 000" maxLength={6} />
                                </Field>
                            </div>

                            <Field label="Address" required>
                                <textarea
                                    className={`cp-input ${companyForm.address ? 'valid' : ''}`}
                                    value={companyForm.address || ''}
                                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                                    placeholder="Street, Area, City"
                                    rows={3}
                                />
                            </Field>

                            <div className="cp-grid-3">
                                <Field label="GSTIN" required error={errors.gstin}>
                                    <Input
                                        value={companyForm.gstin}
                                        onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value.toUpperCase() })}
                                        placeholder="19ABCDE1234F1Z5"
                                        maxLength={15}
                                        className={errors.gstin ? 'error' : ''}
                                    />
                                </Field>
                                <Field label="PAN" required error={errors.pan}>
                                    <Input
                                        value={companyForm.pan}
                                        onChange={(e) => setCompanyForm({ ...companyForm, pan: e.target.value.toUpperCase() })}
                                        placeholder="ABCDE1234F"
                                        maxLength={10}
                                        className={errors.pan ? 'error' : ''}
                                    />
                                </Field>
                                <Field label="Jurisdiction">
                                    <Input value={companyForm.jurisdiction} onChange={(e) => setCompanyForm({ ...companyForm, jurisdiction: e.target.value })} placeholder="Howrah" />
                                </Field>
                            </div>
                        </div>
                    </div>

                    <div className="cp-section">
                        <div className="cp-section-header">
                            <div className="cp-section-icon">◉</div>
                            <span className="cp-section-title">Contact Details</span>
                            <span className="cp-section-num">02 / 03</span>
                        </div>
                        <div className="cp-fields">
                            <div style={{ display: 'grid', gridTemplateColumns: '55% 1fr', gap: '24px', alignItems: 'start' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    <Field label="Primary Phone" required error={errors.phone}>
                                        <PrefixInput prefix="+91" value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} placeholder="9876543210" />
                                    </Field>
                                    <Field label="Alternate Phone">
                                        <PrefixInput prefix="+91" value={companyForm.altPhone} onChange={(e) => setCompanyForm({ ...companyForm, altPhone: e.target.value })} placeholder="9876543210" />
                                    </Field>
                                </div>
                                <Field label="Email" required error={errors.email}>
                                    <Input type="email" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} placeholder="company@email.com" className={errors.email ? 'error' : ''} />
                                </Field>
                            </div>
                        </div>
                    </div>

                    <div className="cp-section">
                        <div className="cp-section-header">
                            <div className="cp-section-icon">⬡</div>
                            <span className="cp-section-title">Bank Details</span>
                            <span className="cp-section-num">03 / 03</span>
                        </div>
                        <div className="cp-fields">
                            <div className="cp-grid-2">
                                <Field label="Bank Name">
                                    <Input value={companyForm.bankName} onChange={(e) => setCompanyForm({ ...companyForm, bankName: e.target.value })} placeholder="IDBI Bank" />
                                </Field>
                                <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                                    <Field label="Account Number">
                                        <div style={{ maxWidth: '45%', minWidth: '180px' }}>
                                            <Input value={companyForm.accNo} onChange={(e) => setCompanyForm({ ...companyForm, accNo: e.target.value })} placeholder="000000000000000" />
                                        </div>
                                    </Field>
                                    <Field label="IFSC Code">
                                        <Input value={companyForm.ifsc} onChange={(e) => setCompanyForm({ ...companyForm, ifsc: e.target.value.toUpperCase() })} placeholder="IBKL0000359" maxLength={11} />
                                    </Field>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="cp-footer">
                        <div className="cp-footer-note">
                            Changes apply to all future invoices.<br />
                            Existing records remain unaffected.
                        </div>
                        <button className={`cp-save-btn ${saving ? 'saving' : ''} ${saved ? 'saved' : ''}`} onClick={handleCompanyProfileSubmit} disabled={saving}>
                            <span className="btn-text">{saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Profile'}</span>
                        </button>
                    </div>

                    <div className={`cp-toast ${showToast ? 'show' : ''}`}>✓ Profile updated successfully</div>
                </div>
            )}

            {activeTab === 'customers' && (
                <div className="card">
                    <div className="section-header">
                        <h2><span>👥</span> Customer List ({customers.length})</h2>
                        <button className="btn" style={{ background: 'var(--accent)', color: 'var(--bg-deep)' }} onClick={() => {
                            setEditingCustomer(null)
                            setCustomerForm({ name: '', phone: '', email: '', address: '', pinCode: '', gstNumber: '', state: 'West Bengal', stateCode: '19' })
                            setShowCustomerModal(true)
                        }}>+ Add New Customer</button>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr><th>Customer Name</th><th>Phone</th><th style={{ textAlign: 'right' }}>Action</th></tr>
                            </thead>
                            <tbody>
                                {customers.map(customer => (
                                    <React.Fragment key={customer.id}>
                                        <tr style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === `c-${customer.id}` ? null : `c-${customer.id}`)}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ transition: '0.3s', display: 'inline-block', transform: expandedId === `c-${customer.id}` ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                                                    <strong style={{ color: 'var(--text-primary)' }}>{customer.name}</strong>
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{customer.phone}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="btn" style={{ padding: '8px 16px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)' }} onClick={(e) => { e.stopPropagation(); editCustomer(customer); }}>Edit</button>
                                            </td>
                                        </tr>
                                        {expandedId === `c-${customer.id}` && (
                                            <tr style={{ background: 'rgba(142, 182, 155, 0.05)', animation: 'slideDown 0.3s ease-out' }}>
                                                <td colSpan="3" style={{ padding: '20px' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                        <div><p style={{ margin: '0 0 5px 0', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800' }}>Full Address</p><p>{customer.address ? `${customer.address}, ${customer.pinCode}` : 'N/A'}</p></div>
                                                        <div><p style={{ margin: '0 0 5px 0', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800' }}>GSTIN</p><p style={{ fontFamily: 'monospace' }}>{customer.gstNumber || 'Not Registered'}</p></div>
                                                        <div><p style={{ margin: '0 0 5px 0', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800' }}>Email</p><p>{customer.email || 'N/A'}</p></div>
                                                        <div><p style={{ margin: '0 0 5px 0', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800' }}>State</p><p>{customer.state || 'N/A'} (Code: {customer.stateCode || '--'})</p></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'invoice' && (
                <div className="card">
                    <div className="section-header"><h2><span>🧾</span> Invoice Configuration</h2></div>
                    <form onSubmit={handleInvoiceSettingsSubmit} className="settings-form">
                        <div className="form-group"><label>Invoice Prefix</label><input className="input" value={invoiceForm.prefix || ''} onChange={(e) => setInvoiceForm({ ...invoiceForm, prefix: e.target.value })} /></div>
                        <div className="form-group"><label>Starting Voucher No.</label><input type="number" className="input" value={invoiceForm.sequence || ''} onChange={(e) => setInvoiceForm({ ...invoiceForm, sequence: e.target.value })} />
                            <p style={{ marginTop: '12px', padding: '15px', background: 'rgba(142,182,155,0.05)', borderRadius: '12px', fontSize: '0.9rem', border: '1px solid var(--glass-border)' }}>Preview: <strong style={{ color: 'var(--accent)' }}>{invoiceForm.prefix}{String(invoiceForm.sequence).padStart(3, '0')}/{invoiceForm.fiscalYear}</strong></p>
                        </div>
                        <div className="form-group"><label>Fiscal Year</label><input className="input" value={invoiceForm.fiscalYear || ''} onChange={(e) => setInvoiceForm({ ...invoiceForm, fiscalYear: e.target.value })} /></div>
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
                        }}>+ Add New Supplier</button>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr><th>Supplier Name</th><th>Contact Detail</th><th style={{ textAlign: 'right' }}>Action</th></tr>
                            </thead>
                            <tbody>
                                {suppliers.map(supplier => (
                                    <React.Fragment key={supplier.id}>
                                        <tr style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === `s-${supplier.id}` ? null : `s-${supplier.id}`)}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ transition: '0.3s', display: 'inline-block', transform: expandedId === `s-${supplier.id}` ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                                                    <strong style={{ color: 'var(--text-primary)' }}>{supplier.name}</strong>
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{supplier.phone || supplier.email || '--'}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="btn" style={{ padding: '8px 16px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)' }} onClick={(e) => { e.stopPropagation(); editSupplier(supplier); }}>Edit</button>
                                            </td>
                                        </tr>
                                        {expandedId === `s-${supplier.id}` && (
                                            <tr style={{ background: 'rgba(142, 182, 155, 0.05)', animation: 'slideDown 0.3s ease-out' }}>
                                                <td colSpan="3" style={{ padding: '20px' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                        <div><p style={{ margin: '0 0 5px 0', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800' }}>Contact Person</p><p>{supplier.contactPerson || 'N/A'}</p></div>
                                                        <div><p style={{ margin: '0 0 5px 0', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800' }}>GSTIN</p><p style={{ fontFamily: 'monospace' }}>{supplier.gstNumber || 'Not Registered'}</p></div>
                                                        <div style={{ gridColumn: 'span 2' }}><p style={{ margin: '0 0 5px 0', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800' }}>Address</p><p>{supplier.address ? `${supplier.address}, ${supplier.pinCode}` : 'N/A'}</p></div>
                                                        <div><p style={{ margin: '0 0 5px 0', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800' }}>Email</p><p>{supplier.email || 'N/A'}</p></div>
                                                        <div><p style={{ margin: '0 0 5px 0', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800' }}>Phone</p><p>{supplier.phone || 'N/A'}</p></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'password' && (
                <div className="card">
                    <div className="section-header"><h2><span>🔒</span> Change Password</h2></div>
                    <form onSubmit={handlePasswordChange} className="settings-form">
                        <div className="form-group"><label>Current Password</label><input type="password" className="input" value={passwordForm.currentPassword || ''} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required /></div>
                        <div className="form-group"><label>New Password</label><input type="password" className="input" value={passwordForm.newPassword || ''} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required /></div>
                        <div className="form-group"><label>Confirm Password</label><input type="password" className="input" value={passwordForm.confirmPassword || ''} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required /></div>
                        <button type="submit" className="btn" style={{ width: '100%', background: 'var(--accent)', color: 'var(--bg-deep)', padding: '18px' }}>Update Password</button>
                    </form>
                </div>
            )}

            {(showCustomerModal || showSupplierModal) && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(5, 31, 32, 0.9)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => { setShowCustomerModal(false); setShowSupplierModal(false); }}>
                    <div className="modal glass settings-modal" style={{ width: '90%', maxWidth: '700px', padding: '45px', background: 'var(--bg-dark)', borderRadius: '32px', border: '1px solid var(--glass-border)' }} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '35px', color: 'var(--text-primary)' }}>{showCustomerModal ? (editingCustomer ? 'Edit Customer' : 'Add Customer') : (editingSupplier ? 'Edit Supplier' : 'Add Supplier')}</h2>
                        <form onSubmit={showCustomerModal ? handleCustomerSubmit : handleSupplierSubmit}>
                            <div className="settings-grid-form">
                                <div className="form-group full-width"><label>Name *</label><input className="input" value={(showCustomerModal ? customerForm.name : supplierForm.name) || ''} onChange={(e) => showCustomerModal ? setCustomerForm({ ...customerForm, name: e.target.value }) : setSupplierForm({ ...supplierForm, name: e.target.value })} required /></div>
                                <div className="form-group"><label>Phone *</label><input className="input" value={(showCustomerModal ? customerForm.phone : supplierForm.phone) || ''} onChange={(e) => showCustomerModal ? setCustomerForm({ ...customerForm, phone: e.target.value }) : setSupplierForm({ ...supplierForm, phone: e.target.value })} required /></div>
                                <div className="form-group"><label>Email</label><input className="input" value={(showCustomerModal ? customerForm.email : supplierForm.email) || ''} onChange={(e) => showCustomerModal ? setCustomerForm({ ...customerForm, email: e.target.value }) : setSupplierForm({ ...supplierForm, email: e.target.value })} /></div>
                                {showSupplierModal && <div className="form-group full-width"><label>Contact Person</label><input className="input" value={supplierForm.contactPerson || ''} onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })} /></div>}
                                <div className="form-group full-width"><label>Address</label><textarea className="input" rows="3" value={(showCustomerModal ? customerForm.address : supplierForm.address) || ''} onChange={(e) => showCustomerModal ? setCustomerForm({ ...customerForm, address: e.target.value }) : setSupplierForm({ ...supplierForm, address: e.target.value })} /></div>
                                <div className="form-group"><label>PIN Code</label><input className="input" value={(showCustomerModal ? customerForm.pinCode : supplierForm.pinCode) || ''} onChange={(e) => showCustomerModal ? setCustomerForm({ ...customerForm, pinCode: e.target.value }) : setSupplierForm({ ...supplierForm, pinCode: e.target.value })} /></div>
                                <div className="form-group"><label>GSTIN</label><input className="input" value={(showCustomerModal ? customerForm.gstNumber : supplierForm.gstNumber) || ''} onChange={(e) => showCustomerModal ? setCustomerForm({ ...customerForm, gstNumber: e.target.value }) : setSupplierForm({ ...supplierForm, gstNumber: e.target.value })} /></div>
                                {showCustomerModal && (
                                    <>
                                        <div className="form-group"><label>State</label><input className="input" value={customerForm.state || ''} onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })} /></div>
                                        <div className="form-group"><label>Code</label><input className="input" value={customerForm.stateCode || ''} onChange={(e) => setCustomerForm({ ...customerForm, stateCode: e.target.value })} /></div>
                                    </>
                                )}
                            </div>
                            <div className="modal-actions" style={{ marginTop: '40px', display: 'flex', gap: '20px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }} onClick={() => { setShowCustomerModal(false); setShowSupplierModal(false); }}>Cancel</button>
                                <button type="submit" className="btn" style={{ background: 'var(--accent)', color: 'var(--bg-deep)', padding: '15px 40px' }}>{showCustomerModal ? (editingCustomer ? 'Update' : 'Create') : (editingSupplier ? 'Update' : 'Create')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Settings
