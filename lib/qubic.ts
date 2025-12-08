import { QubicHelper } from "@qubic-lib/qubic-ts-library/dist/qubicHelper";
import { QubicTransaction } from "@qubic-lib/qubic-ts-library/dist/qubic-types/QubicTransaction";
import { PublicKey } from "@qubic-lib/qubic-ts-library/dist/qubic-types/PublicKey";
import { Long } from "@qubic-lib/qubic-ts-library/dist/qubic-types/Long";
import { QubicTransferAssetPayload } from "@qubic-lib/qubic-ts-library/dist/qubic-types/transacion-payloads/QubicTransferAssetPayload";
import { QubicDefinitions } from "@qubic-lib/qubic-ts-library/dist/QubicDefinitions";

const helper = new QubicHelper();
const decoder = new TextDecoder();

type FetchInit = RequestInit | undefined;

async function fetchJson<T>(url: string, init?: FetchInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`RPC call failed (${res.status}): ${body || url}`);
  }
  return res.json() as Promise<T>;
}

export type TransferTransaction = {
  txId: string;
  tickNumber: number;
  sourceId: string;
  destId: string;
  inputType: number;
  inputHex: string;
};

export async function getCurrentTick(rpcUrl: string) {
  const data = await fetchJson<{ tickInfo: { tick: number } }>(
    `${rpcUrl}/v1/tick-info`
  );
  return data.tickInfo.tick;
}

export async function getTickTransfers(rpcUrl: string, tick: number) {
  const data = await fetchJson<{ transactions?: TransferTransaction[] }>(
    `${rpcUrl}/v1/ticks/${tick}/transfer-transactions`
  );
  return data.transactions ?? [];
}

function hexToBytes(hex: string) {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex payload");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function decodeQxTransfer(inputHex: string) {
  const buf = hexToBytes(inputHex);
  if (buf.length !== 80) {
    throw new Error(`Expected 80-byte QX payload, received ${buf.length}`);
  }

  const issuerBytes = buf.slice(0, 32);
  const recipientBytes = buf.slice(32, 64);
  const assetNameBytes = buf.slice(64, 72);
  const amountBytes = buf.slice(72, 80);

  const issuerId = await helper.getIdentity(issuerBytes);
  const recipientId = await helper.getIdentity(recipientBytes);
  const assetName = decoder.decode(assetNameBytes).replace(/\0+$/, "");
  const view = new DataView(
    amountBytes.buffer,
    amountBytes.byteOffset,
    amountBytes.byteLength
  );
  const amount = Number(view.getBigUint64(0, true));

  return { issuerId, recipientId, assetName, amount };
}

export type SendAssetParams = {
  rpcUrl: string;
  seed: string;
  toId: string;
  units: number | bigint;
  issuer: string;
  assetName: string;
  tickOffset?: number;
  transferFee?: number | bigint;
};

export async function sendAsset({
  rpcUrl,
  seed,
  toId,
  units,
  issuer,
  assetName,
  tickOffset = 20,
  transferFee = QubicDefinitions.QX_TRANSFER_ASSET_FEE,
}: SendAssetParams) {
  const id = await helper.createIdPackage(seed);
  const currentTick = await getCurrentTick(rpcUrl);
  const payloadBuilder = new QubicTransferAssetPayload()
    .setIssuer(issuer)
    .setNewOwnerAndPossessor(toId)
    .setAssetName(assetName)
    .setNumberOfUnits(new Long(BigInt(units)));
  const payload = payloadBuilder.getTransactionPayload();

  const tx = new QubicTransaction()
    .setSourcePublicKey(new PublicKey(id.publicKey))
    .setDestinationPublicKey(new PublicKey(QubicDefinitions.QX_ADDRESS))
    .setTick(currentTick + tickOffset)
    .setInputType(QubicDefinitions.QX_TRANSFER_ASSET_INPUT_TYPE)
    .setInputSize(payload.getPackageSize())
    .setAmount(new Long(BigInt(transferFee)))
    .setPayload(payload);

  await tx.build(seed);
  const encoded = tx.encodeTransactionToBase64(tx.getPackageData());
  return fetchJson(`${rpcUrl}/v1/broadcast-transaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ encodedTransaction: encoded }),
  });
}

