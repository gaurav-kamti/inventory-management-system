import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './Login.css'

function Login() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // Secretly format username into an email to maintain the old UX
            const email = username.includes('@') ? username : `${username.toLowerCase().trim()}@example.com`
            
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (signInError) throw signInError
            
            // Note: We don't need to call onLogin because App.jsx uses onAuthStateChange
        } catch (err) {
            console.error("Login attempt failed:", err);
            setError(err.message || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-container">
            <div className="login-box">
                <div style={{ marginBottom: '10px', fontSize: '3rem' }}>🏢</div>
                <h1>Inventory MS</h1>
                <p className="subtitle">Business Management Suite</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input
                            type="text"
                            className="input"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <input
                            type="password"
                            className="input"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <div className="error-message">⚠️ Login Error: {error}</div>}

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="demo-credentials">
                    <p style={{ opacity: 0.5, marginBottom: '5px' }}>ACCESS LEVEL: ADMINISTRATOR</p>
                    <p>Demo Credentials: admin / admin123</p>
                </div>
            </div>
        </div>
    )
}

export default Login
