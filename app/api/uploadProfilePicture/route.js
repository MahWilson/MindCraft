import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { NextResponse } from "next/server";
import { initializeApp } from "firebase/app";
import { firebaseConfig } from "../../../firebaseConfig";

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const userId = formData.get("userId");

  try {
    const storageRef = ref(storage, `profilePictures/${userId}.jpg`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadBytes(storageRef, buffer, { contentType: file.type });
    const url = await getDownloadURL(storageRef);

    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { photoURL: url });

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Upload error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
