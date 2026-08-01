import { NextResponse } from "next/server";
import { metrics } from "@/lib/metrics";

export async function GET() {
  try {
    return NextResponse.json({ summary: metrics.getSummary(), events: metrics.getAll() });
  } catch (err) {
    console.error("[GET /api/metrics]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
