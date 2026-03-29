'use client';

import React from 'react';
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, Quote, Heading2 } from 'lucide-react';

type ContentEditorProps = {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  focusRingClassName: string;
};

type ToolbarAction = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  run: (selectedText: string) => { text: string; selectionStart: number; selectionEnd: number };
};

function buildWrappedText(selectedText: string, prefix: string, suffix: string, placeholder: string) {
  const content = selectedText || placeholder;
  return {
    text: `${prefix}${content}${suffix}`,
    selectionStart: prefix.length,
    selectionEnd: prefix.length + content.length,
  };
}

function buildPrefixedLines(selectedText: string, prefix: string, placeholder: string) {
  const content = selectedText || placeholder;
  const lines = content.split('\n');
  const text = lines.map((line) => `${prefix}${line || placeholder}`).join('\n');
  return {
    text,
    selectionStart: 0,
    selectionEnd: text.length,
  };
}

const toolbarActions: ToolbarAction[] = [
  {
    label: 'Bold',
    icon: Bold,
    run: (selectedText) => buildWrappedText(selectedText, '**', '**', 'strong text'),
  },
  {
    label: 'Italic',
    icon: Italic,
    run: (selectedText) => buildWrappedText(selectedText, '*', '*', 'italic text'),
  },
  {
    label: 'Heading',
    icon: Heading2,
    run: (selectedText) => buildWrappedText(selectedText, '## ', '', 'Heading'),
  },
  {
    label: 'Quote',
    icon: Quote,
    run: (selectedText) => buildPrefixedLines(selectedText, '> ', 'Quoted text'),
  },
  {
    label: 'Bullets',
    icon: List,
    run: (selectedText) => buildPrefixedLines(selectedText, '- ', 'List item'),
  },
  {
    label: 'Numbered',
    icon: ListOrdered,
    run: (selectedText) => {
      const content = selectedText || 'List item';
      const lines = content.split('\n');
      const text = lines.map((line, index) => `${index + 1}. ${line || 'List item'}`).join('\n');
      return {
        text,
        selectionStart: 0,
        selectionEnd: text.length,
      };
    },
  },
  {
    label: 'Link',
    icon: LinkIcon,
    run: (selectedText) => buildWrappedText(selectedText, '[', '](https://example.com)', 'link text'),
  },
];

export default function ContentEditor({
  value,
  onChange,
  name = 'content',
  placeholder = 'Full article content',
  rows = 10,
  required,
  focusRingClassName,
}: ContentEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const applyAction = (action: ToolbarAction) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.slice(start, end);
    const before = value.slice(0, start);
    const after = value.slice(end);
    const result = action.run(selectedText);
    const nextValue = `${before}${result.text}${after}`;

    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + result.selectionStart, start + result.selectionEnd);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-900/60">
        {toolbarActions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => applyAction(action)}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            title={action.label}
          >
            <action.icon className="h-3.5 w-3.5" />
            <span>{action.label}</span>
          </button>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white ${focusRingClassName} focus:border-transparent outline-none font-mono text-sm`}
        required={required}
      />
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Use the toolbar to insert Markdown formatting like bold, italic, headings, quotes, lists, and links.
      </p>
    </div>
  );
}