import { NextResponse } from "next/server";
import { db, auth } from "../../../../firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { deleteUser } from "firebase/auth";

export async function POST(req) {
  try {
    const { uid } = await req.json();
    if (!uid) return NextResponse.json({ error: "Missing user id (uid)" }, { status: 400 });

    // Delete Firestore user doc
    await deleteDoc(doc(db, "users", uid));

    // Try to delete auth user if the current client user matches (best-effort):
    try {
      const user = auth.currentUser;
      if (user && user.uid === uid) {
        await deleteUser(user);
      }
    } catch (authErr) {
      // If this fails on server (client SDK may not allow), ignore — the doc is removed.
      console.warn("Could not delete auth user from server API:", authErr?.message || authErr);
    }

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("API delete error:", err);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
