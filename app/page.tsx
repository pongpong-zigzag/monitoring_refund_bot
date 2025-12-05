"use client";

import React, { useState } from "react";
import { AccBalance, TickInfo } from "./type/interface";
import { getAccBalance, getTickInfo } from "@/lib/getAccInfo";

const RPC_URL = "https://rpc.qubic.org";
const MY_ACCOUNT_ID = "FTHFVJVMZWFOQEYAZPYSXASIRMXCPEUVCFQKZVTKXEXXLYKSYJRZQQEHGDPN";
const MY_ACCOUNT_SEED = "hbxvaraghtrqxvxizohsvxbmqsiouwurtmskdvzmmcqemlkoxspspql";

export default function Home() {

  const [balance, setBalance] = useState<AccBalance | null>(null);
  const [tickInfo, setTickInfo] = useState<TickInfo[] | null>(null);

  React.useEffect(() => {
    const load = async () => {
      const accInfo = await getAccBalance(RPC_URL, MY_ACCOUNT_ID);
      setBalance(accInfo);

      const lastTickInfo = await getTickInfo(RPC_URL, accInfo.latestIncomingTransferTick);
      setTickInfo(lastTickInfo);


      console.log("accInfo:", accInfo);
      console.log("lastTickInfo:", lastTickInfo);
    };

    load();
  }, []);
  
}
