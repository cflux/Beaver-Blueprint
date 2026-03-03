import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  children: string;
  className?: string;
}

const GFM_PLUGINS = [remarkGfm];

export function MarkdownRenderer({ children, className }: Props) {
  const content = <ReactMarkdown remarkPlugins={GFM_PLUGINS}>{children}</ReactMarkdown>;
  return className ? <div className={className}>{content}</div> : <>{content}</>;
}
