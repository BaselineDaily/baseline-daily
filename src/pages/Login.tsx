import { useState } from 'react'
import { useAuth } from '../lib/AuthContext.tsx'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif"
    }}>
      <div style={{
        background: '#141414',
        border: '1px solid #262626',
        borderRadius: '12px',
        padding: '48px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '48px',
            color: '#c9a227',
            lineHeight: 1
          }}>B</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            color: '#555',
            letterSpacing: '0.15em',
            marginTop: '8px'
          }}>BASELINE DAILY</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%',
                background: '#0a0a0a',
                border: '1px solid #262626',
                borderRadius: '6px',
                padding: '12px 16px',
                color: '#e8e8e8',
                fontSize: '14px',
                fontFamily: "'Inter', sans-serif",
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%',
                background: '#0a0a0a',
                border: '1px solid #262626',
                borderRadius: '6px',
                padding: '12px 16px',
                color: '#e8e8e8',
                fontSize: '14px',
                fontFamily: "'Inter', sans-serif",
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{
              color: '#ef4444',
              fontSize: '13px',
              marginBottom: '16px',
              fontFamily: "'JetBrains Mono', monospace"
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: '#c9a227',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: '6px',
              padding: '12px',
              fontSize: '14px',
              fontWeight: '600',
              fontFamily: "'Inter', sans-serif",
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>
      </div>
    </div>
  )
}