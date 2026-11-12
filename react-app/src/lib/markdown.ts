import { marked } from 'marked';
import DOMPurify from 'dompurify';

/** Angular MarkdownPipe: marked.parse + HTML sanitisation. */
export function renderMarkdown(content: string): string {
  return DOMPurify.sanitize(marked.parse(content ?? '', { async: false }) as string);
}
