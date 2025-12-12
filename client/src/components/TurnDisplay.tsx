import { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, getDocs, query, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
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

    const handleReplacement = async () => {
        if (!turn) return;

        const confirm = window.confirm("¿Seguro que no puedes pasear? Se buscará un reemplazo y perderás 1 punto de balance.");
        if (!confirm) return;

        try {
            // 1. Get all siblings to find best candidate
            const siblingsSnap = await getDocs(query(collection(db, "siblings"), orderBy("createdAt", "asc")));
            const siblings = siblingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

            // 2. Filter out current turn user (walker)
            const candidates = siblings.filter(s => s.uid !== turn.siblingUid);

            if (candidates.length === 0) {
                alert("No hay otros usuarios disponibles para reemplazar.");
                return;
            }

            // 3. Sort by Balance (Lowest/Negative first = Most Debt/Least Credit)
            // If balance is undefined, treat as 0
            candidates.sort((a, b) => (a.balance || 0) - (b.balance || 0));

            const replacement = candidates[0];

            // 4. Update Turn
            // If this is already a replacement, keep the original original.
            // If it's a normal turn, the original is the current siblingUid.
            const originalUid = turn.originalSiblingUid || turn.siblingUid;
            const originalName = turn.originalSiblingName || turn.siblingName;

            await setDoc(doc(db, "turns", "current_turn"), {
                siblingUid: replacement.uid,
                siblingName: replacement.name,
                originalSiblingUid: originalUid,
                originalSiblingName: originalName,
                status: 'WAITING',
                updatedAt: serverTimestamp()
            }, { merge: true });

        } catch (e) {
            console.error(e);
            alert("Error al solicitar reemplazo");
        }
    };

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

            {turn.originalSiblingName && (
                <div style={{ fontSize: '14px', color: 'var(--warning)', marginBottom: '10px' }}>
                    (Reemplazando a {turn.originalSiblingName})
                </div>
            )}

            {turn.status === 'VERIFYING' ? (
                <div style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Clock className="animate-spin" /> Verificando Paseo...
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                    <div style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Dog /> {isMyTurn ? '¡Hora de pasear al perro!' : 'Espera a que termine.'}
                    </div>

                    {isMyTurn && (
                        <button
                            onClick={handleReplacement}
                            className="btn"
                            style={{
                                background: 'rgba(255, 100, 100, 0.2)',
                                border: '1px solid rgba(255, 100, 100, 0.5)',
                                fontSize: '12px',
                                padding: '5px 10px',
                                marginTop: '10px'
                            }}
                        >
                            Solicitar Reemplazo
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
