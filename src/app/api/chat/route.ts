import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { ChatRequest, ChatResponse, Conversation, Message } from "@/domain/types";
import { store } from "@/domain/store";
import { getDefaultRouter } from "@/agents/router";
import { metrics } from "@/lib/metrics";

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();

    const { tenantId, userId, workspaceId, agentType, userMessage } = body;

    if (!tenantId || !userId || !workspaceId || !agentType || !userMessage?.trim()) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: tenantId, userId, workspaceId, agentType, userMessage" },
        { status: 400 }
      );
    }

    // Resolve or create conversation.
    let conversation: Conversation;
    if (body.conversationId) {
      const existing = store.getConversation(body.conversationId);
      if (!existing) {
        return NextResponse.json(
          { error: `Conversación no encontrada: ${body.conversationId}` },
          { status: 404 }
        );
      }
      conversation = existing;
    } else {
      const now = new Date().toISOString();
      conversation = store.createConversation({
        id: randomUUID(),
        workspaceId,
        tenantId,
        userId,
        agentType,
        title: userMessage.slice(0, 60),
        messages: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    // Persist the user message.
    const userMsg: Message = {
      id: randomUUID(),
      conversationId: conversation.id,
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    store.addMessage(conversation.id, userMsg);

    // Build history for agent context.
    const history = conversation.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Invoke the agent.
    const router = getDefaultRouter();
    const agent = router.get(agentType);
    const agentResponse = await agent.handle({
      tenantId,
      userId,
      conversationHistory: history,
      userMessage,
    });

    // Persist the assistant message.
    const assistantMsg: Message = {
      id: randomUUID(),
      conversationId: conversation.id,
      role: "assistant",
      content: agentResponse.content,
      metadata: {
        agentType: agentResponse.agentType,
        provider: agentResponse.provider,
        model: agentResponse.model,
        latencyMs: agentResponse.latencyMs,
        riskLevel: agentResponse.riskLevel,
        confidence: agentResponse.confidence,
        reviewStatus: agentResponse.reviewStatus,
        reviewRecommended: agentResponse.reviewRecommended,
        sources: agentResponse.sources,
        disclaimer: agentResponse.disclaimer,
      },
      createdAt: new Date().toISOString(),
    };
    store.addMessage(conversation.id, assistantMsg);

    // Record metric.
    metrics.record({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId,
      userId,
      agentType,
      provider: agentResponse.provider,
      model: agentResponse.model,
      latencyMs: agentResponse.latencyMs,
      riskLevel: agentResponse.riskLevel,
      reviewStatus: agentResponse.reviewStatus,
      inputLength: userMessage.length,
      outputLength: agentResponse.content.length,
    });

    const response: ChatResponse = {
      conversationId: conversation.id,
      message: assistantMsg,
      metrics: {
        agentType,
        provider: agentResponse.provider,
        model: agentResponse.model,
        latencyMs: agentResponse.latencyMs,
        riskLevel: agentResponse.riskLevel,
        reviewStatus: agentResponse.reviewStatus,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error("[POST /api/chat]", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
