// Firebase Configuration
// This file contains the Firebase configuration for the quiz application
// Replace these values with your actual Firebase project configuration

const firebaseConfig = {
    apiKey: "AIzaSyCpQo3kFn-9a6pa929fppPFWN09PWCabCM",
    authDomain: "quiz-2c8f8.firebaseapp.com",
    projectId: "quiz-2c8f8",
    storageBucket: "quiz-2c8f8.firebasestorage.app",
    messagingSenderId: "183748436274",
    appId: "1:183748436274:web:c91eeefc4e45cef0c9f72b",
    measurementId: "G-R53FZS6RE5"
};

// Initialize Firebase
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;

