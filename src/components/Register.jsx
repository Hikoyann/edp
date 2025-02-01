import React, { useCallback, useEffect, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, database, storage, provider } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { ref as dbRef, get, set } from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import QRCode from "qrcode";
// import QRCodeLib from "qrcode";

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
    console.log(storage);

    if (user) {
      const inventoryRef = dbRef(database, "equipmentRegistry");
      const snapshot = await get(inventoryRef);

      // 2. データの総数を取得して、新しい番号を決定
      // 既存のデータから最大の番号を取得
      let maxEquipmentNum = 0;
      if (snapshot.exists()) {
        const existingData = snapshot.val();
        for (const key in existingData) {
          const equipmentNum = existingData[key].num; // 既存の番号
          if (equipmentNum > maxEquipmentNum) {
            maxEquipmentNum = equipmentNum;
          }
        }
      }

      const newEquipmentNum = maxEquipmentNum + 1;
      // const newInventoryRef = push(inventoryRef);

      // QRコードを生成
      const qrDataUrlOne = `https://mgmt-vercel.vercel.app/equipmentRegistry/${newEquipmentNum}?id=${1}`;
      const qrCodeOne = await QRCode.toDataURL(qrDataUrlOne, {
        errorCorrectionLevel: "M", // 少しエラー訂正を強化
        width: 200, // QRコードの幅を200pxに設定
        margin: 8, // 少し余白を持たせる（2px程度）
      });
      const qrDataUrlTwo = `https://mgmt-vercel.vercel.app/equipmentRegistry/${newEquipmentNum}?id=${2}`;
      const qrCodeTwo = await QRCode.toDataURL(qrDataUrlTwo, {
        errorCorrectionLevel: "M", // 少しエラー訂正を強化
        width: 200, // QRコードの幅を200pxに設定
        margin: 8, // 少し余白を持たせる（2px程度）
      });
      const qrDataUrlThree = `https://mgmt-vercel.vercel.app/equipmentRegistry/${newEquipmentNum}?id=${3}`;
      const qrCodeThree = await QRCode.toDataURL(qrDataUrlThree, {
        errorCorrectionLevel: "M", // 少しエラー訂正を強化
        width: 200, // QRコードの幅を200pxに設定
        margin: 8, // 少し余白を持たせる（2px程度）
      });
      const qrDataUrlFour = `https://mgmt-vercel.vercel.app/equipmentRegistry/${newEquipmentNum}?id=${4}`;
      const qrCodeFour = await QRCode.toDataURL(qrDataUrlFour, {
        errorCorrectionLevel: "M", // 少しエラー訂正を強化
        width: 200, // QRコードの幅を200pxに設定
        margin: 8, // 少し余白を持たせる（2px程度）
      });

      // QRコードをキャンバスに描画
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const qrSize = 100; // 1つのQRコードのサイズ
      canvas.width = qrSize * 2; // 横幅: 2つ分
      canvas.height = qrSize * 2; // 縦幅: 2つ分

      // 画像をキャンバスに描画する非同期処理
      const qrCodes = [qrCodeOne, qrCodeTwo, qrCodeThree, qrCodeFour];
      const promises = qrCodes.map((qrCodeDataUrl, i) => {
        const x = (i % 2) * qrSize;
        const y = Math.floor(i / 2) * qrSize;
        const img = new Image();
        img.src = qrCodeDataUrl;

        return new Promise((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, x, y, qrSize, qrSize);
            resolve();
          };
        });
      });

      // すべてのQRコード画像が描画されるのを待つ
      await Promise.all(promises);

      // 最終的にキャンバスをPNGとしてデータURLに変換
      const combinedQrCodeDataUrl = canvas.toDataURL();

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
        qrCode: combinedQrCodeDataUrl,
        photo: photoUrl,
        addedDate: new Date().toISOString(), // 追加の日付
        email: user.email, // 登録したメールアドレス
      };

      // Firebaseデータベースの別のパスに送信
      await set(
        dbRef(database, `equipmentRegistry/${newEquipmentNum}`),
        updatedInputs
      );

      // Discord通知
      const message = `新しい備品が登録されました！\n登録者: ${
        user.displayName || user.email
      }\n備品ID: ${newEquipmentNum}\n備品名: ${inputs.equipmentName}\n詳細: ${
        inputs.equipmentDetails
      }`;
      sendToDiscord(message);

      // フォームのリセット
      setInputs({ equipmentName: "", equipmentDetails: "" });
      setPhotoFile(null);

      setSuccessMessage("備品を登録しました。");

      // 5秒後にメッセージを消す
      setTimeout(() => {
        setSuccessMessage("");
        window.location.reload();
      }, 4000);
    }
  };

  return (
    <div>
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
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*"
                />
              </div>
              <div className="inline-block bg-slate-500 hover:bg-slate-700 text-white font-bold py-1 px-2 rounded-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform duration-200 ease-in-out mt-4">
                <button type="submit" className="submit-button">
                  送信
                </button>
              </div>
            </form>
            {successMessage && ( // 成功メッセージの表示
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
    </div>
  );
}
