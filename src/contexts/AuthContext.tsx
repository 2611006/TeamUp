import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  AuthError
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { createProfile, getProfile } from '@/services/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isFirebaseConfigured();

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [isConfigured]);

  const login = async (email: string, password: string) => {
    if (!isConfigured) return { error: 'Firebase not configured' };
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return {};
    } catch (err) {
      const error = err as AuthError;
      return { error: getAuthErrorMessage(error.code) };
    }
  };

  const register = async (email: string, password: string, name: string) => {
    if (!isConfigured) return { error: 'Firebase not configured' };
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Check if profile already exists (edge case)
      const existingProfile = await getProfile(credential.user.uid);
      if (!existingProfile) {
        // Create initial profile document in Firestore with just the name
        // User will complete full profile after this
        await createProfile(credential.user.uid, {
          email: email,
          fullName: name,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
        });
      }
      
      return {};
    } catch (err) {
      const error = err as AuthError;
      return { error: getAuthErrorMessage(error.code) };
    }
  };

  const logout = async () => {
    if (isConfigured) {
      await signOut(auth);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isConfigured, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered';
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/invalid-credential':
      return 'Invalid email or password';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later';
    default:
      return 'An error occurred. Please try again';
  }
}
