import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyA_XRPwamSW91IQl1PyY61xAcF_FL8LKSE",
    authDomain: "maillon-faible-e1a83.firebaseapp.com",
    databaseURL: "https://maillon-faible-e1a83-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "maillon-faible-e1a83",
    storageBucket: "maillon-faible-e1a83.firebasestorage.app",
    messagingSenderId: "53244966173",
    appId: "1:53244966173:web:abedc58e1e0582092f5df4"
};

export const db = getDatabase(initializeApp(firebaseConfig));
