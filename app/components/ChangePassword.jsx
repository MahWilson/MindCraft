"use client";
import { useState } from "react";
import { auth } from "../../firebase";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";

export default function ChangePassword() {
  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleChangePassword = async () => {
    try {
      if (!email || !oldPassword || !newPassword)
        return setMessage("❌ Please fill in all fields.");

      if (oldPassword === newPassword)
        return setMessage("⚠️ New password must be different from current password.");

      const user = auth.currentUser;
      if (!user) return setMessage("❌ No user is logged in.");

      // Reauthenticate user first
      const credential = EmailAuthProvider.credential(email, oldPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);
      setMessage("✅ Password updated successfully!");
    } catch (error) {
      setMessage("❌ " + error.message);
    }
  };

  return (
    <div className="container">
      <h1>Change Password</h1>

      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Current password"
        value={oldPassword}
        onChange={(e) => setOldPassword(e.target.value)}
      />

      <input
        type="password"
        placeholder="New password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />

      <button onClick={handleChangePassword}>Update Password</button>
      {message && (
        <p style={{ marginTop: "10px", textAlign: "center" }}>{message}</p>
      )}
    </div>
  );
}
