import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { NextResponse } from "next/server";

export async function POST(request) {
  const { email, oldPassword, newPassword } = await request.json();
  const auth = getAuth();

  try {
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(email, oldPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);

    return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Password update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
