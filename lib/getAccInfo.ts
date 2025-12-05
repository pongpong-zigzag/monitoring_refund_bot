export async function getAccBalance(rpc_url: string, publicId: string){
    const res = await fetch(`${rpc_url}/v1/balances/${publicId}`);
    const data = await res.json();
    return data.balance;
}

export async function getTickInfo(rpc_url: string, tickId: number) {
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

