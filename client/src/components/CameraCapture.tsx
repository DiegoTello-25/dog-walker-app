import { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { storage, db } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, setDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

interface Props {
    user: any;
    onUploadComplete: () => void;
}

export function CameraCapture({ user, onUploadComplete }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');
    const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);

    useEffect(() => {
        startCamera();
        loadModel();
        return () => stopCamera();
    }, []);

    const loadModel = async () => {
        setStatus('Cargando...');
        try {
            // Force smaller model for speed (mobilenet_v2)
            const m = await cocoSsd.load({ base: 'mobilenet_v2' });
            setModel(m);
            setStatus('');
        } catch (e) {
            console.error("Failed to load model", e);
            setStatus('Error de IA. Carga manual activa.');
        }
    };

    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
        } catch (err) {
            console.error(err);
        }
    };

    const stopCamera = () => {
        stream?.getTracks().forEach(t => t.stop());
        setStream(null);
    };

    const processAndUpload = async (imageSource: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement, blob: Blob) => {
        if (!model) {
            toast.error("Cargando modelo IA...");
            return;
        }

        setUploading(true);
        const loadingToast = toast.loading('Analizando 🐕...');

        try {
            // 1. Client-side ML Check
            const predictions = await model.detect(imageSource);
            const dog = predictions.find(p => p.class === 'dog' || p.class === 'cat' || p.class === 'animal');
            const isVerified = !!dog;

            if (!isVerified) {
                toast.dismiss(loadingToast);
                const override = confirm("🐶 No se detectó perro. ¿Subir igual?");
                if (!override) {
                    setUploading(false);
                    return;
                }
                toast.loading('Subiendo prueba (Manual)...', { id: loadingToast });
            } else {
                toast.success('¡Perro Detectado!', { id: loadingToast });
                toast.loading('Subiendo prueba...', { id: loadingToast });
            }

            // 2. Upload to Firebase Storage
            const filename = `proofs/${user.uid}_${Date.now()}.jpg`;
            const storageRef = ref(storage, filename);
            await uploadBytes(storageRef, blob);
            const url = await getDownloadURL(storageRef);

            // 3. Save "Walk" to Firestore
            const safeName = user.name || user.displayName || "Usuario";
            console.log("Saving walk for:", safeName, user.uid);

            try {
                await addDoc(collection(db, "walks"), {
                    siblingUid: user.uid, // This is the visible (test) user
                    siblingName: safeName,
                    photoUrl: url,
                    timestamp: serverTimestamp(),
                    verified: isVerified,
                    mlConfidence: dog ? dog.score : 0,
                });
                console.log("Walk saved successfully");
            } catch (firestoreError: any) {
                console.error("Firestore Save Failed:", firestoreError);
                toast.error(`Error guardando en BD: ${firestoreError.message}`, { id: loadingToast });
                setUploading(false); // Stop here if DB fails
                return;
            }

            // 4. Update Turn (Simple Rotation Logic)
            if (isVerified) {
                try {
                    // Fetch all siblings to find the next one
                    const siblingsSnap = await getDocs(query(collection(db, "siblings"), orderBy("createdAt", "asc")));
                    const siblings = siblingsSnap.docs.map(d => ({ uid: d.id, ...d.data() } as any));

                    if (siblings.length > 0) {
                        const currentIndex = siblings.findIndex(s => s.uid === user.uid);
                        // If user not found (currentIndex -1), default to 0
                        const nextIndex = (currentIndex + 1) % siblings.length;
                        const nextSibling = siblings[nextIndex];

                        // Use setDoc with merge to create if missing
                        await setDoc(doc(db, "turns", "current_turn"), {
                            siblingUid: nextSibling.uid,
                            siblingName: nextSibling.name,
                            lastWalker: safeName,
                            status: 'WAITING',
                            updatedAt: serverTimestamp()
                        }, { merge: true });

                        toast.success(`¡Turno asignado a ${nextSibling.name}!`, { id: loadingToast });
                    }
                } catch (e: any) {
                    console.error("Error rotating turn:", e);
                    // Show actual error message if possible to help debug
                    toast.error(`Error al rotar: ${e.message}`, { id: loadingToast });
                }
            }

            toast.success('¡Paseo Registrado!', { id: loadingToast });
            onUploadComplete();

        } catch (err: any) {
            console.error("Critical Upload Error:", err);
            toast.error(`Error Crítico: ${err.message}`, { id: loadingToast });
        } finally {
            setUploading(false);
            setStatus('');
        }
    };

    const capture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const context = canvasRef.current.getContext('2d');
        if (!context) return;

        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);

        canvasRef.current.toBlob(blob => {
            if (blob) processAndUpload(canvasRef.current!, blob);
        }, 'image/jpeg', 0.8);
    };



    return (
        <div className="glass" style={{ padding: '20px', textAlign: 'center', marginTop: '20px' }}>
            <h3>¡Pruébalo! 📸</h3>
            <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000', marginBottom: '16px' }}>
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: 'block' }} />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            {status && <p style={{ color: 'yellow', marginBottom: '10px' }}>{status}</p>}

            <button className="btn" onClick={capture} disabled={uploading || !model} style={{ width: '100%', justifyContent: 'center' }}>
                {uploading ? <RefreshCw className="animate-spin" /> : <Camera />}
                {uploading ? ' Procesando...' : ' Capturar y Verificar'}
            </button>
        </div>
    );
}
