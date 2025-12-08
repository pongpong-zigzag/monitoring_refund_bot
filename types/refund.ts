export type RefundRecord = {
  txId: string;
  tick: number;
  senderId: string;
  assetReceived: string;
  assetSent?: string;
  amountReceived: number;
  amountSent?: number;
  status: "sent" | "skipped" | "failed";
  note?: string;
  executedAt: string;
};

export type RefundState = {
  running: boolean;
  lastRunAt: string | null;
  lastProcessedTick: number;
  processedTicks: number;
  refundsSent: number;
  lastError: string | null;
  configReady: boolean;
  history: RefundRecord[];
};

