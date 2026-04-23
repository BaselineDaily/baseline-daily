import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/AuthContext.tsx'
import Login from './pages/Login'
import BaselineApp from './pages/App'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'JetBrains Mono', monospace",
        color: '#555',
        fontSize: '12px',
        letterSpacing: '0.1em'
      }}>
        LOADING...
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/app" />} />
      <Route path="/app" element={user ? <BaselineApp /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to={user ? "/app" : "/login"} />} />
    </Routes>
  )
}

export default App