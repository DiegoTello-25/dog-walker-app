import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Clock, Dog } from 'lucide-react';

export function TurnDisplay({ currentUserId }: { currentUserId: string | undefined }) {
    const [turn, setTurn] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Listen to the singleton document "current_turn" in "turns" collection
        const unsub = onSnapshot(doc(db, "turns", "current_turn"), (doc) => {
            if (doc.exists()) {
                setTurn(doc.data());
            } else {
                setTurn(null);
            }
            setLoading(false);
        });
        return unsub;
    }, []);

    if (loading) return <div className="glass" style={{ padding: '20px', textAlign: 'center' }}>Cargando turno...</div>;

    if (!turn) {
        return (
            <div className="glass" style={{ padding: '20px', textAlign: 'center' }}>
                Sin turno activo. <br /><span style={{ fontSize: '14px', opacity: 0.5 }}>¡El primer paseo verificado inicia el ciclo!</span>
            </div>
        );
    }

    const isMyTurn = currentUserId === turn.siblingUid;

    return (
        <div className="glass" style={{
            padding: '32px 20px',
            textAlign: 'center',
            borderColor: isMyTurn ? 'var(--primary)' : undefined,
            boxShadow: isMyTurn ? '0 0 30px var(--primary-glow), var(--glass-shadow)' : undefined
        }}>
            <div style={{
                width: '100px', height: '100px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                borderRadius: '50%',
                margin: '0 auto 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px',
                border: `3px solid ${isMyTurn ? 'var(--primary)' : 'rgba(255,255,255,0.2)'}`,
                boxShadow: isMyTurn ? '0 0 20px var(--primary-glow)' : 'none'
            }}>
                {turn.siblingName ? turn.siblingName[0].toUpperCase() : '?'}
            </div>

            <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>
                {isMyTurn ? "¡Es TU Turno!" : `Turno de ${turn.siblingName}`}
            </h2>

            {turn.status === 'VERIFYING' ? (
                <div style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Clock className="animate-spin" /> Verificando Paseo...
                </div>
            ) : (
                <div style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Dog /> {isMyTurn ? '¡Hora de pasear al perro!' : 'Espera a que termine.'}
                </div>
            )}
        </div>
    );
}

