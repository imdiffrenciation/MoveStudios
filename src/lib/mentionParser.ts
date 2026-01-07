/**
 * Parse and render @mentions in text content.
 * Links @username mentions to user profiles.
 */

export interface MentionMatch {
  username: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Extract all @mentions from text
 */
export function extractMentions(text: string): MentionMatch[] {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const mentions: MentionMatch[] = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      username: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }
  
  return mentions;
}

/**
 * Parse text and return segments (plain text and mentions)
 */
export interface TextSegment {
  type: 'text' | 'mention';
  content: string;
  username?: string;
}

export function parseTextWithMentions(text: string): TextSegment[] {
  const mentions = extractMentions(text);
  
  if (mentions.length === 0) {
    return [{ type: 'text', content: text }];
  }
  
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  
  for (const mention of mentions) {
    // Add text before the mention
    if (mention.startIndex > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, mention.startIndex),
      });
    }
    
    // Add the mention
    segments.push({
      type: 'mention',
      content: `@${mention.username}`,
      username: mention.username,
    });
    
    lastIndex = mention.endIndex;
  }
  
  // Add remaining text after the last mention
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }
  
  return segments;
}

/**
 * Extract hashtags from text
 */
export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
  const hashtags: string[] = [];
  let match;
  
  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push(match[1].toLowerCase());
  }
  
  return [...new Set(hashtags)]; // Remove duplicates
}