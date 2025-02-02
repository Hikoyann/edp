import React, { useState } from "react";
import { auth, database, storage } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { ref as dbRef, get, set } from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import QRCode from "qrcode";

export function Register() {
  const [user] = useAuthState(auth);
  const [successMessage, setSuccessMessage] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [inputs, setInputs] = useState({
    equipmentName: "",
    equipmentDetails: "",
  });

  const handleFileChange = (e) => {
    setPhotoFile(e.target.files[0]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs({ ...inputs, [name]: value });
  };

  const sendToDiscord = async (message) => {
    await fetch("/api/discord", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (user) {
      const inventoryRef = dbRef(database, "equipmentRegistry");
      const snapshot = await get(inventoryRef);

      let maxEquipmentNum = 0;
      if (snapshot.exists()) {
        const existingData = snapshot.val();
        for (const key in existingData) {
          const equipmentNum = existingData[key].num;
          if (equipmentNum > maxEquipmentNum) {
            maxEquipmentNum = equipmentNum;
          }
        }
      }

      const newEquipmentNum = maxEquipmentNum + 1;
      const qrDataUrl = `https://mgmt-vercel.vercel.app/equipmentRegistry/${newEquipmentNum}`;
      const qrCode = await QRCode.toDataURL(qrDataUrl, {
        errorCorrectionLevel: "M",
        width: 200,
        margin: 8,
      });

      let photoUrl = "";
      if (photoFile) {
        const photoStorageRef = storageRef(
          storage,
          `equipmentPhotos/${newEquipmentNum}`
        );
        await uploadBytes(photoStorageRef, photoFile);
        photoUrl = await getDownloadURL(photoStorageRef);
      }

      const updatedInputs = {
        num: newEquipmentNum,
        equipmentName: inputs.equipmentName,
        equipmentDetails: inputs.equipmentDetails,
        qrCode,
        photo: photoUrl,
        addedDate: new Date().toISOString(),
        email: user.email,
      };

      await set(
        dbRef(database, `equipmentRegistry/${newEquipmentNum}`),
        updatedInputs
      );

      const message = `新しい備品が登録されました！\n登録者: ${
        user.displayName || user.email
      }\n備品ID: ${newEquipmentNum}\n備品名: ${inputs.equipmentName}\n詳細: ${
        inputs.equipmentDetails
      }`;
      sendToDiscord(message);

      setInputs({ equipmentName: "", equipmentDetails: "" });
      setPhotoFile(null);
      setSuccessMessage("備品を登録しました。");

      setTimeout(() => {
        setSuccessMessage("");
        window.location.reload();
      }, 4000);
    }
  };

  return (
    <div>
      {user ? (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">備品登録フォーム</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label>備品名</label>
              <input
                type="text"
                name="equipmentName"
                value={inputs.equipmentName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-4">
              <label>備品の詳細</label>
              <input
                type="text"
                name="equipmentDetails"
                value={inputs.equipmentDetails}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-4">
              <label>写真をアップロード</label>
              <input type="file" onChange={handleFileChange} accept="image/*" />
            </div>
            <button
              type="submit"
              className="submit-button bg-blue-500 text-white py-1 px-2 rounded"
            >
              送信
            </button>
          </form>
          {successMessage && (
            <div className="mt-4 text-white font-semibold">
              {successMessage}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-4">
          登録フォームを使用するには、サインインしてください。
        </div>
      )}
    </div>
  );
}
