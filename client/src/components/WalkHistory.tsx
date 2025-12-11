import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, arrayUnion, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Clock, CheckCircle2, History, AlertTriangle, ThumbsDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface Walk {
    id: string;
    siblingUid: string;
    siblingName: string;
    photoUrl: string;
    timestamp: any;
    verified: boolean;
    rejections?: string[];
}

interface Props {
    currentUserId?: string;
}

export function WalkHistory({ currentUserId }: Props) {
    const [walks, setWalks] = useState<Walk[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        // Query last 20 walks
        const q = query(
            collection(db, "walks"),
            orderBy("timestamp", "desc"),
            limit(20)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Walk));
            setWalks(data);
            setLoading(false);
        });

        return unsub;
    }, []);

    const handleReject = async (walk: Walk) => {
        if (!currentUserId) return;

        const confirmReject = confirm("¿Estás seguro de votar para rechazar esta evidencia?");
        if (!confirmReject) return;

        try {
            const walkRef = doc(db, "walks", walk.id);

            // 1. Add vote
            await updateDoc(walkRef, {
                rejections: arrayUnion(currentUserId)
            });

            // 2. Check for consensus
            const freshSnap = await getDoc(walkRef);
            const freshData = freshSnap.data() as Walk;
            const currentVotes = freshData.rejections?.length || 0;

            if (currentVotes >= 2) {
                // EXECUTING REJECTION
                await updateDoc(walkRef, {
                    verified: false
                });

                // Revert Turn
                await setDoc(doc(db, "turns", "current_turn"), {
                    siblingUid: freshData.siblingUid,
                    siblingName: freshData.siblingName,
                    lastWalker: "SYSTEM_REVERT",
                    status: 'WAITING',
                    updatedAt: serverTimestamp()
                }, { merge: true });

                toast.error("¡Paseo rechazado por consenso! Turno devuelto.");
            } else {
                toast("Voto de rechazo registrado. (1/2)", { icon: '🗳️' });
            }

        } catch (e: any) {
            console.error("Error rejecting:", e);
            toast.error("Error rechazando: " + e.message);
        }
    };

    if (loading) return <div className="text-center p-4 opacity-50">Cargando historial...</div>;

    return (
        <div className="glass" style={{ padding: '20px', marginTop: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <History size={20} /> Historial
                {/* Debug Info */}
                <span style={{ fontSize: '10px', opacity: 0.3, fontWeight: 'normal' }}>({currentUserId ? 'ID: ' + currentUserId.slice(0, 4) : 'No User'})</span>
            </h3>

            {walks.length === 0 ? (
                <p className="text-center opacity-50">Aún no hay paseos registrados.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {walks.map((walk) => (
                        <div key={walk.id} style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px'
                        }}>
                            {/* Photo Thumbnail */}
                            <div
                                onClick={() => setSelectedImage(walk.photoUrl)}
                                style={{
                                    width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0,
                                    background: '#000', cursor: 'pointer', border: '2px solid rgba(255,255,255,0.1)'
                                }}
                            >
                                <img src={walk.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '14px' }}>{walk.siblingName}</div>
                                <div style={{ fontSize: '12px', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={10} />
                                    {walk.timestamp?.toDate ? walk.timestamp.toDate().toLocaleString() : 'Recién'}
                                </div>
                            </div>

                            {/* Status & Actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                {walk.verified ? (
                                    <>
                                        <CheckCircle2 color="#03dac6" size={20} />
                                        {/* Reject Button Logic */}
                                        {currentUserId ? (
                                            currentUserId !== walk.siblingUid ? (
                                                <button
                                                    onClick={() => handleReject(walk)}
                                                    disabled={walk.rejections?.includes(currentUserId)}
                                                    style={{
                                                        fontSize: '10px',
                                                        background: walk.rejections?.includes(currentUserId) ? 'gray' : 'rgba(255,50,50,0.2)',
                                                        color: walk.rejections?.includes(currentUserId) ? 'white' : '#ff6b6b',
                                                        border: '1px solid rgba(255,50,50,0.3)',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        cursor: walk.rejections?.includes(currentUserId) ? 'default' : 'pointer',
                                                        marginTop: '4px',
                                                        display: 'flex', alignItems: 'center', gap: '4px'
                                                    }}
                                                >
                                                    <ThumbsDown size={10} />
                                                    {walk.rejections?.includes(currentUserId)
                                                        ? `Votado (${walk.rejections?.length || 0}/2)`
                                                        : `Rechazar (${walk.rejections?.length || 0}/2)`}
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: '10px', opacity: 0.5, marginTop: '4px' }}>(Tu paseo)</span>
                                            )
                                        ) : (
                                            // Should typically not happen if auth is required, but good for debug
                                            <span style={{ fontSize: '10px', opacity: 0.5 }}>Login to vote</span>
                                        )}
                                    </>
                                ) : (
                                    <span style={{ fontSize: '10px', background: 'red', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <AlertTriangle size={10} /> Flagged
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox Modal */}
            {selectedImage && (
                <div
                    onClick={() => setSelectedImage(null)}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.9)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px', animation: 'fadeIn 0.2s'
                    }}
                >
                    <img
                        src={selectedImage}
                        style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '8px', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        onClick={() => setSelectedImage(null)}
                        style={{
                            position: 'absolute', top: '20px', right: '20px',
                            background: 'rgba(255,255,255,0.2)', color: 'white',
                            border: 'none', borderRadius: '50%', width: '40px', height: '40px',
                            cursor: 'pointer', fontSize: '20px'
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
}
