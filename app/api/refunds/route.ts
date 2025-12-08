import { NextResponse } from "next/server";
import { getRefundState, runRefundCycle } from "@/lib/refund-runner";

export async function GET() {
  return NextResponse.json(getRefundState());
}

export async function POST() {
  try {
    const nextState = await runRefundCycle();
    return NextResponse.json(nextState);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

