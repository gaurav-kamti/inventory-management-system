import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Receipt from './vouchers/Receipt'
import Payment from './vouchers/Payment'

function Voucher() {
    const { type } = useParams()
    const navigate = useNavigate()
    const [activeType, setActiveType] = useState(type || 'receipt')

    useEffect(() => {
        if (type && type !== activeType) {
            setActiveType(type)
        }
    }, [type, activeType])

    const handleSwitch = (newType) => {
        setActiveType(newType)
        navigate(`/voucher/${newType}`)
    }

    return (
        <div className="voucher-page" style={{ padding: '20px' }}>
            <div className="voucher-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h1 style={{
                    color: 'var(--text-primary)',
                    textAlign: 'center',
                    marginBottom: '10px',
                    fontSize: '2.8rem',
                    fontWeight: '800',
                    letterSpacing: '-1.5px'
                }}>
                    Voucher Entry
                </h1>
                <p style={{
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    marginBottom: '40px',
                    fontSize: '1.1rem'
                }}>
                    Create and manage payment and receipt vouchers
                </p>

                {/* Modern Segmented Control */}
                <div className="segmented-control glass" style={{
                    display: 'flex',
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '8px',
                    borderRadius: '20px',
                    marginBottom: '50px',
                    width: 'fit-content',
                    margin: '0 auto 50px auto'
                }}>
                    <div
                        onClick={() => handleSwitch('receipt')}
                        style={{
                            padding: '14px 40px',
                            cursor: 'pointer',
                            borderRadius: '14px',
                            color: activeType === 'receipt' ? 'var(--bg-deep)' : 'var(--text-secondary)',
                            background: activeType === 'receipt' ? 'var(--accent)' : 'transparent',
                            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: activeType === 'receipt' ? '0 10px 25px rgba(142, 182, 155, 0.3)' : 'none'
                        }}
                    >
                        <span style={{ fontSize: '1.3rem' }}>📥</span> Receipt
                    </div>
                    <div
                        onClick={() => handleSwitch('payment')}
                        style={{
                            padding: '14px 40px',
                            cursor: 'pointer',
                            borderRadius: '14px',
                            color: activeType === 'payment' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            background: activeType === 'payment' ? 'linear-gradient(135deg, #163832 0%, #0b2b26 100%)' : 'transparent',
                            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: activeType === 'payment' ? '0 10px 25px rgba(0,0,0,0.3)' : 'none',
                            border: activeType === 'payment' ? '1px solid var(--glass-border)' : 'none'
                        }}
                    >
                        <span style={{ fontSize: '1.3rem' }}>📤</span> Payment
                    </div>
                </div>

                {/* Form Container with smooth fade-in */}
                <div key={activeType} className="voucher-form-wrapper" style={{
                    animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                    {activeType === 'receipt' ? <Receipt /> : <Payment />}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); filter: blur(10px); }
                    to { opacity: 1; transform: translateY(0); filter: blur(0); }
                }
            `}</style>
        </div>
    )
}

export default Voucher
