import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CameraCapture } from './components/CameraCapture';
import { TurnDisplay } from './components/TurnDisplay';
import { LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SiblingManager } from './components/SiblingManager';
import { WalkHistory } from './components/WalkHistory';

function AppContent() {
  const { user, siblingData, login, logout, loading } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  // Mouse tracking for glass shine effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const cards = document.querySelectorAll('.glass');
      cards.forEach((card) => {
        const rect = (card as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        (card as HTMLElement).style.setProperty('--mouse-x', `${x}px`);
        (card as HTMLElement).style.setProperty('--mouse-y', `${y}px`);
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);



  if (loading) return <div className="text-center p-10">Cargando...</div>;

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>Paseos de Luna</h1>
        <p style={{ marginBottom: '40px', opacity: 0.7 }}>¡Inicia sesión para gestionar los paseos!</p>
        <button onClick={login} className="btn-primary" style={{ padding: '12px 24px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style={{ width: '24px', background: 'white', borderRadius: '50%', padding: '2px' }} />
          Iniciar con Google
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Paseos de Luna
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

          {user.photoURL && <img src={user.photoURL} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
          <button onClick={logout} className="btn-secondary" style={{ padding: '8px', borderRadius: '50%' }}><LogOut size={16} /></button>
        </div>
      </div>

      <TurnDisplay currentUserId={user.uid} />

      <CameraCapture
        key={user.uid}
        user={siblingData || { uid: user.uid, name: user.displayName }}
        onUploadComplete={() => setRefreshKey(k => k + 1)}
      />

      <SiblingManager onUpdate={() => { }} />
      <WalkHistory key={refreshKey} currentUserId={user?.uid} />
    </div>
  );
}

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" />
      <AppContent />
    </AuthProvider>
  );
}

export default App;
