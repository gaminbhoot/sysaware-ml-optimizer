export interface ParsedThinking {
  parsedThinking: string;
  parsedContent: string;
  isStillThinking: boolean;
  hasThinkStarted: boolean;
  thinkEndTime: number;
}

/**
 * Parses <think> and </think> tags from model output stream and calculates thinking state.
 */
export function parseThinkingTags(
  fullContent: string,
  hasThinkStartedPrev: boolean,
  thinkEndTimePrev: number
): ParsedThinking {
  let hasThinkStarted = hasThinkStartedPrev;
  let thinkEndTime = thinkEndTimePrev;
  let isStillThinking = false;
  let parsedThinking = '';
  let parsedContent = fullContent;

  if (fullContent.includes('<think>')) {
    hasThinkStarted = true;
    if (fullContent.includes('</think>')) {
      const parts = fullContent.split('</think>');
      parsedThinking = parts[0].replace('<think>', '');
      parsedContent = parts.slice(1).join('</think>');
      if (thinkEndTime === 0) {
        thinkEndTime = Date.now();
      }
    } else {
      const parts = fullContent.split('<think>');
      parsedThinking = parts[1] || '';
      parsedContent = '';
      isStillThinking = true;
    }
  }

  return {
    parsedThinking,
    parsedContent,
    isStillThinking,
    hasThinkStarted,
    thinkEndTime
  };
}
