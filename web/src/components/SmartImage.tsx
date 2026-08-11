/**
 * 带降级图的自适应图片组件
 * 加载失败或地址为空时回退到默认占位图（封面/头像通用）
 */
import { useState } from 'react';
import { getImageUrl, DEFAULT_COVER, DEFAULT_AVATAR } from '@/utils/format';

interface Props {
  src?: string | null;
  alt?: string;
  type?: 'cover' | 'avatar';
  className?: string;
  style?: React.CSSProperties;
}

export default function SmartImage({ src, alt = '', type = 'cover', className, style }: Props) {
  const [errored, setErrored] = useState(false);
  const fallback = type === 'avatar' ? DEFAULT_AVATAR : DEFAULT_COVER;
  const url = errored ? fallback : getImageUrl(src) || fallback;

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      onError={() => setErrored(true)}
    />
  );
}
