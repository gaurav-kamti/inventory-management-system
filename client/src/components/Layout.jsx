import { Link, useLocation } from 'react-router-dom'
import './Layout.css'

function Layout({ children, onLogout }) {
    const location = useLocation()

    const isActive = (path) => location.pathname === path

    return (
        <div className="layout">
            <nav className="sidebar glass">
                <div className="logo">
                    <h2>📦 IMS</h2>
                </div>
                <ul className="nav-links">
                    <li>
                        <Link to="/" className={isActive('/') ? 'active' : ''}>
                            📦 Inventory
                        </Link>
                    </li>
                    <li>
                        <Link to="/database" className={isActive('/database') ? 'active' : ''}>
                            🗄️ Database
                        </Link>
                    </li>
                    <li>
                        <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
                            📊 Dashboard
                        </Link>
                    </li>
                    <li>
                        <Link to="/dues" className={isActive('/dues') ? 'active' : ''}>
                            💳 Dues
                        </Link>
                    </li>
                    <li>
                        <Link to="/settings" className={isActive('/settings') ? 'active' : ''}>
                            ⚙️ Settings
                        </Link>
                    </li>
                </ul>
                <button className="btn btn-danger logout-btn" onClick={onLogout}>
                    🚪 Logout
                </button>
            </nav>
            <main className="main-content">
                {children}
            </main>
        </div>
    )
}

export default Layout
