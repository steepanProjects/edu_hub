import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyANvda3139oLvsUmN2PlVdda9uzEZdyTlc",
  authDomain: "lets-connect-1b9c5.firebaseapp.com",
  projectId: "lets-connect-1b9c5",
  storageBucket: "lets-connect-1b9c5.firebasestorage.app",
  messagingSenderId: "188065317101",
  appId: "1:188065317101:web:6c033248d06a32d6350ce4",
  measurementId: "G-EBPGSKRDXQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
