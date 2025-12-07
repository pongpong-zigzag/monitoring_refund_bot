import { QubicHelper } from "@qubic-lib/qubic-ts-library/dist/qubicHelper";

export async function getAccBalance(rpc_url: string, publicId: string){
    const res = await fetch(`${rpc_url}/v1/balances/${publicId}`);
    const data = await res.json();
    return data.balance;
}

export async function getTickTransferInfo(rpc_url: string, tickId: number) {
    const tickIdString = tickId.toString();
    const res = await fetch(`${rpc_url}/v1/ticks/${tickIdString}/transfer-transactions`);
    const data = await res.json();
    return data.transactions;
}

export async function getAccAssets(rpc_url: string, publicId: string){
    const res = await fetch(`${rpc_url}/v1/assets/${publicId}/owned`);
    const data = await res.json();
    return data.ownedAssets;
}

export async function getCurrentTick(rpc_url: string){
    const res = await fetch(`${rpc_url}/v1/tick-info`);
    if (!res.ok) {
        throw new Error(`Failed to fetch tick-info: ${res.status}`);
    }
    const data = await res.json();
    return data.tickInfo.tick;
}

const helper = new QubicHelper();

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex length");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function decodeQxTransfer(inputHex: string) {
  const buf = hexToBytes(inputHex);
  if (buf.length !== 80) {
    throw new Error(`QX transfer payload must be 80 bytes, got ${buf.length}`);
  }

  const issuerBytes    = buf.slice(0, 32);
  const recipientBytes = buf.slice(32, 64);
  const assetNameBytes = buf.slice(64, 72);
  const amountBytes    = buf.slice(72, 80);

  // human-readable IDs
  const issuerId    = await helper.getIdentity(issuerBytes);
  const recipientId = await helper.getIdentity(recipientBytes);

  // asset name: ASCII + remove trailing \0
  const assetName = new TextDecoder()
    .decode(assetNameBytes)
    .replace(/\0+$/, "");

  // amount: u64 little-endian → bigint
  const view = new DataView(amountBytes.buffer, amountBytes.byteOffset, 8);
  const amount = view.getBigUint64(0, true); // little-endian = true

  return {
    'issuerId': issuerId,
    'recipientId':recipientId,
    'assetName':assetName,
    'amount': Number(amount), // bigint
  };
}
