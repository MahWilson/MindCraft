"use client";
import { useEffect, useState } from 'react';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userRef = doc(db, 'users', u.uid);
          const snap = await getDoc(userRef);
          const ADMIN_EMAILS = ['admin@mindcraft.local', 'testadmin@gmail.com'];
          const TEACHER_EMAILS = ['teacher1@gmail.com', 'teach1@gmail.com'];
          const computed = ADMIN_EMAILS.includes(u.email)
            ? 'admin'
            : TEACHER_EMAILS.includes(u.email)
            ? 'teacher'
            : 'student';
          let role = computed;
          if (snap.exists()) {
            const docRole = snap.data().role || 'student';
            role = docRole;
            // If recognized admin/teacher by email but doc role mismatches, fix it
            if (computed !== docRole) {
              try { await setDoc(userRef, { role: computed }, { merge: true }); role = computed; } catch {}
            }
          } else {
            // Create profile with computed role
            try { await setDoc(userRef, { uid: u.uid, email: u.email, name: u.displayName || '', role: computed }, { merge: true }); } catch {}
            role = computed;
          }
          setUserData({ uid: u.uid, email: u.email, name: u.displayName || '', role });
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
