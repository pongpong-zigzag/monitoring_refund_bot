import { QubicHelper } from '@qubic-lib/qubic-ts-library/dist/qubicHelper';
import { QubicTransaction } from '@qubic-lib/qubic-ts-library/dist/qubic-types/QubicTransaction';
import { PublicKey } from '@qubic-lib/qubic-ts-library/dist/qubic-types/PublicKey';
import { Long } from '@qubic-lib/qubic-ts-library/dist/qubic-types/Long';
import { DynamicPayload } from '@qubic-lib/qubic-ts-library/dist/qubic-types/DynamicPayload';
import { QubicTransferAssetPayload } from '@qubic-lib/qubic-ts-library/dist/qubic-types/transacion-payloads/QubicTransferAssetPayload';
import { QubicDefinitions } from '@qubic-lib/qubic-ts-library/dist/QubicDefinitions';

const DEFAULT_QXMR_ASSET_ISSUER = 'QXMRTKAIIGLUREPIQPCMHCKWSIPDTUYFCFNYXQLTECSUJVYEMMDELBMDOEYB';
const DEFAULT_QXMR_ASSET_NAME = 'QXMR';
const QXMR_SMALLEST_UNIT = BigInt(1_000_000_000); // 1 QXMR = 1e9 base units
const QXMR_SMALLEST_UNIT_NUMBER = 1_000_000_000;

//send Qubic tokens function
type SendQubicParams = {
    rpc_url: string;
    seed: string;            // your 55-char seed
    toIdentity: string;      // destination identity (public key string)
    amount: bigint | number; // amount in QU (smallest unit, e.g. 100n for 100 QU)
    tickOffset?: number;     // how many ticks in the future (default 20–30 is safe)
  };

export async function sendQubic({
rpc_url,
seed,
toIdentity,
amount,
tickOffset = 30,
}: SendQubicParams) {
const helper = new QubicHelper();

// 1. Derive your ID package (privateKey, publicKey, identity)
const id = await helper.createIdPackage(seed);
// id.publicKey or id.humanReadableAddress depending on your lib version
const sourcePublicKey = id.publicKey; // string

// 2. Get current tick from RPC
const tickInfoRes = await fetch(`${rpc_url}/v1/tick-info`);
if (!tickInfoRes.ok) {
    throw new Error(`Failed to fetch tick-info: ${tickInfoRes.status}`);
}
const tickInfoJson = await tickInfoRes.json();
const currentTick: number = tickInfoJson.tickInfo.tick;

const targetTick = currentTick + tickOffset;

// 3. Build an *empty* payload (standard QU transfer)
const payload = new DynamicPayload(0); // no data
payload.setPayload(new Uint8Array(0));

// 4. Create the transaction
const tx = new QubicTransaction()
    .setSourcePublicKey(new PublicKey(sourcePublicKey))
    .setDestinationPublicKey(new PublicKey(toIdentity))
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

