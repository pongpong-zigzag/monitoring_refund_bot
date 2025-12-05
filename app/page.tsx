"use client";

import React from "react";
import { prevStatus } from "./type/interface";
import { getAccBalance, getTickInfo } from "@/lib/getAccInfo";
import { sendQubic } from "@/lib/transfer";

const RPC_URL = "https://rpc.qubic.org";
const MY_ACCOUNT_ID = "FTHFVJVMZWFOQEYAZPYSXASIRMXCPEUVCFQKZVTKXEXXLYKSYJRZQQEHGDPN";
const MY_ACCOUNT_SEED = "hbxvaraghtrqxvxizohsvxbmqsiouwurtmskdvzmmcqemlkoxspspql";

export default function Home() {

  const prevStatusRef = React.useRef<prevStatus | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      const accInfo = await getAccBalance(RPC_URL, MY_ACCOUNT_ID);

      const currentStatus: prevStatus = {
        incomingAmount: accInfo.incomingAmount,
        numberOfIncomingTransfers: accInfo.numberOfIncomingTransfers,
        lastIncomingTransferTick: accInfo.latestIncomingTransferTick,
      };

      const hasStatusChanged =
        !prevStatusRef.current ||
        prevStatusRef.current.incomingAmount !== currentStatus.incomingAmount ||
        prevStatusRef.current.numberOfIncomingTransfers !== currentStatus.numberOfIncomingTransfers ||
        prevStatusRef.current.lastIncomingTransferTick !== currentStatus.lastIncomingTransferTick;

      if (hasStatusChanged && typeof currentStatus.lastIncomingTransferTick === "number") {
        prevStatusRef.current = currentStatus;
        console.log("currentStatus:", currentStatus);
        const lastTickInfo = await getTickInfo(RPC_URL, currentStatus.lastIncomingTransferTick);
        if (cancelled) return;
        console.log("Tick info result:", lastTickInfo);
        for(let i = 0; i < lastTickInfo.length; i++) {
          if(lastTickInfo[i].destId === MY_ACCOUNT_ID) {
            sendQubic({
              rpc_url: RPC_URL,
              seed: MY_ACCOUNT_SEED,
              toId: lastTickInfo[i].sourceId,
              amount: 1000,
            })
          }
        }
      }

    };

    load();

    const id = setInterval(() => load(), 2000);

    // cleanup
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          sendQubic({
            rpc_url: RPC_URL,
            seed: "cshmfpcjdbuhcibkhqkwbqhrhsofhpmswyjiglwvyajuuspgvovjvwu",
            toId: MY_ACCOUNT_ID,
            amount: 100,
          })
        }
      >
        Send
      </button>
    </div>
  );
}
