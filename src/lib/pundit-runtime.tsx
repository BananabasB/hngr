"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { createAssistantStream } from "assistant-stream";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/react-ai-sdk";
import {
  RuntimeAdapterProvider,
  useAssistantApi,
  unstable_useRemoteThreadListRuntime as useRemoteThreadListRuntime,
  type ThreadHistoryAdapter,
} from "@assistant-ui/react";

const punditThreadListAdapter = {
  async list() {
    const response = await fetch("/api/pundit/threads");
    if (!response.ok) {
      throw new Error("Failed to load Pundit thread");
    }

    const { threads } = (await response.json()) as {
      threads: Array<{
        id: string;
        title: string | null;
        status: "regular" | "archived";
      }>;
    };

    return {
      threads: threads.map((thread) => ({
        remoteId: thread.id,
        title: thread.title ?? undefined,
        status: thread.status,
      })),
    };
  },
  async initialize(_threadId: string) {
    const response = await fetch("/api/pundit/threads", { method: "POST" });
    if (!response.ok) {
      throw new Error("Failed to create Pundit thread");
    }

    const { id } = (await response.json()) as { id: string };
    return { remoteId: id, externalId: undefined };
  },
  async rename(remoteId: string, title: string) {
    await fetch(`/api/pundit/threads/${remoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  },
  async archive(remoteId: string) {
    await fetch(`/api/pundit/threads/${remoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
  },
  async unarchive(remoteId: string) {
    await fetch(`/api/pundit/threads/${remoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "regular" }),
    });
  },
  async delete(remoteId: string) {
    await fetch(`/api/pundit/threads/${remoteId}`, {
      method: "DELETE",
    });
  },
  async generateTitle(_remoteId: string, messages: any[]) {
    const firstUserMessage = messages.find((message: any) => message.role === "user");
    const title =
      firstUserMessage?.parts
        ?.map((part: any) => ("text" in part ? part.text : ""))
        .join(" ")
        .trim() || "Pundit chat";

    return createAssistantStream(async (controller) => {
      controller.appendText(title.slice(0, 60));
    });
  },
  async fetch(remoteId: string) {
    const response = await fetch(`/api/pundit/threads/${remoteId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch Pundit thread");
    }

    const thread = (await response.json()) as {
      id: string;
      title: string | null;
      status: "regular" | "archived";
    };

    return {
      remoteId: thread.id,
      title: thread.title ?? undefined,
      status: thread.status,
    };
  },
  unstable_Provider({ children }: { children?: ReactNode }) {
    const api = useAssistantApi();
    const history = useMemo<ThreadHistoryAdapter>(
      () => ({
        async load() {
          return { messages: [] };
        },
        async append() {},
        withFormat(formatAdapter: any) {
          return {
            async load() {
              const remoteId = api.threadListItem().getState().remoteId;
              if (!remoteId) {
                return { messages: [] };
              }

              const response = await fetch(
                `/api/pundit/threads/${remoteId}/messages`,
              );
              if (!response.ok) {
                throw new Error("Failed to load Pundit messages");
              }

              const { messages } = (await response.json()) as {
                messages: Array<{
                  id: string;
                  parent_id: string | null;
                  format: string;
                  content: unknown;
                }>;
              };

              return {
                messages: messages.map((row: any) =>
                  formatAdapter.decode({
                    id: row.id,
                    parent_id: row.parent_id,
                    format: row.format,
                    content: row.content as any,
                  }),
                ),
              };
            },
            async append(item: any) {
              const { remoteId } = await api.threadListItem().initialize();
              await fetch(`/api/pundit/threads/${remoteId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: formatAdapter.getId(item.message),
                  parent_id: item.parentId,
                  format: formatAdapter.format,
                  content: formatAdapter.encode(item as any) as any,
                }),
              });
            },
          };
        },
      }),
      [api],
    );

    return (
      <RuntimeAdapterProvider adapters={{ history }}>
        {children}
      </RuntimeAdapterProvider>
    );
  },
};

function usePunditThreadRuntime() {
  return useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/pundit/chat",
    }),
  });
}

export function usePunditRuntime() {
  return useRemoteThreadListRuntime({
    runtimeHook: usePunditThreadRuntime,
    adapter: punditThreadListAdapter,
    allowNesting: true,
  });
}
