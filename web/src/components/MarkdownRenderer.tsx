/**
 * Markdown 渲染组件
 *
 * - 支持 GFM（表格、删除线、任务列表）与原始 HTML（rehype-raw）
 * - 代码块经 react-syntax-highlighter 高亮，并根据深/浅色主题切换配色
 * - 样式由 markdown.less 提供，主题色统一走 CSS 变量
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAppSelector } from '@/store';
import { getImageUrl } from '@/utils/format';
import './markdown.less';

interface Props {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className }: Props) {
  const mode = useAppSelector((s) => s.theme.mode);
  const codeStyle = mode === 'dark' ? oneDark : oneLight;

  return (
    <div className={`markdown-body ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ className: cls, children, ...rest }) {
            const text = String(children ?? '').replace(/\n$/, '');
            const match = /language-(\w+)/.exec(cls || '');
            const isBlock = Boolean(match) || text.includes('\n');
            if (isBlock) {
              return (
                <SyntaxHighlighter
                  language={match?.[1] || 'text'}
                  style={codeStyle}
                  PreTag="div"
                  customStyle={{
                    margin: '12px 0',
                    borderRadius: 8,
                    fontSize: 13,
                    background: 'var(--c-bg-code)',
                  }}
                >
                  {text}
                </SyntaxHighlighter>
              );
            }
            return (
              <code className={cls} {...rest}>
                {children}
              </code>
            );
          },
          img({ src, alt, ...rest }) {
            const url = typeof src === 'string' ? getImageUrl(src) : src;
            return <img src={url as string} alt={alt as string} {...rest} />;
          },
          a({ href, children, ...rest }) {
            const external = href?.startsWith('http');
            return (
              <a
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noreferrer' : undefined}
                {...rest}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
