import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface UserContextType {
    user: User | null;
    siblingData: any | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    loading: boolean;
}

const UserContext = createContext<UserContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [siblingData, setSiblingData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        // Safety timeout in case Firebase is slow/blocked
        const timeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn("Auth timeout reached - forcing load");
                setLoading(false);
            }
        }, 3000);

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!mounted) return;
            setUser(currentUser);
            try {
                if (currentUser) {
                    // Sync with 'siblings' collection
                    const userRef = doc(db, 'siblings', currentUser.uid);
                    const userSnap = await getDoc(userRef);

                    if (userSnap.exists()) {
                        setSiblingData(userSnap.data());
                    } else {
                        /**
                         * NOTE: This might fail if Firestore rules are locked.
                         * If allow write is off, this throws.
                         */
                        const newData = {
                            name: currentUser.displayName || 'Walker',
                            email: currentUser.email,
                            photoURL: currentUser.photoURL,
                            createdAt: serverTimestamp(),
                            uid: currentUser.uid
                        };
                        await setDoc(userRef, newData);
                        setSiblingData(newData);
                    }
                } else {
                    setSiblingData(null);
                }
            } catch (err) {
                console.error("Auth/Firestore Error:", err);
                setSiblingData(null);
            } finally {
                if (mounted) setLoading(false);
            }
        });
        return () => {
            mounted = false;
            clearTimeout(timeout);
            unsubscribe();
        };
    }, []);

    const login = async () => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    };

    const logout = () => signOut(auth);

    return (
        <UserContext.Provider value={{ user, siblingData, login, logout, loading }}>
            {children}
        </UserContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(UserContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
