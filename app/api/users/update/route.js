import { NextResponse } from "next/server";
import { db } from "../../../../firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req) {
  try {
    const body = await req.json();
    const { uid, fullName, email, school, role } = body;

    if (!uid) {
      return NextResponse.json({ error: "Missing user id (uid)" }, { status: 400 });
    }
    if (!fullName || !email) {
      return NextResponse.json({ error: "Name and email required" }, { status: 400 });
    }

    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      fullName,
      email,
      school: school || "",
      role: role || "student",
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("API update error:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
