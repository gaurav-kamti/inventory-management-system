import React, { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { validateGSTIN, formatGSTIN } from '../utils/gstUtils'
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

function Field({ label, required, children, error, warning, className = '' }) {
    return (
        <div className={`cp-field ${className}`}>
            <label className="cp-label">
                {label}
                {required && <span className="cp-label-required">·</span>}
            </label>
            {children}
            {error && <div role="alert" style={{color: 'var(--cp-error)', fontSize: '13px', marginTop: '6px'}}>{error}</div>}
            {!error && warning && <div role="alert" style={{color: 'var(--cp-warning)', fontSize: '13px', marginTop: '6px'}}>⚠ {warning}</div>}
        </div>
    )
}

function Input({ value, onChange, placeholder, maxLength, className = '', inputRef, ...props }) {
    const len = value?.length || 0
    const isValid = value && value.length > 0
    const stateClass = isValid ? 'valid' : ''
    return (
        <div className="cp-input-wrap" style={{ width: '100%', position: 'relative' }}>
            <input
                ref={inputRef}
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

function PrefixInput({ prefix, value, onChange, placeholder, maxLength, className = '' }) {
    const isValid = value && value.length > 0
    return (
        <div className="cp-input-prefix">
            <span className="cp-prefix-tag">{prefix}</span>
            <input
                className={`cp-input ${className} ${isValid ? 'valid' : ''}`}
                value={value || ''}
                onChange={onChange}
                placeholder={placeholder}
                maxLength={maxLength}
            />
        </div>
    )
}

function Settings() {
    const [activeTab, setActiveTab] = useState('profile')
    const [activeDbSubTab, setActiveDbSubTab] = useState('customers')
    const [customers, setCustomers] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [products, setProducts] = useState([])

    // Modals
    const [showCustomerModal, setShowCustomerModal] = useState(false)
    const [showSupplierModal, setShowSupplierModal] = useState(false)
    const [showProductModal, setShowProductModal] = useState(false)

    const [editingCustomer, setEditingCustomer] = useState(null)
    const [editingSupplier, setEditingSupplier] = useState(null)
    const [editingProduct, setEditingProduct] = useState(null)

    const [expandedId, setExpandedId] = useState(null)

    const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '', address: '', pincode: '', gstin: '', state: 'West Bengal', stateCode: '19' })
    const [supplierForm, setSupplierForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '', pincode: '', gstin: '' })
    
    // Auto-focus ref for Customer/Supplier Modals
    const nameInputRef = useRef(null)

    useEffect(() => {
        if (showCustomerModal || showSupplierModal) {
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
    }, [showCustomerModal, showSupplierModal])
    const [productForm, setProductForm] = useState({ name: '', purchasePrice: '', sellingPrice: '', stock: '', hsn: '8301', gst: 18, quantityUnit: 'Pcs' })
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '', newPassword: '', confirmPassword: ''
    })
    const [invoiceForm, setInvoiceForm] = useState({
        prefix: 'RM', sequence: 1, fiscalYear: '25-26'
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
        fetchData()
        fetchInvoiceSettings()
        fetchCompanyProfile()
    }, [])

    const fetchData = async () => {
        try {
            const [custRes, suppRes, prodRes] = await Promise.all([
                api.get('/customers'),
                api.get('/suppliers'),
                api.get('/products')
            ])
            setCustomers(custRes.data)
            setSuppliers(suppRes.data)
            setProducts(prodRes.data)
        } catch (error) {
            console.error('Error fetching data:', error)
        }
    }

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
        
        if (customerForm.phone) {
            if (/\s/.test(customerForm.phone)) return alert('Phone number cannot contain spaces')
            if (!/^\d+$/.test(customerForm.phone)) return alert('Phone number must contain only numeric characters')
            if (customerForm.phone.length !== 10) return alert('Phone number must be exactly 10 digits')
        } else {
            return alert('Phone is required for customers')
        }
        
        try {
            if (editingCustomer) {
                await api.put(`/customers/${editingCustomer.id}`, customerForm)
            } else {
                await api.post('/customers', customerForm)
            }
            setShowCustomerModal(false)
            setEditingCustomer(null)
            fetchData()
        } catch (error) {
            alert(error.response?.data?.error || 'Error saving customer')
        }
    }

    const handleSupplierSubmit = async (e) => {
        e.preventDefault()
        
        if (supplierForm.phone) {
            if (/\s/.test(supplierForm.phone)) return alert('Phone number cannot contain spaces')
            if (!/^\d+$/.test(supplierForm.phone)) return alert('Phone number must contain only numeric characters')
            if (supplierForm.phone.length !== 10) return alert('Phone number must be exactly 10 digits')
        }
        
        try {
            if (editingSupplier) {
                await api.put(`/suppliers/${editingSupplier.id}`, supplierForm)
            } else {
                await api.post('/suppliers', supplierForm)
            }
            setShowSupplierModal(false)
            setEditingSupplier(null)
            fetchData()
        } catch (error) {
            alert(error.response?.data?.error || 'Error saving supplier')
        }
    }

    const deleteCustomer = async (id) => {
        if (window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
            try {
                await api.delete(`/customers/${id}`)
                fetchData()
            } catch (error) {
                alert('Error deleting customer: ' + (error.response?.data?.error || error.message))
            }
        }
    }

    const deleteSupplier = async (id) => {
        if (window.confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) {
            try {
                await api.delete(`/suppliers/${id}`)
                fetchData()
            } catch (error) {
                alert('Error deleting supplier: ' + (error.response?.data?.error || error.message))
            }
        }
    }

    const editCustomer = (customer) => {
        setEditingCustomer(customer)
        setCustomerForm({
            name: customer.name,
            phone: customer.phone,
            email: customer.email || '',
            address: customer.address || '',
            pincode: customer.pincode || '',
            gstin: customer.gstin || '',
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
            pincode: supplier.pincode || '',
            gstin: supplier.gstin || ''
        })
        setShowSupplierModal(true)
    }

    const handleProductSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editingProduct) {
                await api.put(`/products/${editingProduct.id}`, productForm)
            } else {
                await api.post('/products', productForm)
            }
            setShowProductModal(false)
            setEditingProduct(null)
            fetchData()
        } catch (error) {
            alert(error.response?.data?.error || 'Error saving product')
        }
    }

    const deleteProduct = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await api.delete(`/products/${id}`)
                fetchData()
            } catch (error) {
                alert('Error deleting product')
            }
        }
    }

    const editProduct = (product) => {
        setEditingProduct(product)
        setProductForm({
            name: product.name,
            purchasePrice: product.purchasePrice,
            sellingPrice: product.sellingPrice,
            stock: product.stock,
            hsn: product.hsn,
            gst: product.gst,
            quantityUnit: product.quantityUnit || 'Pcs'
        })
        setShowProductModal(true)
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
        const hardErrors = {}
        const warnings = {}
        
        if (!companyForm.name.trim()) hardErrors.name = 'Company name is required'
        if (!companyForm.state.trim()) hardErrors.state = 'State is required'
        if (!companyForm.address.trim()) hardErrors.address = 'Address is required'
        if (!companyForm.phone.trim()) hardErrors.phone = 'Primary phone is required'
        if (!companyForm.email.trim()) hardErrors.email = 'Email is required'

        // Formatting issues are warnings
        const gstinResult = companyForm.gstin ? validateGSTIN(companyForm.gstin) : { isValid: true };
        if (companyForm.gstin && !gstinResult.isValid)
            warnings.gstin = gstinResult.errors[0] + ' (Warning Only)'
        if (companyForm.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(companyForm.pan))
            warnings.pan = 'Invalid PAN format (Warning Only)'
        if (companyForm.phone && companyForm.phone.length !== 10)
            warnings.phone = 'Phone should be 10 digits (Warning Only)'
        if (companyForm.altPhone && companyForm.altPhone.length !== 10)
            warnings.altPhone = 'Alternate phone should be 10 digits (Warning Only)'
            
        return { hardErrors, warnings }
    }

    const handleCompanyProfileSubmit = async (e) => {
        if (e) e.preventDefault()
        const { hardErrors, warnings } = validateCompany()
        
        // Merge warnings for inline display, but don't block
        setErrors({ ...warnings, ...hardErrors })
        
        if (Object.keys(hardErrors).length > 0) {
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
                    <button className={`tab ${activeTab === 'database' ? 'active' : ''}`} onClick={() => setActiveTab('database')}>
                        <span className="icon">📂</span> DataBase
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
                                <Field 
                                    label="GSTIN" 
                                    required 
                                    warning={(companyForm.gstin && !validateGSTIN(companyForm.gstin).isValid) ? validateGSTIN(companyForm.gstin).errors[0] : null}
                                    error={errors.gstin && !companyForm.gstin ? errors.gstin : null}
                                >
                                    <div style={{ position: 'relative' }}>
                                        <Input
                                            value={companyForm.gstin}
                                            onChange={(e) => {
                                                const formatted = formatGSTIN(e.target.value);
                                                setCompanyForm({ ...companyForm, gstin: formatted });
                                            }}
                                            placeholder="19ABCDE1234F1Z5"
                                            className={(companyForm.gstin && !validateGSTIN(companyForm.gstin).isValid) ? 'warning' : companyForm.gstin ? 'valid' : ''}
                                            aria-label="GST Identification Number"
                                        />
                                        {companyForm.gstin && (
                                            <div role="alert" style={{ 
                                                position: 'absolute', 
                                                right: '12px', 
                                                top: '50%', 
                                                transform: 'translateY(-50%)',
                                                fontSize: '14px',
                                                color: validateGSTIN(companyForm.gstin).isValid ? 'var(--cp-success, #2ed573)' : 'var(--cp-warning, #ffa502)'
                                            }}>
                                                {validateGSTIN(companyForm.gstin).isValid ? '✓' : '⚠'}
                                            </div>
                                        )}
                                    </div>
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
                                    <Field 
                                        label="Primary Phone" 
                                        required 
                                        error={errors.phone && !companyForm.phone ? errors.phone : null}
                                        warning={companyForm.phone && companyForm.phone.length !== 10 ? 'Phone number should be exactly 10 digits (Warning)' : null}
                                    >
                                        <PrefixInput 
                                            prefix="+91" 
                                            value={companyForm.phone} 
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setCompanyForm({ ...companyForm, phone: val });
                                            }} 
                                            placeholder="9876543210" 
                                            maxLength={10}
                                            className={(companyForm.phone && companyForm.phone.length !== 10) ? 'warning' : ''}
                                        />
                                    </Field>
                                    <Field 
                                        label="Alternate Phone" 
                                        warning={(companyForm.altPhone && companyForm.altPhone.length !== 10) ? 'Phone number should be exactly 10 digits (Warning)' : null}
                                    >
                                        <PrefixInput 
                                            prefix="+91" 
                                            value={companyForm.altPhone} 
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setCompanyForm({ ...companyForm, altPhone: val });
                                            }} 
                                            placeholder="9876543210" 
                                            maxLength={10}
                                            className={(companyForm.altPhone && companyForm.altPhone.length !== 10) ? 'warning' : ''}
                                        />
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
                        <button 
                            className={`cp-save-btn ${saving ? 'saving' : ''} ${saved ? 'saved' : ''}`} 
                            onClick={handleCompanyProfileSubmit} 
                            disabled={saving}
                        >
                            <span className="btn-text">{saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Profile'}</span>
                        </button>
                    </div>

                    <div className={`cp-toast ${showToast ? 'show' : ''}`}>✓ Profile updated successfully</div>
                </div>
            )}

            {activeTab === 'database' && (
                <div className="cp-container cp-database-context">
                    <div className="cp-header">
                        <div className="cp-header-left">
                            <div className="cp-eyebrow">Settings · Assets</div>
                            <h1 className="cp-title">Master <em>DataBase</em></h1>
                        </div>
                        <div className="cp-db-nav">
                            <button className={`cp-sub-tab ${activeDbSubTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveDbSubTab('customers')}>
                                👥 Customers
                            </button>
                            <button className={`cp-sub-tab ${activeDbSubTab === 'suppliers' ? 'active' : ''}`} onClick={() => setActiveDbSubTab('suppliers')}>
                                🏭 Suppliers
                            </button>
                            <button className={`cp-sub-tab ${activeDbSubTab === 'items' ? 'active' : ''}`} onClick={() => setActiveDbSubTab('items')}>
                                📦 Inventory
                            </button>
                        </div>
                    </div>

                    <div className="cp-sub-view">
                        {activeDbSubTab === 'customers' && (
                            <div className="cp-section">
                                <div className="cp-section-header">
                                    <div className="cp-section-icon">👥</div>
                                    <span className="cp-section-title">Customers</span>
                                    <span className="cp-section-num">{customers.length} Accounts</span>
                                    <button className="cp-add-btn mini" onClick={() => { setEditingCustomer(null); setCustomerForm({ name: '', phone: '', altPhone: '', email: '', altEmail: '', address: '', pincode: '', gstin: '', state: 'West Bengal', stateCode: '19' }); setShowCustomerModal(true); }}>
                                        + Add New
                                    </button>
                                </div>
                                <div className="cp-list">
                                    {customers.map(customer => (
                                        <div key={customer.id} className="cp-list-item">
                                            <div className="cp-list-header" onClick={() => setExpandedId(expandedId === `c-${customer.id}` ? null : `c-${customer.id}`)}>
                                                <div className="cp-list-toggle">
                                                    <span className="cp-toggle-arrow" style={{ transform: expandedId === `c-${customer.id}` ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                                                </div>
                                                <div className="cp-list-main">
                                                    <div className="cp-list-name">{customer.name}</div>
                                                    <div className="cp-list-phone">{customer.phone || '--'}</div>
                                                </div>
                                                <div className="cp-list-info">
                                                    <div className="cp-info-item">
                                                        <span className="cp-info-label">GSTIN</span>
                                                        <span className="cp-info-value cp-mono">{customer.gstin || '--'}</span>
                                                    </div>
                                                    <div className="cp-info-item">
                                                        <span className="cp-info-label">STATE</span>
                                                        <span className="cp-info-value">{customer.state || '--'}</span>
                                                    </div>
                                                    <div className="cp-info-item">
                                                        <span className="cp-info-label">PIN</span>
                                                        <span className="cp-info-value">{customer.pincode || '--'}</span>
                                                    </div>
                                                </div>
                                                <button className="cp-list-action" onClick={(e) => { e.stopPropagation(); editCustomer(customer); }}>Edit</button>
                                            </div>
                                            {expandedId === `c-${customer.id}` && (
                                                <div className="cp-list-details">
                                                    <div className="cp-detail-grid">
                                                        <div className="cp-detail-item"><div className="cp-detail-label">Phone</div><div className="cp-detail-value">{customer.phone}</div></div>
                                                        <div className="cp-detail-item"><div className="cp-detail-label">Email</div><div className="cp-detail-value">{customer.email || 'N/A'}</div></div>
                                                        <div className="cp-detail-item"><div className="cp-detail-label">GSTIN</div><div className="cp-detail-value cp-mono">{customer.gstin || 'Not registered'}</div></div>
                                                        <div className="cp-detail-item"><div className="cp-detail-label">State</div><div className="cp-detail-value">{customer.state || 'N/A'}</div></div>
                                                        <div className="cp-detail-item"><div className="cp-detail-label">PIN Code</div><div className="cp-detail-value">{customer.pincode || 'N/A'}</div></div>
                                                        <div className="cp-detail-item" style={{ gridColumn: 'span 3' }}><div className="cp-detail-label">Address</div><div className="cp-detail-value">{customer.address || 'Not provided'}</div></div>
                                                        <div className="cp-detail-item" style={{ gridColumn: 'span 4', marginTop: '12px', borderTop: '1px solid var(--cp-border)', paddingTop: '16px' }}>
                                                            <button className="cp-cancel-btn" style={{ borderColor: 'rgba(255, 107, 107, 0.2)', color: '#ff6b6b' }} onClick={() => deleteCustomer(customer.id)}>
                                                                Delete Customer
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeDbSubTab === 'suppliers' && (
                            <div className="cp-section">
                                <div className="cp-section-header">
                                    <div className="cp-section-icon">🏢</div>
                                    <span className="cp-section-title">Suppliers</span>
                                    <span className="cp-section-num">{suppliers.length} Vendors</span>
                                    <button className="cp-add-btn mini" onClick={() => { setEditingSupplier(null); setSupplierForm({ name: '', contactPerson: '', phone: '', altPhone: '', email: '', altEmail: '', address: '', pincode: '', gstin: '' }); setShowSupplierModal(true); }}>
                                        + Add New
                                    </button>
                                </div>
                                <div className="cp-list">
                                    {suppliers.map(supplier => (
                                        <div key={supplier.id} className="cp-list-item">
                                            <div className="cp-list-header" onClick={() => setExpandedId(expandedId === `s-${supplier.id}` ? null : `s-${supplier.id}`)}>
                                                <div className="cp-list-toggle">
                                                    <span className="cp-toggle-arrow" style={{ transform: expandedId === `s-${supplier.id}` ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                                                </div>
                                                <div className="cp-list-main">
                                                    <div className="cp-list-name">{supplier.name}</div>
                                                    <div className="cp-list-phone">{supplier.phone || supplier.email || '--'}</div>
                                                </div>
                                                <div className="cp-list-info" style={{ gridTemplateColumns: '160px 140px 80px' }}>
                                                    <div className="cp-info-item">
                                                        <span className="cp-info-label">Contact Person</span>
                                                        <span className="cp-info-value">{supplier.contactPerson || '--'}</span>
                                                    </div>
                                                    <div className="cp-info-item">
                                                        <span className="cp-info-label">GSTIN</span>
                                                        <span className="cp-info-value cp-mono">{supplier.gstin || '--'}</span>
                                                    </div>
                                                    <div className="cp-info-item">
                                                        <span className="cp-info-label">PIN</span>
                                                        <span className="cp-info-value">{supplier.pincode || '--'}</span>
                                                    </div>
                                                </div>
                                                <button className="cp-list-action" onClick={(e) => { e.stopPropagation(); editSupplier(supplier); }}>Edit</button>
                                            </div>
                                            {expandedId === `s-${supplier.id}` && (
                                                <div className="cp-list-details">
                                                    <div className="cp-detail-grid">
                                                        <div className="cp-detail-item"><div className="cp-detail-label">Contact Person</div><div className="cp-detail-value">{supplier.contactPerson || 'N/A'}</div></div>
                                                        <div className="cp-detail-item"><div className="cp-detail-label">Phone</div><div className="cp-detail-value">{supplier.phone || 'N/A'}</div></div>
                                                        <div className="cp-detail-item"><div className="cp-detail-label">Email</div><div className="cp-detail-value">{supplier.email || 'N/A'}</div></div>
                                                        <div className="cp-detail-item"><div className="cp-detail-label">GSTIN</div><div className="cp-detail-value cp-mono">{supplier.gstin || 'Not registered'}</div></div>
                                                        <div className="cp-detail-item"><div className="cp-detail-label">PIN Code</div><div className="cp-detail-value">{supplier.pincode || 'N/A'}</div></div>
                                                        <div className="cp-detail-item" style={{ gridColumn: 'span 3' }}><div className="cp-detail-label">Address</div><div className="cp-detail-value">{supplier.address || 'Not provided'}</div></div>
                                                        <div className="cp-detail-item" style={{ gridColumn: 'span 4', marginTop: '12px', borderTop: '1px solid var(--cp-border)', paddingTop: '16px' }}>
                                                            <button className="cp-cancel-btn" style={{ borderColor: 'rgba(255, 107, 107, 0.2)', color: '#ff6b6b' }} onClick={() => deleteSupplier(supplier.id)}>
                                                                Delete Supplier
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeDbSubTab === 'items' && (
                            <div className="cp-section">
                                <div className="cp-section-header">
                                    <div className="cp-section-icon">📦</div>
                                    <span className="cp-section-title">Inventory Items</span>
                                    <span className="cp-section-num">{products.length} Products</span>
                                    <button className="cp-add-btn mini" onClick={() => { setEditingProduct(null); setProductForm({ name: '', purchasePrice: '', sellingPrice: '', stock: '', hsn: '8301', gst: 18, quantityUnit: 'Pcs' }); setShowProductModal(true); }}>
                                        + Add New
                                    </button>
                                </div>
                                <div className="cp-list">
                                    {products.map(item => (
                                        <div key={item.id} className="cp-list-item">
                                            <div className="cp-list-header" onClick={() => setExpandedId(expandedId === `i-${item.id}` ? null : `i-${item.id}`)}>
                                                <div className="cp-list-toggle">
                                                    <span className="cp-toggle-arrow" style={{ transform: expandedId === `i-${item.id}` ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                                                </div>
                                                <div className="cp-list-main">
                                                    <div className="cp-list-name">{item.name}</div>
                                                    <div className="cp-list-phone">{item.stock} {item.quantityUnit || 'Pcs'} available</div>
                                                </div>
                                                <div className="cp-list-info" style={{ gridTemplateColumns: '100px 100px 120px' }}>
                                                    <div className="cp-info-item">
                                                        <span className="cp-info-label">HSN</span>
                                                        <span className="cp-info-value cp-mono">{item.hsn || '--'}</span>
                                                    </div>
                                                    <div className="cp-info-item">
                                                        <span className="cp-info-label">GST</span>
                                                        <span className="cp-info-value">{item.gst}%</span>
                                                    </div>
                                                    <div className="cp-info-item">
                                                        <span className="cp-info-label">Sales Price</span>
                                                        <span className="cp-info-value">₹ {item.sellingPrice}</span>
                                                    </div>
                                                </div>
                                                <button className="cp-list-action" onClick={(e) => { e.stopPropagation(); editProduct(item); }}>Edit</button>
                                            </div>
                                            {expandedId === `i-${item.id}` && (
                                                <div className="cp-list-details">
                                                    <div className="cp-detail-grid">
                                                        <div className="cp-detail-item"><div className="cp-detail-label">Quantity Unit</div><div className="cp-detail-value">{item.quantityUnit}</div></div>
                                                        <div className="cp-detail-item"><div className="cp-detail-label">Purchase Price</div><div className="cp-detail-value">₹ {item.purchasePrice}</div></div>
                                                        <div className="cp-detail-item"><div className="cp-detail-label">Sales Price</div><div className="cp-detail-value">₹ {item.sellingPrice}</div></div>
                                                        <div className="cp-detail-item"><div className="cp-detail-label">Current Stock</div><div className="cp-detail-value">{item.stock} {item.quantityUnit}</div></div>
                                                        <div className="cp-detail-item"><div className="cp-detail-label">HSN Code</div><div className="cp-detail-value cp-mono">{item.hsn}</div></div>
                                                        <div className="cp-detail-item"><div className="cp-detail-label">GST Rate</div><div className="cp-detail-value">{item.gst}%</div></div>
                                                        <div className="cp-detail-item" style={{ gridColumn: 'span 4', marginTop: '12px', borderTop: '1px solid var(--cp-border)', paddingTop: '16px' }}>
                                                            <button className="cp-cancel-btn" style={{ borderColor: 'rgba(255, 107, 107, 0.2)', color: '#ff6b6b' }} onClick={() => deleteProduct(item.id)}>
                                                                Delete Item
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'invoice' && (
                <div className="cp-container cp-compact">
                    <div className="cp-header">
                        <div className="cp-header-left">
                            <div className="cp-eyebrow">Settings · Configuration</div>
                            <h1 className="cp-title">Invoice <em>Config</em></h1>
                        </div>
                        <div style={{ padding: '8px 16px', background: 'rgba(142, 195, 175, 0.1)', border: '1px solid var(--cp-border)', borderRadius: '4px', textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', color: 'var(--cp-text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>Invoice Preview</div>
                            <div style={{ fontSize: '18px', color: 'var(--cp-accent)', fontFamily: 'DM Mono, monospace', fontWeight: '500', letterSpacing: '1px' }}>
                                {invoiceForm.prefix.endsWith('/') ? invoiceForm.prefix.slice(0, -1) : invoiceForm.prefix}/{String(invoiceForm.sequence).padStart(3, '0')}/{invoiceForm.fiscalYear}
                            </div>
                        </div>
                    </div>

                    <div className="cp-section">
                        <div className="cp-section-header">
                            <div className="cp-section-icon">🧾</div>
                            <span className="cp-section-title">Invoice Settings</span>
                            <span className="cp-section-num">01 / 01</span>
                        </div>

                        <form onSubmit={handleInvoiceSettingsSubmit} className="cp-fields" style={{ padding: '28px' }}>
                            <Field label="Invoice Prefix" required>
                                <Input
                                    value={invoiceForm.prefix || ''}
                                    onChange={(e) => setInvoiceForm({ ...invoiceForm, prefix: e.target.value })}
                                    placeholder="RM/"
                                    maxLength={10}
                                />
                            </Field>

                            <Field label="Starting Voucher Number" required>
                                <Input
                                    type="number"
                                    value={invoiceForm.sequence || ''}
                                    onChange={(e) => setInvoiceForm({ ...invoiceForm, sequence: e.target.value })}
                                    placeholder="1"
                                />
                            </Field>

                            <Field label="Fiscal Year" required>
                                <Input
                                    value={invoiceForm.fiscalYear || ''}
                                    onChange={(e) => setInvoiceForm({ ...invoiceForm, fiscalYear: e.target.value })}
                                    placeholder="25-26"
                                    maxLength={5}
                                />
                            </Field>

                            <div style={{ marginTop: '32px' }}>
                                <button type="submit" className="cp-save-btn">
                                    <span className="btn-text">Save Configuration</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'password' && (
                <div className="cp-container cp-compact">
                    <div className="cp-header">
                        <div className="cp-header-left">
                            <div className="cp-eyebrow">Settings · Security</div>
                            <h1 className="cp-title">Change <em>Password</em></h1>
                        </div>
                    </div>

                    <div className="cp-section">
                        <div className="cp-section-header">
                            <div className="cp-section-icon">🔒</div>
                            <span className="cp-section-title">Password & Security</span>
                            <span className="cp-section-num">01 / 01</span>
                        </div>

                        <form onSubmit={handlePasswordChange} className="cp-fields" style={{ padding: '28px' }}>
                            <Field label="Current Password" required>
                                <Input
                                    type="password"
                                    value={passwordForm.currentPassword || ''}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                    placeholder="••••••••"
                                />
                            </Field>

                            <Field label="New Password" required>
                                <Input
                                    type="password"
                                    value={passwordForm.newPassword || ''}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                    placeholder="••••••••"
                                />
                            </Field>

                            <Field label="Confirm Password" required>
                                <Input
                                    type="password"
                                    value={passwordForm.confirmPassword || ''}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                    placeholder="••••••••"
                                />
                            </Field>

                            <div style={{ marginTop: '32px' }}>
                                <button type="submit" className="cp-save-btn">
                                    <span className="btn-text">Update Password</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {(showCustomerModal || showSupplierModal) && (
                <div className="cp-modal-overlay" onClick={() => { setShowCustomerModal(false); setShowSupplierModal(false); }}>
                    <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="cp-modal-header">
                            <h2 className="cp-modal-title">{showCustomerModal ? (editingCustomer ? 'Edit' : 'New') : (editingSupplier ? 'Edit' : 'New')} {showCustomerModal ? 'Customer' : 'Supplier'}</h2>
                        </div>
                        <form onSubmit={showCustomerModal ? handleCustomerSubmit : handleSupplierSubmit} className="cp-modal-body">
                            <div className="cp-fields" style={{ padding: 0, gap: '24px' }}>
                                <Field label="Name" required>
                                    <Input
                                        inputRef={nameInputRef}
                                        value={(showCustomerModal ? customerForm.name : supplierForm.name) || ''}
                                        onChange={(e) => showCustomerModal ? setCustomerForm({ ...customerForm, name: e.target.value }) : setSupplierForm({ ...supplierForm, name: e.target.value })}
                                        placeholder="Full Name"
                                        required
                                        autoComplete="off"
                                    />
                                </Field>

                                <div className="cp-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px' }}>
                                    <Field 
                                        label="Phone No" 
                                        required={showCustomerModal} 
                                        error={
                                            (showCustomerModal ? customerForm.phone : supplierForm.phone) && 
                                            (showCustomerModal ? customerForm.phone : supplierForm.phone).length !== 10 
                                            ? 'Phone number must be exactly 10 digits' 
                                            : null
                                        }
                                    >
                                        <PrefixInput 
                                            prefix="+91" 
                                            value={(showCustomerModal ? customerForm.phone : supplierForm.phone)} 
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                showCustomerModal ? setCustomerForm({ ...customerForm, phone: val }) : setSupplierForm({ ...supplierForm, phone: val })
                                            }} 
                                            placeholder="9876543210"
                                            maxLength={10}
                                            className={
                                                (showCustomerModal ? customerForm.phone : supplierForm.phone) && 
                                                (showCustomerModal ? customerForm.phone : supplierForm.phone).length !== 10 
                                                ? 'error' 
                                                : ''
                                            }
                                        />
                                    </Field>
                                    <Field label="Email">
                                        <Input value={(showCustomerModal ? customerForm.email : supplierForm.email)} onChange={(e) => showCustomerModal ? setCustomerForm({ ...customerForm, email: e.target.value }) : setSupplierForm({ ...supplierForm, email: e.target.value })} placeholder="email@example.com" />
                                    </Field>
                                </div>

                                {showSupplierModal && (
                                    <Field label="Contact Person">
                                        <Input value={supplierForm.contactPerson} onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })} placeholder="Full Name" />
                                    </Field>
                                )}

                                <Field label="Full Address">
                                    <textarea className="cp-input" style={{ height: '80px', paddingTop: '12px' }} value={(showCustomerModal ? customerForm.address : supplierForm.address)} onChange={(e) => showCustomerModal ? setCustomerForm({ ...customerForm, address: e.target.value }) : setSupplierForm({ ...supplierForm, address: e.target.value })} placeholder="Full billing address..." />
                                </Field>

                                <div className="cp-grid-2">
                                    <Field 
                                        label="GSTIN"
                                        warning={(showCustomerModal ? customerForm.gstin : supplierForm.gstin) && !validateGSTIN(showCustomerModal ? customerForm.gstin : supplierForm.gstin).isValid ? validateGSTIN(showCustomerModal ? customerForm.gstin : supplierForm.gstin).errors[0] : null}
                                    >
                                        <div style={{ position: 'relative' }}>
                                            <Input 
                                                value={(showCustomerModal ? customerForm.gstin : supplierForm.gstin)} 
                                                onChange={(e) => {
                                                    const val = formatGSTIN(e.target.value);
                                                    showCustomerModal ? setCustomerForm({ ...customerForm, gstin: val }) : setSupplierForm({ ...supplierForm, gstin: val })
                                                }} 
                                                placeholder="19XXXXX..." 
                                                className={(showCustomerModal ? customerForm.gstin : supplierForm.gstin) && !validateGSTIN(showCustomerModal ? customerForm.gstin : supplierForm.gstin).isValid ? 'warning' : (showCustomerModal ? customerForm.gstin : supplierForm.gstin) ? 'valid' : ''}
                                                aria-label="GST Identification Number"
                                            />
                                            {(showCustomerModal ? customerForm.gstin : supplierForm.gstin) && (
                                                <div style={{ 
                                                    position: 'absolute', 
                                                    right: '12px', 
                                                    top: '50%', 
                                                    transform: 'translateY(-50%)',
                                                    fontSize: '14px',
                                                    color: validateGSTIN(showCustomerModal ? customerForm.gstin : supplierForm.gstin).isValid ? 'var(--cp-success, #2ed573)' : 'var(--cp-warning, #ffa502)'
                                                }}>
                                                    {validateGSTIN(showCustomerModal ? customerForm.gstin : supplierForm.gstin).isValid ? '✓' : '⚠'}
                                                </div>
                                            )}
                                        </div>
                                    </Field>
                                    <Field label="PIN Code">
                                        <Input value={(showCustomerModal ? customerForm.pincode : supplierForm.pincode)} onChange={(e) => showCustomerModal ? setCustomerForm({ ...customerForm, pincode: e.target.value }) : setSupplierForm({ ...supplierForm, pincode: e.target.value })} placeholder="711101" />
                                    </Field>
                                </div>

                                {showCustomerModal && (
                                    <div className="cp-grid" style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '24px' }}>
                                        <Field label="State">
                                            <select
                                                className={`cp-select ${customerForm.state ? 'valid' : ''}`}
                                                value={customerForm.state}
                                                onChange={(e) => {
                                                    const selected = INDIAN_STATES.find(s => s.name === e.target.value)
                                                    setCustomerForm(f => ({ ...f, state: e.target.value, stateCode: selected?.code || '' }))
                                                }}
                                            >
                                                <option value="">Select State</option>
                                                {INDIAN_STATES.map(s => (
                                                    <option key={s.code} value={s.name}>{s.name}</option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label="State Code">
                                            <Input value={customerForm.stateCode} readOnly style={{ textAlign: 'center' }} />
                                        </Field>
                                    </div>
                                )}
                            </div>

                            <div className="cp-modal-footer">
                                <button type="button" className="cp-cancel-btn" onClick={() => { setShowCustomerModal(false); setShowSupplierModal(false); }}>Cancel</button>
                                <button 
                                    type="submit" 
                                    className="cp-btn-primary" 
                                    style={{ 
                                        padding: '12px 32px', 
                                        border: 'none', 
                                        borderRadius: '4px', 
                                        cursor: 'pointer'
                                    }}
                                >
                                    {showCustomerModal ? (editingCustomer ? 'Update' : 'Create') : (editingSupplier ? 'Update' : 'Create')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Product Modal */}
            {showProductModal && (
                <div className="cp-modal-overlay" onClick={() => setShowProductModal(false)}>
                    <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="cp-modal-header">
                            <h2 className="cp-modal-title">{editingProduct ? 'Edit' : 'New'} Inventory <em>Item</em></h2>
                        </div>
                        <form onSubmit={handleProductSubmit} className="cp-modal-body">
                            <div className="cp-fields" style={{ padding: 0, gap: '24px' }}>
                                <Field label="Item Name" required>
                                    <Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Steel Bolt 12mm" />
                                </Field>
                                <div className="cp-grid-2">
                                    <Field label="Purchase Price" required>
                                        <PrefixInput prefix="₹" value={productForm.purchasePrice} onChange={(e) => setProductForm({ ...productForm, purchasePrice: e.target.value })} placeholder="0.00" />
                                    </Field>
                                    <Field label="Sales Price" required>
                                        <PrefixInput prefix="₹" value={productForm.sellingPrice} onChange={(e) => setProductForm({ ...productForm, sellingPrice: e.target.value })} placeholder="0.00" />
                                    </Field>
                                </div>
                                <div className="cp-grid-2">
                                    <Field label="Opening Stock">
                                        <Input type="number" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} placeholder="0" />
                                    </Field>
                                    <Field label="Quantity Unit">
                                        <Input value={productForm.quantityUnit} onChange={(e) => setProductForm({ ...productForm, quantityUnit: e.target.value })} placeholder="Pcs / Box / kg" />
                                    </Field>
                                </div>
                                <div className="cp-grid-2">
                                    <Field label="HSN Code">
                                        <Input value={productForm.hsn} onChange={(e) => setProductForm({ ...productForm, hsn: e.target.value })} placeholder="8301" />
                                    </Field>
                                    <Field label="GST Rate (%)">
                                        <Input type="number" value={productForm.gst} onChange={(e) => setProductForm({ ...productForm, gst: e.target.value })} placeholder="18" />
                                    </Field>
                                </div>
                            </div>
                            <div className="cp-modal-footer">
                                <button type="button" className="cp-cancel-btn" onClick={() => setShowProductModal(false)}>Cancel</button>
                                <button type="submit" className="cp-btn-primary" style={{ padding: '12px 32px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                    {editingProduct ? 'Save Changes' : 'Create Item'}
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
