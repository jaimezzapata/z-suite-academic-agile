// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD3HjosAZg5bc1H6RGB_Tw2uPwOSJzlUt4",
  authDomain: "z-suite-academic-agile.firebaseapp.com",
  projectId: "z-suite-academic-agile",
  storageBucket: "z-suite-academic-agile.firebasestorage.app",
  messagingSenderId: "524259557449",
  appId: "1:524259557449:web:85eb2acc9ef9b12a48ff98"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);