import React, { useCallback, useEffect, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, database, provider } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { ref, get, set, push } from "firebase/database";
// import { QRCode } from 'qrcode.react';
import QRCodeLib from "qrcode";

export function Header() {
  const [user] = useAuthState(auth);

  return (
    <div>
      <div className="w-full p-4 flex justify-between items-center">
        {/* 備品管理アプリのタイトル */}
        <div>
          <a
            href="/"
            className="text-blue-600 text-xl font-bold"
          >
            備品管理アプリ
          </a>
        </div>
        <div className="flex items-center space-x-4">
          {user ? <UserInfo user={user} /> : <SignInButton />}
        </div>
      </div>
    </div>
  );
}

function SignInButton() {
  const signInWithGoogle = async () => {
    try {
      // Googleポップアップを使ってサインイン画面を表示
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // メールアドレスのドメインを確認
      if (!user.email.endsWith("@ous.jp")) {
        alert("大学のメールアドレスでログインしてください。");
        await auth.signOut(); // サインアウト
      } else {
        console.log("ログイン成功:", user.email);
      }
    } catch (error) {
      console.error("ログインエラー:", error.message);
      alert("ログインに失敗しました。再度お試しください。");
    }
  };

  return (
    <button
      onClick={signInWithGoogle}
      className="bg-slate-500 hover:bg-slate-700 text-white font-bold py-1 px-2 rounded-sm shadow-lg hover:shadow-xl transition-transform duration-200 ease-in-out"
    >
      サインイン
    </button>
  );
}

function SignOutButton() {
  return (
    <button
      onClick={() => auth.signOut()}
      className="bg-slate-500 hover:bg-slate-700 text-white font-bold py-1 px-2 rounded-sm shadow-lg hover:shadow-xl transition-transform duration-200 ease-in-out"
    >
      サインアウト
    </button>
  );
}


function UserInfo({ user }) {
  const [isHovered, setIsHovered] = useState(false);

  // ホバー状態を管理
  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="text-lg hover:cursor-pointer ">設定</div>
      {/* ホバー中にサインアウトメニューを表示 */}
      {isHovered && (
        <div
          className="absolute right-0 mt-2 w-48 bg-white p-2 shadow-lg rounded-md z-10"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            marginTop: "0", // 隙間をなくすための調整
            top: "100%", // 設定ボタンにメニューをぴったりくっつける
          }}
        >
          {/* メールアドレスの表示 */}
          <div className="text-gray-700">{user.email || "Anonymous User"}</div>
          <div className="mt-2">
            <a
              href="/qrReading" // 備品一覧のURLを指定
              className="hover:underline hover:text-blue-600 text-gray-800"
            >
              QRコード読み取り
            </a>
          </div>
          <div className="mt-2">
            <a
              href="/equipmentRegistry" // 備品一覧のURLを指定
              className="hover:underline hover:text-blue-600 text-gray-800"
            >
              備品一覧
            </a>
          </div>
          <div className="mt-2">
            <a
              href="/equipment" // 備品一覧のURLを指定
              className="hover:underline hover:text-blue-600 text-gray-800"
            >
              備品登録フォーム
            </a>
          </div>
          <div className="mt-2">
            <SignOutButton />
          </div>
        </div>
      )}
    </div>
  );
}