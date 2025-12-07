export interface AccBalance {
    balance: string;
    id: string;
    incomingAmount: string;
    latestIncomingTransferTick: number;
    latestOutgoingTransferTick: number;
    numberOfIncomingTransfers: number;
    numberOfOutgoingTransfers: number;
    outgoingAmount: string;
    validForTick: number;
}

export interface TickInfo {
    amount: string;
    destId: string;
    inputHex: string;
    inputSize:number;
    inputType:number;
    signatureHex: string;
    sourceId: string;
    tickNumber: number;
    txId: string;
}

export interface AccAssets {
    assetId: string;
    amount: string;
}