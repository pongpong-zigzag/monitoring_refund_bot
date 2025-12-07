"use client";

import React from "react";
import { getTickTransferInfo, decodeQxTransfer} from "@/lib/getAccInfo";
import { sendAsset } from "@/lib/transfer";


const RPC_URL = "https://rpc.qubic.org";
const MY_ACCOUNT_ID = "FTHFVJVMZWFOQEYAZPYSXASIRMXCPEUVCFQKZVTKXEXXLYKSYJRZQQEHGDPN";
const MY_ACCOUNT_SEED = "hbxvaraghtrqxvxizohsvxbmqsiouwurtmskdvzmmcqemlkoxspspql";
const QX_ID = "BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARMID"
const DEFAULT_QXMR_ASSET_ISSUER = 'QXMRTKAIIGLUREPIQPCMHCKWSIPDTUYFCFNYXQLTECSUJVYEMMDELBMDOEYB';
const DEFAULT_QXMR_ASSET_NAME = 'QXMR';
const DEFAULT_CFB_ASSET_ISSUER = 'CFBMEMZOIDEXQAUXYYSZIURADQLAPWPMNJXQSNVQZAHYVOPYUKKJBJUCTVJL';
const DEFAULT_CFB_ASSET_NAME = 'CFB';

export default function Home() {
  const prevTick = React.useRef<number>(0);

  const CFBtoQXMRRefund = async () => {
    const res = await fetch(`${RPC_URL}/v1/tick-info`);
        const tick_info = await res.json();
        const currentTick = tick_info.tickInfo.tick;
        if(prevTick.current === 0){
          prevTick.current = currentTick;
          return;
        }

        for(let i = prevTick.current; i < currentTick; i++) {
          const txs = await getTickTransferInfo(RPC_URL, i);
          for(let j = 0; j < txs.length; j++) {
            if(txs[j].destId === QX_ID && txs.inputType === 2){
              if(txs[j].inputHex.length !== 80) continue;
              const res = await decodeQxTransfer(txs[j].inputHex);
              if(res.recipientId === MY_ACCOUNT_ID){

                const issuer = (res.issuerId === DEFAULT_CFB_ASSET_ISSUER) ? DEFAULT_QXMR_ASSET_ISSUER : DEFAULT_CFB_ASSET_ISSUER ;
                const assetName = (res.issuerId === DEFAULT_CFB_ASSET_NAME) ? DEFAULT_QXMR_ASSET_NAME : DEFAULT_CFB_ASSET_NAME ;
                const amount = (res.issuerId === DEFAULT_CFB_ASSET_ISSUER) ? (res.amount / 100) : (res.amount * 100);

                const result = await sendAsset({
                  rpc_url: RPC_URL,
                  seed: MY_ACCOUNT_SEED,
                  toId: txs[j].sourceId,
                  units: amount, // send amount of Asset units
                  issuer: issuer,
                  assetName: assetName,
                })
              }
            }
          }
        }
        prevTick.current = currentTick;
    return;
  }

  React.useEffect(() => {
    let cancelled = false;
    let running = false;
    const load = async () => {
      
      if (cancelled || running) return;
      running = true;
      try{
        await CFBtoQXMRRefund();
      } catch (error) {
        console.error(error);
      } finally {
        running = false;
      }
    }

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
    </div>
  );
}
