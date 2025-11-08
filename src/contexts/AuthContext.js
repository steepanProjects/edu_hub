import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { api } from '../api/client';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  async function signup(email, password, fullName, role = 'student') {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: fullName
      });
      
      // Send verification email (account creation only)
      try { await sendEmailVerification(userCredential.user); } catch {}

      return userCredential;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  } // Added closing brace here

  async function loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);

      // Fetch user profile via backend; if missing, create it
      let profile = null;
      try {
        profile = await api.get(`/api/users/${userCredential.user.uid}`);
      } catch (err) {
        const newProfile = {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          full_name: userCredential.user.displayName || userCredential.user.email,
          role: 'student'
        };
        try {
          profile = await api.post('/api/users/upsert', newProfile);
        } catch (createErr) {
          console.error('Error creating missing user profile:', createErr);
        }
      }

      if (profile) setUserProfile(profile);
      return userCredential;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  }

  async function resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  async function resendVerificationEmail() {
    try {
      if (!auth.currentUser) throw new Error('Not signed in');
      await sendEmailVerification(auth.currentUser);
      return true;
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  }

  async function login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch user profile via backend; if missing, create it
      let profile = null;
      try {
        profile = await api.get(`/api/users/${userCredential.user.uid}`);
      } catch (err) {
        const newProfile = {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          full_name: userCredential.user.displayName || userCredential.user.email,
          role: 'student'
        };
        try {
          profile = await api.post('/api/users/upsert', newProfile);
        } catch (createErr) {
          console.error('Error creating missing user profile:', createErr);
        }
      }

      if (profile) setUserProfile(profile);

      return userCredential;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async function updateUserProfile(updates) {
    try {
      await api.patch(`/api/users/${currentUser.uid}`, updates);

      // Update local state
      setUserProfile(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch user profile via backend; if missing, create it
        let profile = null;
        try {
          profile = await api.get(`/api/users/${user.uid}`);
        } catch (err) {
          const newProfile = {
            id: user.uid,
            email: user.email,
            full_name: user.displayName || user.email,
            role: 'student'
          };
          try {
            profile = await api.post('/api/users/upsert', newProfile);
          } catch (createErr) {
            console.error('Error creating missing user profile:', createErr);
          }
        }

        if (profile) setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    signup,
    login,
    loginWithGoogle,
    resetPassword,
    resendVerificationEmail,
    logout,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
