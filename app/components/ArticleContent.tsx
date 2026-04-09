'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';

type ArticleContentProps = {
  content: string;
};

function looksLikeHtml(content: string): boolean {
  return /<([a-z][^\s/>]*)(?:\s[^<>]*)?>[\s\S]*<\/\1>|<([a-z][^\s/>]*)(?:\s[^<>]*)?\s*\/?>/i.test(content);
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
    if ((u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') && u.searchParams.get('v')) {
      return u.searchParams.get('v');
    }
  } catch {}
  return null;
}

function YouTubeThumbnail({ url, videoId }: { url: string; videoId: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block relative rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 my-4 max-w-2xl"
    >
      <img
        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
        alt="YouTube video"
        loading="lazy"
        className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <div className="w-14 h-10 bg-red-600 rounded-lg flex items-center justify-center group-hover:bg-red-700 transition-colors">
          <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </a>
  );
}

/** Replace YouTube <a> tags in HTML content with thumbnail embeds */
function transformYouTubeLinksInHtml(html: string): string {
  return html.replace(
    /<a\s[^>]*href=["'](https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?[^"']*v=[^"'&]+|youtu\.be\/[^"']+))["'][^>]*>[\s\S]*?<\/a>/gi,
    (_match, url) => {
      const videoId = extractYouTubeId(url);
      if (!videoId) return _match;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="group block relative rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 my-4 max-w-2xl"><img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="YouTube video" loading="lazy" class="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300" /><div class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors"><div class="w-14 h-10 bg-red-600 rounded-lg flex items-center justify-center group-hover:bg-red-700 transition-colors"><svg class="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></div></div></a>`;
    }
  );
}

export function ArticleContent({ content }: ArticleContentProps) {
  if (looksLikeHtml(content)) {
    return (
      <div
        className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed text-justify [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mb-3 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_blockquote]:border-l-4 [&_blockquote]:border-red-600 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4 [&_a]:text-red-700 [&_a]:underline dark:[&_a]:text-red-500"
        dangerouslySetInnerHTML={{ __html: transformYouTubeLinksInHtml(content) }}
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
          a: ({ href, children }) => {
            const videoId = href ? extractYouTubeId(href) : null;
            if (videoId && href) {
              return <YouTubeThumbnail url={href} videoId={videoId} />;
            }
            return (
              <a
                href={href}
                className="text-red-700 underline dark:text-red-500"
                target="_blank"
                rel="noopener noreferrer"
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