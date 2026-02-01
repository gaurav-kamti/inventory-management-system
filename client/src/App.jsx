import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Login from './pages/Login'
import Inventory from './pages/Inventory'
import Database from './pages/Database'
import Dues from './pages/Dues'
import Settings from './pages/Settings'
import Layout from './components/Layout'
import Voucher from './pages/Voucher'
import Receipt from './pages/vouchers/Receipt'
import Payment from './pages/vouchers/Payment'
import SellPurchase from './pages/SellPurchase'
import Analytics from './pages/Analytics'


function App() {
    const [token, setToken] = useState(localStorage.getItem('token'))

    const handleLogin = (newToken) => {
        localStorage.setItem('token', newToken)
        setToken(newToken)
    }

    const handleLogout = () => {
        localStorage.removeItem('token')
        setToken(null)
    }

    if (!token) {
        return <Login onLogin={handleLogin} />
    }

    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Layout onLogout={handleLogout}>
                <Routes>
                    <Route path="/" element={<Inventory />} />
                    <Route path="/database" element={<Database />} />
                    <Route path="/dues" element={<Dues />} />

                    <Route path="/voucher" element={<Voucher />} />
                    <Route path="/voucher/:type" element={<Voucher />} />
                    <Route path="/sell-purchase" element={<SellPurchase />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/" />} />


                </Routes>
            </Layout>
        </Router>
    )
}

export default App
