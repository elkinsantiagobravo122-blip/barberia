import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAUMmZyt1d0lbi_QVJICHhKS_Y9GZlPlKo',
  authDomain: 'barberia-d8bac.firebaseapp.com',
  projectId: 'barberia-d8bac',
  storageBucket: 'barberia-d8bac.firebasestorage.app',
  messagingSenderId: '252966938446',
  appId: '1:252966938446:web:de3486966e8aa1ee6e601f',
  measurementId: 'G-KWKH24EVC8',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
