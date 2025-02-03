import Head from "next/head";
import React, { useCallback, useEffect, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, database, provider } from "../../../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { ref, get, set, push, remove } from "firebase/database";

// import { QRCode } from 'qrcode.react';
import QRCodeLib from "qrcode";
import { Header } from "@/components/Header";

export const getServerSideProps = async (ctx) => {
  const { id } = ctx.query;
  const USER_API_URL = `https://login-8e441-default-rtdb.firebaseio.com/equipmentRegistry/${id}.json`;
  const user = await fetch(USER_API_URL);
  const userData = await user.json();

  const EQUIPMENTS_API_URL = `https://login-8e441-default-rtdb.firebaseio.com/equipments.json`;
  const user_e = await fetch(EQUIPMENTS_API_URL);
  const equipmentsData = await user_e.json();

  return {
    props: {
      mgmt: userData || {}, // コンポーネントにデータを渡す
      _equipments: equipmentsData || {},
    },
  };
};

const MgmtID = ({ mgmt, _equipments = {} }) => {
  // 日付フォーマット関数
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const [user] = useAuthState(auth);

  const [inputs, setInputs] = useState({
    num: "",
    name: "",
    purpose: "",
    returnDate: "",
  });

  const [form, setForm] = useState([]);
  const [borrowMessage, setBorrowMessage] = useState("");
  const [returnMessage, setReturnMessage] = useState("");

  const getTodayDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0"); // 月は0から始まるため+1
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs({ ...inputs, [name]: value });
  };


  const checkReturnDates = async () => {
    const equipmentRef = ref(database, "equipments");
    const snapshot = await get(equipmentRef);

    if (snapshot.exists()) {
      const equipments = snapshot.val();

      for (const key in equipments) {
        const equipment = equipments[key];

        // 返却予定日を過ぎているかどうかをチェック
        const returnDate = new Date(equipment.returnDate);
        const today = new Date();

        if (returnDate < today && !equipment.isReturned) {
          // isReturnedは返却されているかどうかのフラグ
          const message = `⚠️ **重要** ⚠️\n${
            user.displayName || user.email
          } さんが借りている\n備品：${equipment.equipmentName}（ID: ${
            equipment.equipmentNum
          }）が返却予定日を過ぎました。\n早急に備品の返却を促してください。`;
          sendToDiscord(message); // Discordに通知
        }
      }
    }
  };

  // 定期的に返却予定日をチェック（例えば1時間ごと）
  setInterval(checkReturnDates, 6 * 60 * 60 * 1000);

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
    const id = mgmt.num;

    if (user) {
      const updatedInputs = {
        ...inputs,
        name: `${user.displayName}`,
        equipmentNum: mgmt.num,
        equipmentName: mgmt.equipmentName,
        photo: mgmt.photo,
        email: user.email,
      };

      await set(ref(database, `equipments/${id}`), updatedInputs);
      setForm([...form, updatedInputs]);
      setInputs({
        purpose: "",
        returnDate: "",
      });

      setBorrowMessage("備品を借りました。");
      setTimeout(() => {
        setBorrowMessage("");
        window.location.reload();
      }, 4000);

      // 備品が借りられた時にディスコードに通知を送信
      const message = `${user.displayName || user.email} さんが ${
      mgmt.equipmentName}（ID: ${mgmt.num}）を借りました。\n使用用途: ${inputs.purpose}\n返却予定日: ${inputs.returnDate}`;
      sendToDiscord(message); // Discordに通知
    }
  };

  const handleReturn = async (e) => {
    e.preventDefault();

    if (user && borrowedItem) {
      const equipmentRef = ref(
        database,
        `equipments/${borrowedItem.equipmentNum}`
      ); // borrowedItem.equipmentNumを使用

      // データを削除
      await remove(equipmentRef);
      // 返却後にフォームをリセット
      setInputs({
        num: "",
        name: "",
        purpose: "",
        returnDate: "",
      });

      setReturnMessage("備品を返却しました。");
      setTimeout(() => {
        setReturnMessage("");
        window.location.reload();
      }, 4000);

      // 備品が返却された時にディスコードに通知を送信
      const message = `${user.displayName || user.email} さんが${
        borrowedItem.equipmentName
      }（ID: ${
        borrowedItem.equipmentNum
      }）を返却しました。`;
      sendToDiscord(message); // Discordに通知
    }
  };


  const shouldShowReturnForm = () => {
    if (!user || !_equipments) return false;

    return Object.values(_equipments).some(
      (equipment) =>
        equipment && // equipmentが存在することを確認
        equipment.email === user.email &&
        String(equipment.equipmentNum) === String(mgmt.num)
    );
  };

  const getMyBorrowedItem = () => {
    if (!user || !_equipments) return null;

    const borrowedItem = Object.values(_equipments).find((equipment) => {
      // equipment が null または undefined でないことを確認
      if (equipment) {
        return (
          equipment.email === user.email &&
          String(equipment.equipmentNum) === String(mgmt.num)
        );
      }
      return false;
    });

    return borrowedItem || null;
  };

  const borrowedItem = getMyBorrowedItem();


  return (
    <div>
      <Head>
        <title>{mgmt.equipmentName} - 備品 Rental</title>
      </Head>
      <div>
        <Header />
        <div className="w-full">
          <div>
            <h1>備品情報</h1>
            <div>備品番号: {mgmt.num}</div>
            <div>備品名: {mgmt.equipmentName}</div>
            <div>
              <h2>写真:</h2>
              {mgmt.photo ? (
                <img
                  src={mgmt.photo}
                  alt="備品の写真"
                  style={{ width: "128px", height: "128px" }}
                />
              ) : (
                <div>写真が見つかりません</div>
              )}
            </div>
            <div>備品情報: {mgmt.equipmentDetails}</div>
            <div>登録した日付: {formatDate(mgmt.addedDate)}</div>
          </div>

          <div>
            {user ? (
              Object.keys(_equipments).length === 0 ||
              !Object.values(_equipments).some((equipment) => {
                return (
                  equipment &&
                  String(equipment.equipmentNum) === String(mgmt.num)
                );
              }) ? (
                <div className="mt-4">
                  <h2 className="text-lg font-semibold">
                    備品レンタルフォーム
                  </h2>
                  <form onSubmit={handleSubmit} className="mt-2">
                    <div className="mb-4">
                      <label className="block">使用用途</label>
                      <input
                        type="text"
                        name="purpose"
                        value={inputs.purpose}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block">返却予定日</label>
                      <input
                        type="date"
                        name="returnDate"
                        value={inputs.returnDate}
                        onChange={handleChange}
                        required
                        min={getTodayDate()}
                      />
                    </div>
                    <div className="inline-block bg-slate-500 hover:bg-slate-700 text-white font-bold py-1 px-2 rounded-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform duration-200 ease-in-out mt-4">
                      <button type="submit">送信</button>
                    </div>
                  </form>
                  {borrowMessage && ( // 借りるメッセージの表示
                    <div className="mt-4 text-white font-semibold">
                      {borrowMessage}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-4">
                  この備品は既に借りられているため
                  <br />
                  レンタルフォームは表示できません。
                </div>
              )
            ) : (
              <div className="mb-4">
                サインインをしていないため
                <br />
                レンタルフォームは表示できません。
              </div>
            )}
          </div>
          <div>
            {user ? (
              shouldShowReturnForm() ? (
                <div className="mt-4">
                  <h2 className="text-lg font-semibold">返却フォーム</h2>
                  {borrowedItem && (
                    <div className="mt-2">
                      <h3>あなたが借りている備品情報</h3>
                      <div>備品番号: {borrowedItem.equipmentNum}</div>
                      <div>備品番号: {borrowedItem.name}</div>
                      <div>備品名: {borrowedItem.equipmentName}</div>
                      <div>
                        <h2>写真:</h2>
                        {borrowedItem.photo ? (
                          <img
                            src={borrowedItem.photo}
                            alt="備品の写真"
                            style={{ width: "128px", height: "128px" }}
                          />
                        ) : (
                          <div>写真が見つかりません</div>
                        )}
                      </div>
                      <div>用途: {borrowedItem.purpose}</div>
                      <div>返却予定日: {borrowedItem.returnDate}</div>
                      <div>備品番号: {borrowedItem.email}</div>
                      <h2>
                        あなたが借りている備品情報と合っていれば返却をしてください。
                      </h2>
                    </div>
                  )}
                  <form onSubmit={handleReturn} className="mt-2">
                    <div className="inline-block bg-slate-500 hover:bg-slate-700 text-white font-bold py-1 px-2 rounded-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform duration-200 ease-in-out mt-4">
                      <button type="submit">返却する</button>
                    </div>
                  </form>
                  {returnMessage && ( // 返却メッセージの表示
                    <div className="mt-4 text-white font-semibold">
                      {returnMessage}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-4">返却フォームは表示できません。</div>
              )
            ) : (
              <div className="mb-4">サインインをしてください。</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MgmtID;