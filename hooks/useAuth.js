"use client";
import { useEffect, useState } from 'react';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { db } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userRef = doc(db, 'user', u.uid);
          const legacyUserRef = doc(db, 'users', u.uid);
          const [snap, legacySnap] = await Promise.all([getDoc(userRef), getDoc(legacyUserRef)]);
          const profileRef = snap.exists() ? userRef : legacySnap.exists() ? legacyUserRef : userRef;
          const profileSnap = snap.exists() ? snap : legacySnap;
          const ADMIN_EMAILS = ['admin@mindcraft.local', 'testadmin@gmail.com'];
          const TEACHER_EMAILS = ['teacher1@gmail.com', 'teach1@gmail.com'];
          const computed = ADMIN_EMAILS.includes(u.email)
            ? 'admin'
            : TEACHER_EMAILS.includes(u.email)
            ? 'teacher'
            : 'student';
          let role = computed;
          if (profileSnap.exists()) {
            const docRole = profileSnap.data().role || 'student';
            role = docRole;
            const normalizedDocRole = String(docRole || '').toLowerCase();
            const normalizedComputed = String(computed || '').toLowerCase();
            const shouldUpgrade = (normalizedComputed === 'admin' || normalizedComputed === 'teacher') && normalizedDocRole !== normalizedComputed;
            if (shouldUpgrade) {
              try {
                await setDoc(profileRef, { role: normalizedComputed }, { merge: true });
                role = normalizedComputed;
              } catch {}
            }
          } else {
            // Create profile with computed role
            try {
              await setDoc(profileRef, { uid: u.uid, email: u.email, name: u.displayName || '', role: computed }, { merge: true });
            } catch {}
            role = computed;
          }
          setUserData({ uid: u.uid, email: u.email, name: u.displayName || '', role: String(role || 'student').toLowerCase() });
        } catch {
          const fallback = ADMIN_EMAILS.includes(u.email) ? 'admin' : TEACHER_EMAILS.includes(u.email) ? 'teacher' : 'student';
          setUserData({ uid: u.uid, email: u.email, name: u.displayName || '', role: fallback });
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { user, userData, loading };
}
