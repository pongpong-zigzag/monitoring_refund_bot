import {
  decodeQxTransfer,
  getCurrentTick,
  getTickTransfers,
  sendAsset,
  TransferTransaction,
} from "@/lib/qubic";
import type { RefundRecord, RefundState } from "@/types/refund";

const {
  QUBIC_RPC_URL,
  QUBIC_ACCOUNT_ID,
  QUBIC_ACCOUNT_SEED,
  QUBIC_QXMR_ASSET_ISSUER,
  QUBIC_QXMR_ASSET_NAME,
  QUBIC_CFB_ASSET_ISSUER,
  QUBIC_CFB_ASSET_NAME,
  QUBIC_QX_CONTRACT_ID,
  QUBIC_REFUND_RATE,
} = process.env;

const fallbackConfig = {
  rpcUrl: "https://rpc.qubic.org",
  qxContractId:
    "BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARMID",
  qxmr: {
    issuer:
      "QXMRTKAIIGLUREPIQPCMHCKWSIPDTUYFCFNYXQLTECSUJVYEMMDELBMDOEYB",
    name: "QXMR",
  },
  cfb: {
    issuer:
      "CFBMEMZOIDEXQAUXYYSZIURADQLAPWPMNJXQSNVQZAHYVOPYUKKJBJUCTVJL",
    name: "CFB",
  },
  rate: 100,
};

const parsedRate = Number(QUBIC_REFUND_RATE);
const refundRate =
  Number.isFinite(parsedRate) && parsedRate > 0
    ? parsedRate
    : fallbackConfig.rate;

const refundConfig = {
  rpcUrl: QUBIC_RPC_URL || fallbackConfig.rpcUrl,
  accountId: QUBIC_ACCOUNT_ID ?? "",
  seed: QUBIC_ACCOUNT_SEED ?? "",
  qxContractId: QUBIC_QX_CONTRACT_ID || fallbackConfig.qxContractId,
  qxmr: {
    issuer: QUBIC_QXMR_ASSET_ISSUER || fallbackConfig.qxmr.issuer,
    name: QUBIC_QXMR_ASSET_NAME || fallbackConfig.qxmr.name,
  },
  cfb: {
    issuer: QUBIC_CFB_ASSET_ISSUER || fallbackConfig.cfb.issuer,
    name: QUBIC_CFB_ASSET_NAME || fallbackConfig.cfb.name,
  },
  rate: refundRate,
};

type SwapProfile = {
  incomingIssuer: string;
  outgoingIssuer: string;
  outgoingAssetName: string;
  incomingAssetName: string;
  convert: (incomingUnits: number) => number;
};

const swapProfiles: SwapProfile[] = [
  {
    incomingIssuer: refundConfig.cfb.issuer,
    incomingAssetName: refundConfig.cfb.name,
    outgoingIssuer: refundConfig.qxmr.issuer,
    outgoingAssetName: refundConfig.qxmr.name,
    convert: (units) => Math.floor(units / refundConfig.rate),
  },
  {
    incomingIssuer: refundConfig.qxmr.issuer,
    incomingAssetName: refundConfig.qxmr.name,
    outgoingIssuer: refundConfig.cfb.issuer,
    outgoingAssetName: refundConfig.cfb.name,
    convert: (units) => Math.floor(units * refundConfig.rate),
  },
];

const state: RefundState = {
  running: false,
  lastRunAt: null,
  lastProcessedTick: 0,
  processedTicks: 0,
  refundsSent: 0,
  lastError: null,
  configReady: Boolean(refundConfig.accountId && refundConfig.seed),
  history: [],
};

const MAX_HISTORY = 25;

export function getRefundState(): RefundState {
  return { ...state, history: [...state.history] };
}

function remember(record: RefundRecord) {
  state.history = [record, ...state.history].slice(0, MAX_HISTORY);
}

function isRefundCandidate(tx: TransferTransaction) {
  const hasPayload = tx.inputType === 2 && tx.destId === refundConfig.qxContractId;
  const plausibleSize = tx.inputHex.length === 80 || tx.inputHex.length === 160;
  return hasPayload && plausibleSize;
}

export async function runRefundCycle() {
  if (!state.configReady) {
    throw new Error(
      "Missing Qubic credentials. Set QUBIC_ACCOUNT_ID and QUBIC_ACCOUNT_SEED in your environment."
    );
  }
  if (state.running) {
    throw new Error("Refund cycle already running.");
  }

  state.running = true;
  state.lastError = null;

  try {
    const currentTick = await getCurrentTick(refundConfig.rpcUrl);
    if (state.lastProcessedTick === 0) {
      state.lastProcessedTick = currentTick;
      state.lastRunAt = new Date().toISOString();
      state.lastError = null;
      return state;
    }

    let ticksScanned = 0;
    let successfulRefunds = 0;

    for (let tick = state.lastProcessedTick; tick < currentTick; tick++) {
      ticksScanned += 1;
      const transfers = await getTickTransfers(refundConfig.rpcUrl, tick);
      for (const tx of transfers) {
        if (!isRefundCandidate(tx)) continue;
        const payload = await decodeQxTransfer(tx.inputHex);
        if (payload.recipientId !== refundConfig.accountId) continue;

        const profile = swapProfiles.find(
          (p) => p.incomingIssuer === payload.issuerId
        );
        if (!profile) {
          remember({
            txId: tx.txId,
            tick,
            senderId: tx.sourceId,
            assetReceived: payload.assetName,
            amountReceived: payload.amount,
            status: "skipped",
            note: "Issuer not whitelisted",
            executedAt: new Date().toISOString(),
          });
          continue;
        }

        const outgoingUnits = profile.convert(payload.amount);
        if (outgoingUnits <= 0) {
          remember({
            txId: tx.txId,
            tick,
            senderId: tx.sourceId,
            assetReceived: payload.assetName,
            amountReceived: payload.amount,
            status: "skipped",
            note: "Amount below conversion threshold",
            executedAt: new Date().toISOString(),
          });
          continue;
        }

        try {
          await sendAsset({
            rpcUrl: refundConfig.rpcUrl,
            seed: refundConfig.seed,
            toId: tx.sourceId,
            units: outgoingUnits,
            issuer: profile.outgoingIssuer,
            assetName: profile.outgoingAssetName,
          });
          successfulRefunds += 1;
          remember({
            txId: tx.txId,
            tick,
            senderId: tx.sourceId,
            assetReceived: payload.assetName,
            assetSent: profile.outgoingAssetName,
            amountReceived: payload.amount,
            amountSent: outgoingUnits,
            status: "sent",
            executedAt: new Date().toISOString(),
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to broadcast";
          remember({
            txId: tx.txId,
            tick,
            senderId: tx.sourceId,
            assetReceived: profile.incomingAssetName,
            amountReceived: payload.amount,
            status: "failed",
            note: message,
            executedAt: new Date().toISOString(),
          });
          state.lastError = message;
        }
      }
    }

    state.lastProcessedTick = currentTick;
    state.processedTicks += ticksScanned;
    state.refundsSent += successfulRefunds;
    state.lastRunAt = new Date().toISOString();
    return getRefundState();
  } finally {
    state.running = false;
  }
}


