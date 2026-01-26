/**
 * Server-Sent Events (SSE) Utility
 * For streaming chatbot responses
 */

export interface SSEMessage {
  event?: string;
  data: string;
  id?: string;
}

export function createSSEStream(
  sendMessage: (message: SSEMessage) => void,
  onClose?: () => void
): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      const send = (message: SSEMessage) => {
        let payload = '';

        if (message.event) {
          payload += `event: ${message.event}\n`;
        }

        if (message.id) {
          payload += `id: ${message.id}\n`;
        }

        payload += `data: ${message.data}\n\n`;

        controller.enqueue(encoder.encode(payload));
      };

      sendMessage(send);
    },

    cancel() {
      onClose?.();
    },
  });
}

/**
 * Helper function to create SSE response
 */
export function createSSEResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
