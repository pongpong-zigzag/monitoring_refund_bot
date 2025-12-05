"use client";

import React, { useState } from "react";
import { AccBalance } from "./type/interface";
import { getAccBalance } from "@/lib/getAccInfo";

const RPC_URL = "https://rpc.qubic.org";
const MY_ACCOUNT_ID = "FTHFVJVMZWFOQEYAZPYSXASIRMXCPEUVCFQKZVTKXEXXLYKSYJRZQQEHGDPN";
const MY_ACCOUNT_SEED = "hbxvaraghtrqxvxizohsvxbmqsiouwurtmskdvzmmcqemlkoxspspql";
const DEFAULT_POLL_INTERVAL = 5_000;
const QUBIC_PER_QXMR = BigInt(100);

export default function Home() {

  const [balance, setBalance] = useState<AccBalance | null>(null);

  React.useEffect(() => {
    const load = async () => {
      const balance = await getAccBalance(RPC_URL, MY_ACCOUNT_ID);
      setBalance(balance);
      console.log(balance);
    };

    load();
  }, []);
  
}
