import { useAuth } from '../lib/AuthContext.tsx'

export default function BaselineApp() {
  const { user, signOut } = useAuth()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#e8e8e8',
      fontFamily: "'Inter', -apple-system, sans-serif"
    }}>
      <div style={{
        borderBottom: '1px solid #262626',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '24px',
          color: '#c9a227'
        }}>B</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          color: '#555',
          letterSpacing: '0.15em'
        }}>BASELINE DAILY</div>
        <button
          onClick={signOut}
          style={{
            background: 'none',
            border: '1px solid #262626',
            borderRadius: '4px',
            color: '#555',
            padding: '4px 12px',
            fontSize: '11px',
            fontFamily: "'JetBrains Mono', monospace",
            cursor: 'pointer',
            letterSpacing: '0.1em'
          }}
        >SIGN OUT</button>
      </div>
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          color: '#555',
          letterSpacing: '0.1em'
        }}>LOGGED IN AS {user?.email?.toUpperCase()}</div>
        <div style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '120px',
          color: '#c9a227',
          lineHeight: 1,
          marginTop: '40px'
        }}>B</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '13px',
          color: '#555',
          marginTop: '16px',
          letterSpacing: '0.1em'
        }}>APP COMING SOON</div>
      </div>
    </div>
  )
}