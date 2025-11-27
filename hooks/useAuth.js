"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

// Minimal client-side hook that returns auth user and user profile from Firestore
export function useAuth() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({ role: "guest" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubUserSnapshot = null;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        const userRef = doc(db, "users", u.uid);
        unsubUserSnapshot = onSnapshot(
          userRef,
          (snap) => {
            if (snap.exists()) {
              setUserData(snap.data());
            } else {
              setUserData({ role: "student", name: u.displayName || "" });
            }
            setLoading(false);
          },
          (err) => {
            console.error("useAuth: user snapshot error", err);
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setUserData({ role: "guest" });
        setLoading(false);
        if (unsubUserSnapshot) {
          unsubUserSnapshot();
          unsubUserSnapshot = null;
        }
      }
    });

    return () => {
      unsubAuth();
      if (unsubUserSnapshot) unsubUserSnapshot();
    };
  }, []);

  return { user, userData, loading };
}

export default useAuth;
