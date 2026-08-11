/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_TARGET: string;
  readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** react-quill 未随包提供类型声明，这里做最小声明以通过类型检查 */
declare module 'react-quill' {
  import * as React from 'react';

  export interface ReactQuillProps {
    value?: string;
    defaultValue?: string;
    onChange?: (content: string, delta: unknown, source: string, editor: unknown) => void;
    onBlur?: (previousRange: unknown, source: string, editor: unknown) => void;
    onFocus?: (range: unknown, source: string, editor: unknown) => void;
    placeholder?: string;
    readOnly?: boolean;
    theme?: string;
    modules?: Record<string, unknown>;
    formats?: string[];
    className?: string;
    style?: React.CSSProperties;
    preserveWhitespace?: boolean;
  }

  const ReactQuill: React.ComponentType<ReactQuillProps>;
  export default ReactQuill;
}

declare module '*.less' {
  const classes: Record<string, string>;
  export default classes;
}
