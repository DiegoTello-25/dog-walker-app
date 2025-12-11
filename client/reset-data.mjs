// Reset Firestore Data Script
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCWbmQtLh5WXwTkEUc5NfnTroJtSA3258Q",
    authDomain: "dogwalker-b090e.firebaseapp.com",
    projectId: "dogwalker-b090e",
    storageBucket: "dogwalker-b090e.firebasestorage.app",
    messagingSenderId: "284666576510",
    appId: "1:284666576510:web:27556c342fd5bf4cd7222f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function resetData() {
    console.log("🗑️ Borrando historial de paseos...");

    // Delete all walks
    const walksSnap = await getDocs(collection(db, "walks"));
    for (const walkDoc of walksSnap.docs) {
        await deleteDoc(doc(db, "walks", walkDoc.id));
        console.log(`  Deleted walk: ${walkDoc.id}`);
    }
    console.log(`✅ ${walksSnap.docs.length} paseos eliminados.`);

    // Delete current turn
    console.log("🔄 Reseteando turno...");
    try {
        await deleteDoc(doc(db, "turns", "current_turn"));
        console.log("✅ Turno reseteado.");
    } catch (e) {
        console.log("  (No había turno activo)");
    }

    console.log("\n🎉 ¡Datos reseteados!");
    process.exit(0);
}

resetData().catch(e => {
    console.error("Error:", e);
    process.exit(1);
});
