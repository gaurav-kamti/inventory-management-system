import { useNavigate } from 'react-router-dom'

function Voucher() {
    const navigate = useNavigate()

    return (
        <div className="voucher-page">
            <h1 style={{ color: 'white', marginBottom: '30px' }}>Select Voucher Type</h1>
            <div className="voucher-options" style={{ display: 'flex', gap: '20px' }}>
                <div
                    className="card glass voucher-card"
                    style={{ padding: '40px', cursor: 'pointer', textAlign: 'center', minWidth: '200px' }}
                    onClick={() => navigate('/voucher/receipt')}
                >
                    <div style={{ fontSize: '3em', marginBottom: '10px' }}>📥</div>
                    <h3>Receipt</h3>
                    <p style={{ color: '#ccc' }}>Record Money In</p>
                </div>

                <div
                    className="card glass voucher-card"
                    style={{ padding: '40px', cursor: 'pointer', textAlign: 'center', minWidth: '200px' }}
                    onClick={() => navigate('/voucher/payment')}
                >
                    <div style={{ fontSize: '3em', marginBottom: '10px' }}>📤</div>
                    <h3>Payment</h3>
                    <p style={{ color: '#ccc' }}>Record Money Out</p>
                </div>
            </div>
        </div>
    )
}

export default Voucher
