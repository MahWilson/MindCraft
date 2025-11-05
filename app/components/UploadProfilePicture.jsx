"use client";
import { useState } from "react";

export default function UploadProfilePicture({ userId }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!file) return setMessage("Please choose a file first.");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);

    const res = await fetch("/api/uploadProfilePicture", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setMessage(data.success ? "Upload successful!" : data.error);
    if (data.url) setPreview(data.url);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-900 text-white rounded-xl">
      <h2 className="text-xl font-bold mb-4">Upload Profile Picture</h2>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
      <button className="bg-green-600 w-full py-2 mt-2 rounded" onClick={handleUpload}>
        Upload
      </button>
      {message && <p className="mt-3 text-center">{message}</p>}
      {preview && <img src={preview} alt="Profile" className="mt-3 w-32 h-32 rounded-full mx-auto" />}
    </div>
  );
}
