import { Link, useLocation } from 'react-router-dom'
import './Layout.css'

function Layout({ children, onLogout }) {
    const location = useLocation()

    const isActive = (path) => location.pathname === path

    return (
        <div className="layout">
            <nav className="sidebar">
                <div className="logo">
                    <h2><span>🏢</span> Inventory MS</h2>
                    <span className="logo-subtitle">Business Suite v2.0</span>
                </div>
                <ul className="nav-links">
                    <li>
                        <Link to="/" className={isActive('/') ? 'active' : ''}>
                            <span className="nav-icon">📦</span> Inventory
                        </Link>
                    </li>
                    <li>
                        <Link to="/sell-purchase" className={isActive('/sell-purchase') ? 'active' : ''}>
                            <span className="nav-icon">🔁</span> Transactions
                        </Link>
                    </li>

                    <li>
                        <Link to="/voucher" className={isActive('/voucher') ? 'active' : ''}>
                            <span className="nav-icon">🎫</span> Vouchers
                        </Link>
                    </li>
                    <li>
                        <Link to="/database" className={isActive('/database') ? 'active' : ''}>
                            <span className="nav-icon">📂</span> Records & History
                        </Link>
                    </li>

                    <li>
                        <Link to="/dues" className={isActive('/dues') ? 'active' : ''}>
                            <span className="nav-icon">💳</span> Outstanding
                        </Link>
                    </li>
                    <li>
                        <Link to="/analytics" className={isActive('/analytics') ? 'active' : ''}>
                            <span className="nav-icon">📊</span> Analytics
                        </Link>
                    </li>
                    <li>
                        <Link to="/settings" className={isActive('/settings') ? 'active' : ''}>


                            <span className="nav-icon">⚙️</span> Settings
                        </Link>
                    </li>
                </ul>
                <button className="logout-btn" onClick={onLogout}>
                    <span>🚪</span> Terminate Session
                </button>
            </nav>
            <main className="main-content">
                {children}
            </main>
        </div>
    )
}

export default Layout
