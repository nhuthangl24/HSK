'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile as fbUpdateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { getFirebaseServices } from '@/lib/firebase';
import {
  saveUserToFirestore,
  getUserFromFirestore,
  updateUserInFirestore,
} from '@/lib/firebase-db';
import { User } from '@/types/auth';
import { getStreak } from '@/lib/streak';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; message?: string }>;
  register: (
    name: string,
    email: string,
    password?: string,
    targetHsk?: number
  ) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = [
  process.env.NEXT_PUBLIC_ADMIN_EMAIL,
  'luunhuthang2402@gmail.com',
  'nhuthangl24@gmail.com',
]
  .filter(Boolean)
  .map((e) => (e as string).toLowerCase().trim());

function mapFirebaseAuthError(code: string, fallbackMessage: string): string {
  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Phương thức Email/Password chưa được kích hoạt trên Firebase Console. Vui lòng vào Firebase Console > Authentication > Sign-in method > Bật "Email/Password".';
    case 'auth/email-already-in-use':
      return 'Địa chỉ email này đã được sử dụng cho một tài khoản khác.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email hoặc mật khẩu không chính xác.';
    case 'auth/weak-password':
      return 'Mật khẩu quá ngắn, vui lòng nhập ít nhất 6 ký tự.';
    case 'auth/invalid-email':
      return 'Địa chỉ email không đúng định dạng.';
    case 'auth/too-many-requests':
      return 'Tài khoản bị tạm khóa vì đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.';
    case 'auth/network-request-failed':
      return 'Lỗi kết nối mạng đến Firebase. Vui lòng kiểm tra đường truyền.';
    default:
      return fallbackMessage || 'Đã xảy ra lỗi xác thực Firebase.';
  }
}

const STORAGE_KEY_AUTH_USER = 'hsk_auth_user_cache_v2';

export function getCachedUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH_USER);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function syncServerSession(u: User | null) {
  if (typeof window === 'undefined') return;
  if (u) {
    fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: u }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          localStorage.setItem('hsk_session_token', data.token);
        }
      })
      .catch(() => {});
  } else {
    localStorage.removeItem('hsk_session_token');
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  }
}

