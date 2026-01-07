import { Link } from 'react-router-dom';
import { parseTextWithMentions } from '@/lib/mentionParser';

interface MentionTextProps {
  text: string;
  className?: string;
}

/**
 * Renders text with clickable @mentions that link to user profiles.
 */
const MentionText = ({ text, className = '' }: MentionTextProps) => {
  const segments = parseTextWithMentions(text);

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'mention' && segment.username) {
          return (
            <Link
              key={index}
              to={`/profile/${segment.username}`}
              className="text-primary hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {segment.content}
            </Link>
          );
        }
        return <span key={index}>{segment.content}</span>;
      })}
    </span>
  );
};

export default MentionText;