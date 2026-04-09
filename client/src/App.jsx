import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
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
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setLoading(false)
        })

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        return () => subscription.unsubscribe()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
    }

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.5rem', color: 'gray' }}>Loading...</div>
    }

    if (!session) {
        return <Login />
    }

    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Layout onLogout={handleLogout}>
                <Routes>
                    <Route path="/" element={<Inventory />} />
                    <Route path="/database" element={<Database />} />
                    <Route path="/dues" element={<Dues />} />
                    <Route path="/analytics" element={<Analytics />} />
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
