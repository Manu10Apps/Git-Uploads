'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';

type ArticleContentProps = {
  content: string;
};

function looksLikeHtml(content: string): boolean {
  return /<([a-z][^\s/>]*)(?:\s[^<>]*)?>[\s\S]*<\/\1>|<([a-z][^\s/>]*)(?:\s[^<>]*)?\s*\/?>/i.test(content);
}

export function ArticleContent({ content }: ArticleContentProps) {
  if (looksLikeHtml(content)) {
    return (
      <div
        className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed text-justify [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mb-3 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_blockquote]:border-l-4 [&_blockquote]:border-red-600 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4 [&_a]:text-red-700 [&_a]:underline dark:[&_a]:text-red-500"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <div className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed text-justify">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="mb-4 text-3xl font-bold text-neutral-900 dark:text-white">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-4 text-2xl font-bold text-neutral-900 dark:text-white">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-3 text-xl font-semibold text-neutral-900 dark:text-white">{children}</h3>,
          p: ({ children }) => <p className="mb-4">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-neutral-900 dark:text-white">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="mb-4 list-disc pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="mb-4 list-decimal pl-6">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-red-600 pl-4 italic">{children}</blockquote>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-red-700 underline dark:text-red-500"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}