export function setCachedUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(user));
      syncServerSession(user);
    } else {
      localStorage.removeItem(STORAGE_KEY_AUTH_USER);
      syncServerSession(null);
    }
  } catch {
    // Ignore quota errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const cached = getCachedUser();
    if (cached) syncServerSession(cached);
    return cached;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => !getCachedUser());

  // Subscribe to real Firebase Auth state changes
  useEffect(() => {
    const { auth } = getFirebaseServices();
    if (!auth) {
      const timer = setTimeout(() => setIsLoading(false), 0);
      return () => clearTimeout(timer);
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        try {
          const profile = await getUserFromFirestore(fbUser.uid);
          const email = (fbUser.email || '').toLowerCase();
          const isAdminByEmail = ADMIN_EMAILS.includes(email);

          if (profile) {
            // If user's account is locked by admin
            if (profile.isLocked) {
              await fbSignOut(auth);
              setCachedUser(null);
              setUser(null);
              setIsLoading(false);
              return;
            }

            // Sync admin role if email matches owner
            if (isAdminByEmail && profile.role !== 'admin') {
              profile.role = 'admin';
              updateUserInFirestore(fbUser.uid, { role: 'admin' }).catch(() => {});
            }

            // Update lastLoginAt & sync real streak
            const now = new Date().toISOString();
            const localStreak = getStreak(fbUser.uid);
            const effectiveStreak = Math.max(profile.streakDays || 0, localStreak.currentStreak);
            const fullProfile: User = { ...profile, streakDays: effectiveStreak, lastLoginAt: now };
            setCachedUser(fullProfile);
            setUser(fullProfile);
            setIsLoading(false);

            // Fire-and-forget background update to Firestore
            updateUserInFirestore(fbUser.uid, { lastLoginAt: now, streakDays: effectiveStreak }).catch(() => {});
          } else {
            // First time login - auto create Firestore user document
            const localStreak = getStreak(fbUser.uid);
            const newUser: User = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Học viên',
              email: fbUser.email || '',
              role: isAdminByEmail ? 'admin' : 'user',
              streakDays: Math.max(1, localStreak.currentStreak),
              totalMastered: 0,
              targetHsk: 3,
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setCachedUser(newUser);
            setUser(newUser);
            setIsLoading(false);
            saveUserToFirestore(newUser).catch(() => {});
          }
        } catch (err) {
          console.error('Error fetching/syncing user from Firestore:', err);
          // Fallback minimal user object so UI doesn't crash on permission errors
          const email = (fbUser.email || '').toLowerCase();
          const localStreak = getStreak(fbUser.uid);
          const fallbackUser: User = {
            id: fbUser.uid,
            name: fbUser.displayName || email.split('@')[0] || 'Người dùng',
            email,
            role: ADMIN_EMAILS.includes(email) ? 'admin' : 'user',
            streakDays: Math.max(1, localStreak.currentStreak),
            totalMastered: 0,
            createdAt: new Date().toISOString(),
          };
          setCachedUser(fallbackUser);
          setUser(fallbackUser);
          setIsLoading(false);
        }
      } else {
        setCachedUser(null);
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password = ''): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    const { auth } = getFirebaseServices();
    if (!auth) {
      setIsLoading(false);
      return { success: false, message: 'Dịch vụ Firebase Auth chưa được cấu hình.' };
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const fbUser = cred.user;

      // Check if locked in Firestore
      const profile = await getUserFromFirestore(fbUser.uid);
      if (profile?.isLocked) {
        await fbSignOut(auth);
        setUser(null);
        return {
          success: false,
          message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.',
        };
      }

      return { success: true };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      const rawMsg = (err as { message?: string })?.message || '';
      return {
        success: false,
        message: mapFirebaseAuthError(code, rawMsg),
      };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    const { auth } = getFirebaseServices();
    if (!auth) {
      setIsLoading(false);
      return { success: false, message: 'Dịch vụ Firebase Auth chưa được cấu hình.' };
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      const fbUser = cred.user;
      const cleanEmail = (fbUser.email || '').toLowerCase();
      const isAdminByEmail = ADMIN_EMAILS.includes(cleanEmail);

      const profile = await getUserFromFirestore(fbUser.uid);
      if (profile) {
        if (profile.isLocked) {
          await fbSignOut(auth);
          setUser(null);
          return { success: false, message: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.' };
        }
        if (isAdminByEmail && profile.role !== 'admin') {
          profile.role = 'admin';
          await updateUserInFirestore(fbUser.uid, { role: 'admin' });
        }
        const now = new Date().toISOString();
        await updateUserInFirestore(fbUser.uid, { lastLoginAt: now });
        const fullProfile = { ...profile, lastLoginAt: now };
        setCachedUser(fullProfile);
        setUser(fullProfile);
      } else {
        const newUser: User = {
          id: fbUser.uid,
          name: fbUser.displayName || cleanEmail.split('@')[0] || 'Học viên',
          email: cleanEmail,
          avatar: fbUser.photoURL || undefined,
          role: isAdminByEmail ? 'admin' : 'user',
          streakDays: 1,
          totalMastered: 0,
          targetHsk: 3,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await saveUserToFirestore(newUser);
        setCachedUser(newUser);
        setUser(newUser);
      }
      return { success: true };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      const rawMsg = (err as { message?: string })?.message || '';
      if (code === 'auth/popup-closed-by-user') {
        return { success: false, message: 'Bạn đã đóng cửa sổ đăng nhập Google.' };
      }
      if (code === 'auth/cancelled-popup-request') {
        return { success: false, message: 'Yêu cầu đăng nhập đã bị hủy.' };
      }
      if (code === 'auth/popup-blocked') {
        return { success: false, message: 'Trình duyệt đã chặn cửa sổ popup. Vui lòng cho phép popup để đăng nhập Google.' };
      }
      return { success: false, message: mapFirebaseAuthError(code, rawMsg) };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password = '',
    targetHsk = 3
  ): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    const { auth } = getFirebaseServices();
    if (!auth) {
      setIsLoading(false);
      return { success: false, message: 'Dịch vụ Firebase Auth chưa được cấu hình.' };
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const fbUser = cred.user;

      // Update displayName in Firebase Auth
      if (name.trim()) {
        try {
          await fbUpdateProfile(fbUser, { displayName: name.trim() });
        } catch {
          // ignore profile update error
        }
      }

      // Check admin status
      const isAdminByEmail = ADMIN_EMAILS.includes(cleanEmail);
      const newUser: User = {
        id: fbUser.uid,
        name: name.trim() || cleanEmail.split('@')[0],
        email: cleanEmail,
        role: isAdminByEmail ? 'admin' : 'user',
        streakDays: 1,
        totalMastered: 0,
        targetHsk,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveUserToFirestore(newUser);
      setCachedUser(newUser);
      setUser(newUser);
      return { success: true };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      const rawMsg = (err as { message?: string })?.message || '';
      return {
        success: false,
        message: mapFirebaseAuthError(code, rawMsg),
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setCachedUser(null);
    setUser(null);
    const { auth } = getFirebaseServices();
    if (auth) {
      try {
        await fbSignOut(auth);
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
  };

  const resetPassword = async (
    email: string
  ): Promise<{ success: boolean; message?: string }> => {
    const { auth } = getFirebaseServices();
    if (!auth) {
      return { success: false, message: 'Dịch vụ Firebase Auth chưa được cấu hình.' };
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: 'Vui lòng nhập địa chỉ email của bạn.' };
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return {
        success: true,
        message: 'Đã gửi liên kết khôi phục mật khẩu. Vui lòng kiểm tra hộp thư đến hoặc mục thư rác (spam).',
      };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      const rawMsg = (err as { message?: string })?.message || '';
      return {
        success: false,
        message: mapFirebaseAuthError(code, rawMsg),
      };
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates, updatedAt: new Date().toISOString() };
    setCachedUser(updated);
    setUser(updated);
    await updateUserInFirestore(user.id, updates);
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        isLoading,
        login,
        loginWithGoogle,
        register,
        resetPassword,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
