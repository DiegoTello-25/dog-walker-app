import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCWbmQtLh5WXwTkEUc5NfnTroJtSA3258Q",
    authDomain: "dogwalker-b090e.firebaseapp.com",
    projectId: "dogwalker-b090e",
    storageBucket: "dogwalker-b090e.firebasestorage.app",
    messagingSenderId: "284666576510",
    appId: "1:284666576510:web:27556c342fd5bf4cd7222f",
    measurementId: "G-CBYSVPXLF5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
