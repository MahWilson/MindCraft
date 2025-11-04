"use client";
import { useState } from "react";

export default function ChangePassword() {
  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/changePassword", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, oldPassword, newPassword }),
    });
    const data = await res.json();
    setMessage(data.message || data.error);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-900 text-white rounded-xl">
      <h2 className="text-xl font-bold mb-4">Change Password</h2>
      <form onSubmit={handleSubmit}>
        <input className="p-2 mb-2 w-full text-black rounded" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="p-2 mb-2 w-full text-black rounded" type="password" placeholder="Old Password" value={oldPassword} onChange={(e)=>setOldPassword(e.target.value)} />
        <input className="p-2 mb-2 w-full text-black rounded" type="password" placeholder="New Password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} />
        <button className="bg-blue-600 w-full py-2 rounded mt-2">Update Password</button>
      </form>
      {message && <p className="mt-3 text-center">{message}</p>}
    </div>
  );
}
