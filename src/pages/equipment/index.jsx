import React, { useCallback, useEffect, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, database, provider } from "../../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { ref, get, set, push } from "firebase/database";
// import { QRCode } from 'qrcode.react';
import QRCodeLib from "qrcode";
import { Header } from "@/components/Header";
import { Register } from "@/components/Register";
import Head from "next/head";

function Home() {
  return (
    <div>
      <Head>
        <title>備品登録 Form</title>
      </Head>
      <div>
        <Header />
        <div className="w-full">
          <Register />
        </div>
      </div>
    </div>
  );
}

export default Home;
