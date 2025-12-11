// IMPORTANT: Ku habboon config-ga web-kaaga ee aad ka timid firebase_options.dart
import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDoQCrQTxW2UbfGEudFufabKFJ0h1QezAk",
  authDomain: "apartment-6ed7b.firebaseapp.com",
  projectId: "apartment-6ed7b",
  storageBucket: "apartment-6ed7b.appspot.com", // ✅ sax
  messagingSenderId: "247331757463",
  appId: "1:247331757463:web:30c0a755a60231867cf8d2"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const storage = getStorage(app);

  