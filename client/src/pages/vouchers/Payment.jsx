import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import '../POS.css'; // Reusing POS styles for consistency

function Payment() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [currentBalance, setCurrentBalance] = useState(0);
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [method, setMethod] = useState('On Account');
    const [references, setReferences] = useState([]);
    const [selectedReference, setSelectedReference] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchSuppliers();
    }, []);

    useEffect(() => {
        const queryId = searchParams.get('supplierId');
        if (queryId && suppliers.length > 0 && !selectedSupplier) {
            setSelectedSupplier(queryId);
            const supplier = suppliers.find(s => s.id === parseInt(queryId));
            if (supplier) {
                setCurrentBalance(parseFloat(supplier.outstandingBalance || 0));
            }
        }
    }, [suppliers, searchParams]);

    useEffect(() => {
        if (selectedSupplier && method === 'Agst Ref') {
            fetchReferences();
        } else {
            setReferences([]);
            setSelectedReference('');
        }
    }, [selectedSupplier, method]);

    const fetchSuppliers = async () => {
        try {
            const res = await api.get('/suppliers');
            setSuppliers(res.data);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        }
    };

    const fetchReferences = async () => {
        try {
            const res = await api.get(`/vouchers/unpaid-purchases/${selectedSupplier}`);
            setReferences(res.data);
        } catch (error) {
            console.error('Error fetching references:', error);
        }
    };

    const handleSupplierChange = (e) => {
        const supplierId = e.target.value;
        setSelectedSupplier(supplierId);
        const supplier = suppliers.find(s => s.id === parseInt(supplierId));
        setCurrentBalance(supplier ? parseFloat(supplier.outstandingBalance || 0) : 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const res = await api.post('/vouchers/payment', {
                supplierId: selectedSupplier,
                amount,
                date,
                mode: 'cash',
                notes,
                method,
                referenceId: selectedReference
            });

            setSuccessData({
                newBalance: res.data.newBalance,
                supplierName: suppliers.find(s => s.id === parseInt(selectedSupplier))?.name || 'Supplier',
                amount: amount
            });
            setAmount('');
            setNotes('');
            setSelectedReference('');
            // Update balance locally
            const updatedSuppliers = suppliers.map(s => {
                if (s.id === parseInt(selectedSupplier)) {
                    return { ...s, outstandingBalance: res.data.newBalance };
                }
                return s;
            });
            setSuppliers(updatedSuppliers);
            setCurrentBalance(res.data.newBalance);
            if (method === 'Agst Ref') fetchReferences();

        } catch (error) {
            console.error('Payment error:', error);
            setMessage(error.response?.data?.error || 'Error recording payment');
        } finally {
            setLoading(false);
        }
    };

    if (successData) {
        return (
            <div className="payment-form-container" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                <div className="glass card" style={{
                    padding: '60px 40px',
                    background: 'var(--bg-dark)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '32px',
                    boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
                    maxWidth: '600px',
                    margin: '0 auto',
                    textAlign: 'center'
                }}>
                    <div style={{ 
                        width: '100px', 
                        height: '100px', 
                        background: 'rgba(255, 71, 87, 0.1)', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        margin: '0 auto 30px auto',
                        color: '#ff4757',
                        fontSize: '3.5rem',
                        boxShadow: '0 0 30px rgba(255, 71, 87, 0.2)'
                    }}>
                        ✓
                    </div>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '10px' }}>Payment Saved!</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '40px', lineHeight: '1.6' }}>
                        Successfully paid <strong style={{ color: '#ff4757', fontSize: '1.3rem' }}>${parseFloat(successData.amount).toLocaleString()}</strong><br/>
                        to <span style={{ color: 'var(--text-primary)' }}>{successData.supplierName}</span>
                    </p>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '25px', borderRadius: '24px', marginBottom: '40px', border: '1px solid var(--glass-border)' }}>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700' }}>New Outstanding Balance</p>
                        <h3 style={{ margin: '10px 0 0 0', fontSize: '2.5rem', fontWeight: '900', color: '#ff4757' }}>${parseFloat(successData.newBalance).toLocaleString()}</h3>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                        <button 
                            onClick={() => {
                                setSuccessData(null);
                                setSelectedSupplier('');
                            }}
                            className="btn"
                            style={{
                                padding: '16px 32px',
                                borderRadius: '18px',
                                background: 'transparent',
                                border: '2px solid var(--glass-border)',
                                color: 'var(--text-secondary)',
                                fontWeight: '800',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                            }}
                        >
                            + New Payment
                        </button>
                        <button 
                            onClick={() => navigate('/dues')}
                            className="btn"
                            style={{
                                padding: '16px 32px',
                                borderRadius: '18px',
                                background: '#ff4757',
                                color: 'white',
                                fontWeight: '800',
                                cursor: 'pointer',
                                border: 'none',
                                boxShadow: '0 10px 30px rgba(255, 71, 87, 0.3)'
                            }}
                        >
                            View Dues →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="payment-form-container">
            <div className="glass card" style={{
                padding: '45px',
                background: 'var(--bg-dark)',
                border: '1px solid var(--glass-border)',
                borderRadius: '32px',
                boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                <div style={{ marginBottom: '35px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '20px' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-1px' }}>Payment Voucher</h2>
                    <p style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.9rem' }}>Record payments made to suppliers</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Supplier Name</label>
                            <select
                                value={selectedSupplier}
                                onChange={handleSupplierChange}
                                required
                                className="input"
                                style={{
                                    padding: '18px',
                                    borderRadius: '16px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'var(--text-primary)',
                                    width: '100%',
                                    outline: 'none'
                                }}
                            >
                                <option value="" style={{ background: 'var(--bg-deep)' }}>-- Select Supplier --</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id} style={{ background: 'var(--bg-deep)' }}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Type of Reference</label>
                            <select
                                value={method}
                                onChange={(e) => setMethod(e.target.value)}
                                required
                                className="input"
                                style={{
                                    padding: '18px',
                                    borderRadius: '16px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'var(--text-primary)',
                                    width: '100%',
                                    outline: 'none'
                                }}
                            >
                                <option value="New Ref" style={{ background: 'var(--bg-deep)' }}>New Reference</option>
                                <option value="Agst Ref" style={{ background: 'var(--bg-deep)' }}>Against Bill</option>
                                <option value="Advance" style={{ background: 'var(--bg-deep)' }}>Advance</option>
                                <option value="On Account" style={{ background: 'var(--bg-deep)' }}>On Account</option>
                            </select>
                        </div>
                    </div>

                    {method === 'Agst Ref' && (
                        <div className="form-group" style={{
                            animation: 'slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            padding: '25px',
                            background: 'rgba(142, 182, 155, 0.03)',
                            borderRadius: '20px',
                            border: '1px dashed var(--accent)'
                        }}>
                            <label style={{ display: 'block', marginBottom: '12px', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase' }}>Select Bill</label>
                            <select
                                value={selectedReference}
                                onChange={(e) => setSelectedReference(e.target.value)}
                                required
                                className="input"
                                style={{
                                    padding: '18px',
                                    borderRadius: '16px',
                                    background: 'rgba(0,0,0,0.4)',
                                    border: '1px solid rgba(142, 182, 155, 0.3)',
                                    color: 'var(--text-primary)',
                                    width: '100%',
                                    outline: 'none'
                                }}
                            >
                                <option value="" style={{ background: 'var(--bg-deep)' }}>-- Select Bill --</option>
                                {references.map(r => (
                                    <option key={r.id} value={r.id} style={{ background: 'var(--bg-deep)' }}>
                                        {r.invoiceNumber || r.notes || `Doc ID: ${r.id}`} | Amount: ${parseFloat(r.amountDue).toFixed(2)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {selectedSupplier && (
                        <div className="info-box" style={{
                            background: 'rgba(255, 71, 87, 0.05)',
                            padding: '25px',
                            borderRadius: '24px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            border: '1px solid rgba(255, 71, 87, 0.1)'
                        }}>
                            <div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '5px' }}>Current Balance</p>
                                <h3 style={{ color: '#ff4757', fontWeight: '900', fontSize: '1.8rem', margin: 0 }}>$ {currentBalance.toLocaleString()}</h3>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ background: '#ff4757', color: 'white', padding: '6px 14px', borderRadius: '50px', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase' }}>Status</span>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>Posting Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                                className="input"
                                style={{
                                    padding: '18px',
                                    borderRadius: '16px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'var(--text-primary)',
                                    width: '100%',
                                    outline: 'none',
                                    colorScheme: 'dark'
                                }}
                            />
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>Amount Paid</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)', fontWeight: '900', fontSize: '1.2rem' }}>$</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                    min="0.01"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="input"
                                    style={{
                                        padding: '18px 18px 18px 45px',
                                        borderRadius: '16px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid var(--glass-border)',
                                        color: 'var(--text-primary)',
                                        width: '100%',
                                        outline: 'none',
                                        fontSize: '1.2rem',
                                        fontWeight: '800'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>Narration / Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Enter payment details (Cheque No, Bank, etc.)..."
                            className="input"
                            style={{
                                padding: '18px',
                                borderRadius: '16px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)',
                                width: '100%',
                                minHeight: '120px',
                                outline: 'none',
                                resize: 'none',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !selectedSupplier}
                        className="btn"
                        style={{
                            padding: '24px',
                            borderRadius: '20px',
                            background: 'var(--accent)',
                            color: 'var(--bg-deep)',
                            fontSize: '1.2rem',
                            fontWeight: '900',
                            cursor: 'pointer',
                            marginTop: '10px',
                            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            boxShadow: '0 20px 40px rgba(142, 182, 155, 0.2)',
                            opacity: (loading || !selectedSupplier) ? 0.5 : 1,
                            letterSpacing: '1px',
                            textTransform: 'uppercase'
                        }}
                    >
                        {loading ? 'Saving...' : 'Save Payment'}
                    </button>

                    {message && (
                        <div style={{
                            marginTop: '10px',
                            padding: '20px',
                            textAlign: 'center',
                            background: message.includes('Success') ? 'rgba(142, 182, 155, 0.1)' : 'rgba(255, 71, 87, 0.1)',
                            color: message.includes('Success') ? 'var(--accent)' : '#ff4757',
                            borderRadius: '16px',
                            fontSize: '0.95rem',
                            fontWeight: '800',
                            border: `1px solid ${message.includes('Success') ? 'rgba(142, 182, 155, 0.2)' : 'rgba(255, 71, 87, 0.2)'}`,
                            animation: 'fadeIn 0.5s ease-out'
                        }}>
                            {message}
                        </div>
                    )}
                </form>
            </div>

            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-20px); filter: blur(5px); }
                    to { opacity: 1; transform: translateY(0); filter: blur(0); }
                }
            `}</style>
        </div>
    );
}

export default Payment;
