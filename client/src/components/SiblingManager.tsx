import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Users } from 'lucide-react';

export function SiblingManager({ onUpdate: _onUpdate }: any) {
    const [siblings, setSiblings] = useState<any[]>([]);

    useEffect(() => {
        const q = query(collection(db, "siblings"), orderBy("createdAt", "asc"));
        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setSiblings(data);
        });
        return unsub;
    }, []);

    return (
        <div className="glass" style={{ padding: '20px', margin: '20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Users size={20} /> Usuarios
                </h3>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                {siblings.map((s: any) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '20px' }}>
                        {s.photoURL && <img src={s.photoURL} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />}
                        <span style={{ fontSize: '14px' }}>{s.name}</span>
                        <span style={{
                            fontSize: '12px',
                            color: (s.balance || 0) < 0 ? '#ff6b6b' : (s.balance || 0) > 0 ? '#51cf66' : 'rgba(255,255,255,0.5)',
                            marginLeft: '4px'
                        }}>
                            ({s.balance > 0 ? '+' : ''}{s.balance || 0})
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

