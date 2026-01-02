import { useChatRuntime } from "@assistant-ui/react";
import { useChat } from "ai/react";

export function useCustomChatRuntime({ api }: { api: string }) {
  const chat = useChat({
    api,
    body: {
      // Additional body configuration if needed
    },
  });

  // Convert the AI SDK chat to assistant-ui runtime format
  const runtime = useChatRuntime({
    transport: {
      async sendMessage(messages) {
        // Forward messages to AI SDK
        return chat.append(messages[messages.length - 1].content);
      },
      async cancel() {
        chat.stop();
      },
      subscribe(callback) {
        // Subscribe to AI SDK messages
        const unsubscribe = chat.onMessage((message) => {
          callback({
            type: 'message',
            message: {
              id: message.id,
              role: message.role,
              content: message.content,
              // Add other necessary message properties
            },
          });
        });

        return () => unsubscribe();
      },
    },
  });

  return runtime;
}
