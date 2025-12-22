"use client";

import React, { useCallback, useId, useState } from 'react';
import { Button } from '@/components/ui/button';

export function CodeBlockPlus(props) {
  const { inline, className = '', children, ...rest } = props;
  const text = String(children ?? '');

  if (inline) {
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    );
  }

  const match = /language-([\w#+-]+)/.exec(className) || [];
  const lang = match[1] || 'text';
  const [copied, setCopied] = useState(false);
  const id = useId().replace(/[:]/g, '');
  const anchorId = `code-${id}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [text]);

  const lines = text.replace(/\n$/, '').split('\n');

  return (
    <div className="my-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-950/90 overflow-hidden text-xs" id={anchorId}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/80 bg-slate-900/90 text-slate-300">
        <span className="uppercase tracking-wide text-[10px] font-semibold text-slate-400">{lang}</span>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={handleCopy}
            className="h-6 px-2 text-[10px] border-slate-600 text-slate-200 hover:bg-slate-800"
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
      <pre className="overflow-x-auto bg-transparent m-0 p-0">
        <code className="grid grid-cols-[auto,1fr] gap-x-3 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-50" {...rest}>
          {lines.map((line, idx) => {
            const lineNumber = idx + 1;
            const lineId = `${anchorId}-L${lineNumber}`;
            return (
              <React.Fragment key={lineId}>
                <span className="select-none text-right text-slate-500 pr-1 border-r border-slate-700/70">
                  {lineNumber}
                </span>
                <span
                  id={lineId}
                  data-line-number={lineNumber}
                  className="whitespace-pre text-slate-100"
                >
                  {line || ' '}
                </span>
              </React.Fragment>
            );
          })}
        </code>
      </pre>
    </div>
  );
}


