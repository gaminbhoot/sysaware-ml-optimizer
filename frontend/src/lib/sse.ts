/**
 * Utility function to read server-sent events (SSE) stream with proper chunk buffering.
 */
export async function readSSEStream(
  response: Response,
  onData: (data: any) => void,
  signal?: AbortSignal
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No reader available");

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException("The user aborted a request.", "AbortError");
      }
      
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            onData(data);
          } catch (e) {
            console.error('Failed to parse SSE data:', e, 'Line was:', trimmed);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
