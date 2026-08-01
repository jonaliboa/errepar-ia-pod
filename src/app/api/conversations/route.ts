import { NextRequest, NextResponse } from "next/server";
import { store } from "@/domain/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId es requerido" },
        { status: 400 }
      );
    }
    const conversations = store.getConversationsByWorkspace(workspaceId);
    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("[GET /api/conversations]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
