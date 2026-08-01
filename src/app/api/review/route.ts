/**
 * Review endpoint – allows a user to request human professional review
 * of a specific conversation message.
 */

import { NextRequest, NextResponse } from "next/server";
import { store } from "@/domain/store";

export async function POST(request: NextRequest) {
  try {
    const { conversationId, messageId } = await request.json();

    if (!conversationId || !messageId) {
      return NextResponse.json(
        { error: "conversationId y messageId son requeridos" },
        { status: 400 }
      );
    }

    const conversation = store.getConversation(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: `Conversación no encontrada: ${conversationId}` },
        { status: 404 }
      );
    }

    // Update the review status of the target message.
    const updatedMessages = conversation.messages.map((m) => {
      if (m.id === messageId && m.role === "assistant" && m.metadata) {
        return {
          ...m,
          metadata: { ...m.metadata, reviewStatus: "requested" as const },
        };
      }
      return m;
    });

    store.updateConversation(conversationId, {
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message:
        "Revisión profesional solicitada. Un especialista de Errepar analizará la respuesta en breve.",
      reviewStatus: "requested",
    });
  } catch (err) {
    console.error("[POST /api/review]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
