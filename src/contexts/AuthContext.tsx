import React, { useEffect, useMemo, useState } from "react";
import {
  browserLocalPersistence,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AuthContext } from "@/contexts/auth-context";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};

    setPersistence(auth, browserLocalPersistence)
      .catch((error) => {
        console.error("Failed to set Firebase Auth persistence:", error);
      })
      .finally(() => {
        unsubscribe = onAuthStateChanged(auth, (nextUser) => {
          setUser(nextUser);
          setLoading(false);
        });
      });

    return () => unsubscribe();
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      async signIn(email: string, password: string) {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, email, password);
      },
      async signUp(name: string, email: string, password: string) {
        await setPersistence(auth, browserLocalPersistence);
        const credentials = await createUserWithEmailAndPassword(auth, email, password);

        if (name.trim()) {
          await updateProfile(credentials.user, {
            displayName: name.trim(),
          });
        }
      },
      async logOut() {
        await signOut(auth);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
