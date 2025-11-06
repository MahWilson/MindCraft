"use client";
import { useState } from "react";

export default function UploadProfilePicture() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleUpload = () => {
    alert("Profile picture uploaded (demo only)");
  };

  return (
    <div className="container">
      <h1>Upload Profile Picture</h1>
      {preview && (
        <img
          src={preview}
          alt="Preview"
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            objectFit: "cover",
            margin: "12px auto",
            display: "block",
            border: "3px solid #2563eb",
          }}
        />
      )}
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
}
