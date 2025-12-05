import { QubicHelper } from '@qubic-lib/qubic-ts-library/dist/qubicHelper';
import { QubicTransaction } from '@qubic-lib/qubic-ts-library/dist/qubic-types/QubicTransaction';
import { PublicKey } from '@qubic-lib/qubic-ts-library/dist/qubic-types/PublicKey';
import { Long } from '@qubic-lib/qubic-ts-library/dist/qubic-types/Long';
import { DynamicPayload } from '@qubic-lib/qubic-ts-library/dist/qubic-types/DynamicPayload';
import { QubicTransferAssetPayload } from '@qubic-lib/qubic-ts-library/dist/qubic-types/transacion-payloads/QubicTransferAssetPayload';
import { QubicDefinitions } from '@qubic-lib/qubic-ts-library/dist/QubicDefinitions';

import { getCurrentTick } from './getAccInfo';

const DEFAULT_QXMR_ASSET_ISSUER = 'QXMRTKAIIGLUREPIQPCMHCKWSIPDTUYFCFNYXQLTECSUJVYEMMDELBMDOEYB';
const DEFAULT_QXMR_ASSET_NAME = 'QXMR';

//send Qubic tokens function
type SendQubicParams = {
    rpc_url: string;
    seed: string;            // your 55-char seed
    toId: string;      // destination identity (public key string)
    amount: bigint | number; // amount in QU (smallest unit, e.g. 100n for 100 QU)
    tickOffset?: number;     // how many ticks in the future (default 20–30 is safe)
  };

export async function sendQubic({
rpc_url,
seed,
toId,
amount,
tickOffset = 20,
}: SendQubicParams) {
const helper = new QubicHelper();

// 1. Derive your ID package (privateKey, publicKey, identity)
const id = await helper.createIdPackage(seed);
// id.publicKey or id.humanReadableAddress depending on your lib version
const sourcePublicKey = id.publicKey; // string

// 2. Get current tick from RPC
const currentTick = await getCurrentTick(rpc_url);

const targetTick = currentTick + tickOffset;

// 3. Build an *empty* payload (standard QU transfer)
const payload = new DynamicPayload(0); // no data
payload.setPayload(new Uint8Array(0));

// 4. Create the transaction
const tx = new QubicTransaction()
    .setSourcePublicKey(new PublicKey(sourcePublicKey))
    .setDestinationPublicKey(new PublicKey(toId))
    .setTick(targetTick)
    .setInputType(0)                   // 0 = basic QU transfer
    .setInputSize(payload.getPackageSize()) // 0
    .setAmount(new Long(BigInt(amount)))
    .setPayload(payload);

// 5. Sign transaction with your seed (derives private key & signs)
await tx.build(seed); // library handles signing just like in the QX example :contentReference[oaicite:1]{index=1}

// 6. Encode and broadcast
const encoded = tx.encodeTransactionToBase64(tx.getPackageData());

const broadcastBody = { encodedTransaction: encoded };
const res = await fetch(`${rpc_url}/v1/broadcast-transaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(broadcastBody),
});

if (!res.ok) {
    const text = await res.text();
    throw new Error(`Broadcast failed: ${res.status} – ${text}`);
}

const json = await res.json();
return {
    ...json,
    currentTick,
    targetTick,
};
}

// send QXMR asset (Qx asset transfer via QX contract)
type SendQXMRParams = {
    rpc_url: string;
    seed: string;              // your 55-char seed (sender)
    toId: string;              // destination identity (Qubic ID string)
    units: bigint | number;    // amount of QXMR units (shares) to transfer
    tickOffset?: number;       // how many ticks in the future (default ~20)
    issuer?: string;           // optional override, default = DEFAULT_QXMR_ASSET_ISSUER
    assetName?: string;        // optional override, default = DEFAULT_QXMR_ASSET_NAME
    transferFee?: bigint | number; // optional override, default = QubicDefinitions.QX_TRANSFER_ASSET_FEE
  };
  
  export async function sendQXMR({
    rpc_url,
    seed,
    toId,
    units,
    tickOffset = 20,
    issuer = DEFAULT_QXMR_ASSET_ISSUER,
    assetName = DEFAULT_QXMR_ASSET_NAME,
    transferFee = QubicDefinitions.QX_TRANSFER_ASSET_FEE,
  }: SendQXMRParams) {
    const helper = new QubicHelper();
  
    // 1. Derive sender ID package
    const id = await helper.createIdPackage(seed);
    const sourcePublicKey = id.publicKey; // Uint8Array
  
    // 2. Get current tick from RPC
    const currentTick = await getCurrentTick(rpc_url);
    const targetTick = currentTick + tickOffset;
  
    // 3. Build QX asset transfer payload (issuer, newOwner, assetName, units)
    const unitsLong = new Long(BigInt(units));
    const payloadBuilder = new QubicTransferAssetPayload()
      .setIssuer(issuer)                // QXMR issuer identity
      .setNewOwnerAndPossessor(toId)    // receiver identity
      .setAssetName(assetName)          // "QXMR"
      .setNumberOfUnits(unitsLong);     // number of QXMR units
  
    const payload: DynamicPayload = payloadBuilder.getTransactionPayload();
  
    // 4. QX asset transfer fee (amount in QU sent to QX contract)
    const feeLong = new Long(BigInt(transferFee));
  
    // 5. Create transaction targeting QX contract
    const tx = new QubicTransaction()
      .setSourcePublicKey(new PublicKey(sourcePublicKey))
      .setDestinationPublicKey(new PublicKey(QubicDefinitions.QX_ADDRESS))
      .setTick(targetTick)
      .setInputType(QubicDefinitions.QX_TRANSFER_ASSET_INPUT_TYPE) // 2
      .setInputSize(payload.getPackageSize())
      .setAmount(feeLong)               // pay QX_TRANSFER_ASSET_FEE in QU
      .setPayload(payload);
  
    // 6. Sign with seed
    await tx.build(seed);
  
    // 7. Encode and broadcast
    const encoded = tx.encodeTransactionToBase64(tx.getPackageData());
    const broadcastBody = { encodedTransaction: encoded };
  
    const res = await fetch(`${rpc_url}/v1/broadcast-transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(broadcastBody),
    });
  
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Broadcast failed: ${res.status} – ${text}`);
    }
  
    const json = await res.json();
  
    return {
      ...json,
      currentTick,
      targetTick,
    };
  }
  