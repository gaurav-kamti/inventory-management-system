import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Login from './pages/Login'
import Inventory from './pages/Inventory'
import Dashboard from './pages/Dashboard'
import Database from './pages/Database'
import Dues from './pages/Dues'
import Settings from './pages/Settings'
import Layout from './components/Layout'

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
        <Router>
            <Layout onLogout={handleLogout}>
                <Routes>
                    <Route path="/" element={<Inventory />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/database" element={<Database />} />
                    <Route path="/dues" element={<Dues />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Layout>
        </Router>
    )
}

export default App
