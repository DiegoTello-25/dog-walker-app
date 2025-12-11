// Seed Mock Walk Script
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

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

async function seedMockWalk() {
    console.log("Seeding mock walk for Eduardo...");

    await setDoc(doc(db, "walks", "mock_walk_eduardo"), {
        siblingUid: "eduardo_test_uid",
        siblingName: "Eduardo",
        photoUrl: "https://images.dog.ceo/breeds/retriever-golden/n02099601_3004.jpg",
        timestamp: serverTimestamp(),
        verified: true,
        rejections: []
    });

    console.log("✅ Mock walk for Eduardo created!");
    process.exit(0);
}

seedMockWalk().catch(e => {
    console.error("Error:", e);
    process.exit(1);
});
