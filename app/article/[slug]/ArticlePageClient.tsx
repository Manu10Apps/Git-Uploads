'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';
import { Header, FactCheckBox, Footer } from '@/app/components';
import { ArticleImage } from '@/app/components/ArticleImage';
import { ArticleContent } from '@/app/components/ArticleContent';
import { Bookmark, Copy, Check, ThumbsDown, ThumbsUp, TriangleAlert } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  authorSocialPlatform?: string;
  authorSocialUrl?: string;
  authorSocialPlatform2?: string;
  authorSocialUrl2?: string;
  category: string;
  tags: string[];
  image: string;
  slug: string;
  publishedAt: string;
  gallery?: Array<{ url: string; caption: string }>;
}

interface ArticleClientProps {
  slug: string;
}

interface ArticleComment {
  id: number;
  name: string;
  content: string;
  likes: number;
  dislikes: number;
  createdAt: string;
  visitorReaction: CommentReaction | null;
  replies: ArticleComment[];
}

type CommentReaction = 'like' | 'dislike';

const formatDateInKinyarwanda = (dateString: string) => {
  const date = new Date(dateString);
  const months = [
    'Mutarama', 'Gashyantare', 'Werurwe', 'Mata', 'Gicurasi', 'Kamena',
    'Nyakanga', 'Kanama', 'Nzeri', 'Ukwakira', 'Ugushyingo', 'Ukuboza'
  ];
  return `Tariki ya ${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
};

export default function ArticlePageClient({ slug }: ArticleClientProps) {
  const router = useRouter();
  const { language } = useAppStore();
  const t = getTranslation(language);
  const [isSaved, setIsSaved] = React.useState(false);
  const [linkCopied, setLinkCopied] = React.useState(false);
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', comment: '' });
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyFormData, setReplyFormData] = useState({ name: '', email: '', comment: '' });
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [replySuccessId, setReplySuccessId] = useState<number | null>(null);
  const [reactionLoadingId, setReactionLoadingId] = useState<number | null>(null);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [mostViewedArticles, setMostViewedArticles] = useState<Article[]>([]);
  const [mostViewedLoading, setMostViewedLoading] = useState(true);
  const [adverts, setAdverts] = useState<any[]>([]);
  const [shareUrl, setShareUrl] = useState('');
  const articleTopAdverts = adverts.filter((ad: any) => ad.position === 'article_top' && ad.isActive);
  const articleBottomAdverts = adverts.filter((ad: any) => ad.position === 'article_bottom' && ad.isActive);
  const sidebarAdverts = adverts.filter((ad: any) => ad.position === 'sidebar' && ad.isActive);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/articles?slug=${encodeURIComponent(slug)}`);
        const result = await response.json();
        const articles = result.data || [];
        const foundArticle = articles.find((a: Article) => a.slug === slug);
        setArticle(foundArticle || null);
      } catch (error) {
        console.error('Failed to fetch article:', error);
        setArticle(null);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [slug]);

  useEffect(() => {
    const fetchRecentArticles = async () => {
      try {
        setRecentLoading(true);
        const response = await fetch('/api/articles?limit=4&summary=true');
        const result = await response.json();
        const articles = result.data || [];
        setRecentArticles(articles.slice(0, 4));
      } catch (error) {
        console.error('Failed to fetch recent articles:', error);
        setRecentArticles([]);
      } finally {
        setRecentLoading(false);
      }
    };

    fetchRecentArticles();
  }, []);

  useEffect(() => {
    if (!article) return;
    const fetchRelatedArticles = async () => {
      try {
        setRelatedLoading(true);
        const response = await fetch(`/api/articles?category=${article.category}&limit=6&summary=true`);
        const result = await response.json();
        const articles = result.data || [];
        const filtered = articles.filter((a: Article) => a.slug !== article.slug);
        setRelatedArticles(filtered.slice(0, 3));
      } catch (error) {
        console.error('Failed to fetch related articles:', error);
        setRelatedArticles([]);
      } finally {
        setRelatedLoading(false);
      }
    };

    fetchRelatedArticles();
  }, [article?.category, article?.slug]);

  useEffect(() => {
    const fetchMostViewedArticles = async () => {
      try {
        setMostViewedLoading(true);
        const response = await fetch('/api/articles?limit=3&featured=true&summary=true');
        const result = await response.json();
        const articles = result.data || [];
        setMostViewedArticles(articles.slice(0, 3));
      } catch (error) {
        console.error('Failed to fetch most viewed articles:', error);
        setMostViewedArticles([]);
      } finally {
        setMostViewedLoading(false);
      }
    };

    fetchMostViewedArticles();
  }, []);

  useEffect(() => {
    const fetchAdverts = async () => {
      try {
        const response = await fetch('/api/adverts');
        const data = await response.json();
        setAdverts(data.data || []);
      } catch {}
    };
    fetchAdverts();
  }, []);

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  const shareTitle = article?.title || 'Amakuru';

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareTitle} ${shareUrl}`)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch {
      // silently ignore comment fetch errors
    }
  };

  useEffect(() => {
    fetchComments();
  }, [slug]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError('');
    setCommentSuccess(false);
    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          comment: formData.comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCommentError(data.error || 'Habaye ikosa, ongera ugerageze.');
      } else {
        await fetchComments();
        setFormData({ name: '', email: '', comment: '' });
        setCommentSuccess(true);
        setTimeout(() => setCommentSuccess(false), 4000);
      }
    } catch {
      setCommentError('Habaye ikosa, ongera ugerageze.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleReplyInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setReplyFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleReplySubmit = async (e: React.FormEvent, parentId: number) => {
    e.preventDefault();
    setReplyError('');
    setReplySubmitting(true);

    try {
      const res = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: replyFormData.name,
          email: replyFormData.email,
          comment: replyFormData.comment,
          parentId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setReplyError(data.error || 'Habaye ikosa, ongera ugerageze.');
      } else {
        await fetchComments();
        setReplyFormData({ name: '', email: '', comment: '' });
        setReplySuccessId(parentId);
        setActiveReplyId(null);
        setTimeout(() => setReplySuccessId(null), 4000);
      }
    } catch {
      setReplyError('Habaye ikosa, ongera ugerageze.');
    } finally {
      setReplySubmitting(false);
    }
  };

  const openReplyForm = (commentId: number) => {
    setReplyError('');
    setReplySuccessId(null);
    setActiveReplyId(commentId);
    setReplyFormData({ name: '', email: '', comment: '' });
  };

  const updateCommentReaction = (
    items: ArticleComment[],
    commentId: number,
    likes: number,
    dislikes: number,
    visitorReaction: CommentReaction
  ): ArticleComment[] => items.map((item) => {
    if (item.id === commentId) {
      return { ...item, likes, dislikes, visitorReaction };
    }

    return {
      ...item,
      replies: updateCommentReaction(item.replies, commentId, likes, dislikes, visitorReaction),
    };
  });

  const countComments = (items: ArticleComment[]): number =>
    items.reduce((total, item) => total + 1 + countComments(item.replies), 0);

  const renderCommentNode = (comment: ArticleComment, depth = 0): React.ReactElement => {
    const isReply = depth > 0;
    const reactionButtonSize = isReply ? 'text-xs' : 'text-sm';
    const iconSize = isReply ? 'h-3.5 w-3.5' : 'h-4 w-4';

    return (
      <li key={comment.id} className={isReply ? 'py-1' : 'border-l-4 border-red-600 pl-4 py-2'}>
        <p className={isReply ? 'font-medium text-sm text-neutral-900 dark:text-white' : 'font-semibold text-neutral-900 dark:text-white'}>
          {comment.name}
        </p>
        <p className={`text-xs text-neutral-500 dark:text-neutral-500 ${isReply ? 'mb-1' : 'mb-2'}`}>
          {new Date(comment.createdAt).toLocaleDateString('rw-RW', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <p className={isReply ? 'text-sm text-neutral-700 dark:text-neutral-300' : 'text-neutral-700 dark:text-neutral-300'}>
          {comment.content}
        </p>

        <div className={`mt-${isReply ? '2' : '3'} flex items-center gap-3`}>
          <button
            type="button"
            onClick={() => openReplyForm(comment.id)}
            className="text-sm font-medium text-red-700 dark:text-red-400 hover:underline"
          >
            Musubize
          </button>
          <button
            type="button"
            onClick={() => handleCommentReaction(comment.id, 'like')}
            disabled={reactionLoadingId === comment.id}
            className={`inline-flex items-center gap-1 ${reactionButtonSize} transition-colors disabled:opacity-50 ${comment.visitorReaction === 'like' ? 'text-green-700 dark:text-green-400' : 'text-neutral-600 hover:text-green-700 dark:text-neutral-300 dark:hover:text-green-400'}`}
          >
            <ThumbsUp className={iconSize} />
            <span>{comment.likes}</span>
          </button>
          <button
            type="button"
            onClick={() => handleCommentReaction(comment.id, 'dislike')}
            disabled={reactionLoadingId === comment.id}
            className={`inline-flex items-center gap-1 ${reactionButtonSize} transition-colors disabled:opacity-50 ${comment.visitorReaction === 'dislike' ? 'text-red-700 dark:text-red-400' : 'text-neutral-600 hover:text-red-700 dark:text-neutral-300 dark:hover:text-red-400'}`}
          >
            <ThumbsDown className={iconSize} />
            <span>{comment.dislikes}</span>
          </button>
          {replySuccessId === comment.id && (
            <span className="text-xs text-green-600 dark:text-green-400">Igisubizo cyoherejwe.</span>
          )}
        </div>

        {activeReplyId === comment.id && (
          <form className="mt-3 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg p-3" onSubmit={(e) => handleReplySubmit(e, comment.id)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <input
                name="name"
                value={replyFormData.name}
                onChange={handleReplyInputChange}
                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-white text-sm rounded-lg focus:ring-0 focus:outline-none block w-full p-2.5"
                placeholder="Andika izina ryawe"
                required
                pattern="[A-Za-z\s]{3,20}"
                type="text"
              />
              <input
                name="email"
                value={replyFormData.email}
                onChange={handleReplyInputChange}
                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-white text-sm rounded-lg focus:ring-0 focus:outline-none block w-full p-2.5"
                placeholder="Andika Imeli yawe"
                required
                pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$"
                type="email"
              />
            </div>
            <textarea
              name="comment"
              value={replyFormData.comment}
              onChange={handleReplyInputChange}
              rows={3}
              className="px-3 py-2 w-full text-sm text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-600 rounded-lg focus:ring-0 focus:outline-none resize-none bg-transparent"
              placeholder="Andika igisubizo..."
              required
            />
            {replyError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">{replyError}</p>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveReplyId(null)}
                className="rounded-md py-2 px-3 text-sm bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-600 dark:hover:bg-neutral-500 text-neutral-800 dark:text-white"
              >
                Hagarika
              </button>
              <button
                type="submit"
                disabled={replySubmitting}
                className="rounded-md py-2 px-3 text-sm bg-red-700 hover:bg-red-800 text-white disabled:bg-neutral-400"
              >
                {replySubmitting ? 'Kohereza...' : 'Ohereza Igisubizo'}
              </button>
            </div>
          </form>
        )}

        {comment.replies.length > 0 && (
          <ul className="mt-4 ml-2 sm:ml-6 border-l-2 border-neutral-200 dark:border-neutral-700 pl-3 space-y-3">
            {comment.replies.map((reply) => renderCommentNode(reply, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  const handleCommentReaction = async (commentId: number, reaction: CommentReaction) => {
    setReactionLoadingId(commentId);

    try {
      const res = await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, reaction }),
      });
      const data = await res.json();

      if (!res.ok) {
        setCommentError(data.error || 'Habaye ikosa, ongera ugerageze.');
        return;
      }

      setComments((prev) => updateCommentReaction(prev, commentId, data.comment.likes, data.comment.dislikes, data.comment.visitorReaction));
    } catch {
      setCommentError('Habaye ikosa, ongera ugerageze.');
    } finally {
      setReactionLoadingId(null);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
          <div className="text-center">
            <p className="text-neutral-600 dark:text-neutral-400">Inkuru ziri gushakishwa...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!article) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4 text-neutral-900 dark:text-white">Article Not Found</h1>
            <Link href="/" className="text-red-600 hover:text-red-700 dark:text-red-600 dark:hover:text-red-500">
              Return to Home
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const totalComments = countComments(comments);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white dark:bg-neutral-950">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
          {/* Main Article Content - 2/3 width on desktop */}
          <article className="lg:col-span-2">
            {/* Title Section */}
            <header className="mb-6 sm:mb-8">
            <div className="mb-3 sm:mb-4">
              <span className="inline-block px-2 sm:px-3 py-1 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-300 rounded-full text-xs sm:text-sm font-semibold capitalize">
                {article.category}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight mb-3 sm:mb-4 text-neutral-900 dark:text-white text-justify">
              {article.title}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-neutral-600 dark:text-neutral-400 mb-4 sm:mb-6 text-justify">
              {article.excerpt}
            </p>

            {/* Meta Information */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 pb-4 sm:pb-6 border-b border-neutral-200 dark:border-neutral-800">
              {/* Author */}
              <div>
                <p className="font-semibold text-sm sm:text-base text-neutral-900 dark:text-white">Yanditswe na {article.author}</p>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                  {formatDateInKinyarwanda(article.publishedAt)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 sm:ml-auto">
                <button
                  onClick={() => setIsSaved(!isSaved)}
                  className="p-2 sm:p-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                  aria-label="Bookmark"
                  title="Save article"
                >
                  <Bookmark
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    fill={isSaved ? 'currentColor' : 'none'}
                  />
                </button>
                
                {/* Social Share Links */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 pl-0 sm:pl-4 border-l-0 sm:border-l border-neutral-200 dark:border-neutral-700">
                  {/* X Share */}
                  <a
                    href={shareLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-600 transition-colors"
                    aria-label="Share on X"
                    title="Share on X"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.223-6.831-5.97 6.831H2.423l7.723-8.835L1.457 2.25h6.888l4.722 6.236 5.454-6.236zM17.15 20.005h1.828L6.883 3.996H5.017l12.133 16.009z"/>
                    </svg>
                  </a>

                  {/* WhatsApp Share */}
                  <a
                    href={shareLinks.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-600 transition-colors"
                    aria-label="Share on WhatsApp"
                    title="Share on WhatsApp"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </a>

                  {/* Facebook Share */}
                  <a
                    href={shareLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-600 transition-colors"
                    aria-label="Share on Facebook"
                    title="Share on Facebook"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>

                  {/* LinkedIn Share */}
                  <a
                    href={shareLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-600 transition-colors"
                    aria-label="Share on LinkedIn"
                    title="Share on LinkedIn"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>
                    </svg>
                  </a>

                  {/* Copy Link */}
                  <button
                    onClick={handleCopyLink}
                    className="text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-600 transition-colors"
                    aria-label="Copy link"
                    title={linkCopied ? "Link copied!" : "Copy link"}
                  >
                    {linkCopied ? (
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Featured Image */}
          <div className="mb-6 sm:mb-8 md:mb-12 rounded-lg sm:rounded-xl overflow-hidden h-48 sm:h-64 md:h-96 lg:h-[500px]">
            <ArticleImage
              src={article.image}
              alt={article.title}
              className="object-cover"
            />
          </div>

          {/* Article Top Advertisement */}
          {articleTopAdverts.length > 0 && (
            <div className="mb-6 sm:mb-8">
              {articleTopAdverts.slice(0, 1).map((advert: any) => (
                <a key={advert.id} href={advert.url || '#'} target="_blank" rel="noopener noreferrer" className="block group hover:opacity-90 transition-opacity">
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden h-16 md:h-20 lg:h-24 flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                    <img src={advert.imageUrl} alt={advert.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Article Content */}
          <div className="prose dark:prose-dark max-w-none mb-8 sm:mb-10 md:mb-12">
            <ArticleContent content={article.content} />
          </div>

          {/* Gallery Section */}
          {article.gallery && article.gallery.length > 0 && (
            <div className="mb-8 sm:mb-10 md:mb-12">
              <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-white mb-4 sm:mb-6">
                Ifoto z'Inkuru
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {article.gallery.map((item, index) => (
                  <div key={index} className="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 hover:shadow-lg transition-shadow">
                    <ArticleImage
                      src={item.url}
                      alt={item.caption || `Gallery image ${index + 1}`}
                      className="w-full h-48 sm:h-56 object-cover"
                    />
                    {item.caption && (
                      <div className="p-3 sm:p-4 bg-neutral-50 dark:bg-neutral-800">
                        <p className="text-sm text-neutral-700 dark:text-neutral-300 italic">
                          {item.caption}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Author - Chief Editor */}
          <section className="mb-8 sm:mb-10 md:mb-12 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-white mb-2">Andikira Umwanditsi</h2>
            <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300 mb-4">
              Ushobora kuvugana na Chief Editor ukoresheje imbuga nkoranyambaga ze.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://www.instagram.com/dir.bignem/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-gradient-to-br from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white p-3 transition-all hover:scale-110"
                aria-label="Instagram"
                title="Instagram"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.057-1.645.069-4.849.069-3.204 0-3.584-.012-4.849-.069-3.259-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.322a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@dir.bignem"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-black text-white p-3 transition-all hover:scale-110 hover:shadow-[0_0_0_2px_#25F4EE,0_0_0_4px_#FE2C55]"
                aria-label="TikTok"
                title="TikTok"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#25F4EE" d="M19.498 7.094a4.994 4.994 0 0 1-3.622-1.49A4.992 4.992 0 0 1 13.364 1h-3.75v14.25a2.625 2.625 0 1 1-5.25-2.625 2.63 2.63 0 0 1 .81.125v-3.82a6.375 6.375 0 1 0 9.375 6.177V8.78a8.088 8.088 0 0 0 4.969 1.594V6.59a4.966 4.966 0 0 1-.5-.496z" />
                  <path fill="#FE2C55" d="M19.498 7.094a4.994 4.994 0 0 1-3.622-1.49A4.992 4.992 0 0 1 13.364 1h-3.75v14.25a2.625 2.625 0 1 1-5.25-2.625 2.63 2.63 0 0 1 .81.125v-3.82a6.375 6.375 0 1 0 9.375 6.177V8.78a8.088 8.088 0 0 0 4.969 1.594V6.59a4.966 4.966 0 0 1-.5-.496z" opacity="0.5" />
                </svg>
              </a>
            </div>
          </section>

          {/* Article Bottom Advertisement */}
          {articleBottomAdverts.length > 0 && (
            <div className="mb-8 sm:mb-10">
              {articleBottomAdverts.slice(0, 1).map((advert: any) => (
                <a key={advert.id} href={advert.url || '#'} target="_blank" rel="noopener noreferrer" className="block group hover:opacity-90 transition-opacity">
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden h-16 md:h-20 lg:h-24 flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                    <img src={advert.imageUrl} alt={advert.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Comments Section */}
          <section className="mt-8 sm:mt-10 md:mt-12 bg-neutral-100 dark:bg-neutral-800 p-4 sm:p-6 md:p-8 rounded-lg sm:rounded-md">
            <h2 className="mb-4 sm:mb-6 text-lg sm:text-xl font-semibold text-neutral-900 dark:text-white">Ibitekerezo ({totalComments})</h2>
            <div>
              {/* Comment Form */}
              <form className="mb-3 sm:mb-6" onSubmit={handleCommentSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
                  <div>
                    <label htmlFor="name" className="block mb-2 text-sm font-medium text-neutral-900 dark:text-white sr-only">
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-white text-sm rounded-lg focus:ring-0 focus:outline-none block w-full p-2.5"
                      placeholder="Andika izina ryawe"
                      required
                      pattern="[A-Za-z\s]{3,20}"
                      type="text"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block mb-2 text-sm font-medium text-neutral-900 dark:text-white sr-only">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-white text-sm rounded-lg focus:ring-0 focus:outline-none block w-full p-2.5"
                      placeholder="Andika Imeli yawe"
                      required
                      pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$"
                      type="email"
                    />
                  </div>
                </div>
                <div className="py-2 px-3 sm:px-4 mb-4 bg-white dark:bg-neutral-700 rounded-lg rounded-t-lg border border-neutral-200 dark:border-neutral-600">
                  <label htmlFor="comment" className="sr-only">
                    Your comment
                  </label>
                  <textarea
                    id="comment"
                    name="comment"
                    value={formData.comment}
                    onChange={handleInputChange}
                    rows={4}
                    className="px-4 py-2 w-full text-sm text-neutral-900 dark:text-white border-0 focus:ring-0 focus:outline-none resize-none bg-transparent"
                    placeholder="Andika igitekerezo..."
                    required
                  />
                </div>

                {commentError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mb-3">{commentError}</p>
                )}
                {commentSuccess && (
                  <p className="text-sm text-green-600 dark:text-green-400 mb-3">Igitekerezo cyawe cyoherejwe!</p>
                )}

                <div className="flex justify-end">
                  <button
                    className="rounded-md focus:opacity-90 hover:opacity-95 transition duration-300 flex flex-nowrap text-center items-center py-2 px-4 text-base bg-red-700 hover:bg-red-800 text-white disabled:bg-neutral-400"
                    type="submit"
                    disabled={commentSubmitting}
                  >
                    {commentSubmitting ? 'Kohereza...' : 'Ohereza Igitekerezo'}
                  </button>
                </div>
              </form>

              {/* Comments List */}
              <ul className="flex flex-col gap-4 ml-2 my-2">
                {comments.map((comment) => renderCommentNode(comment))}
              </ul>

              <div className="mt-4 sm:mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/40">
                <div className="flex items-start gap-3" style={{ color: '#d01a00' }}>
                  <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm leading-6">
                    <span className="font-semibold">Umuburo! </span>
                    Ibitekerezo bitangwa mu bwisanzure n'ubwubahane, imvugo z'urwango no kutagira imyitwarire iboneye bihanwa n'amategeko y'ibihugu.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Related Articles - Same Category Stories - INKURU BIFITANYE ISANO */}
          <section className="mt-16 border-t border-neutral-200 dark:border-neutral-700 pt-12">
            <div className="mb-10">
              <div className="text-red-600 text-xs font-semibold tracking-widest mb-2">INKURU BIFITANYE ISANO</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {relatedLoading ? (
                <article className="group border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden bg-white dark:bg-neutral-900 hover:border-red-100 dark:hover:border-red-900/50 transition-colors">
                  <div className="overflow-hidden bg-neutral-100 dark:bg-neutral-800 h-48 flex items-center justify-center">
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">Inkuru ziri gushakishwa...</p>
                  </div>
                </article>
              ) : relatedArticles.length > 0 ? (
                relatedArticles.map((relatedArticle) => (
                  <article 
                    key={relatedArticle.slug}
                    onClick={() => router.push(`/article/${relatedArticle.slug}`)}
                    className="group border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden bg-white dark:bg-neutral-900 hover:border-red-100 dark:hover:border-red-900/50 transition-colors cursor-pointer hover:shadow-lg"
                  >
                      <div className="overflow-hidden bg-neutral-100 dark:bg-neutral-800 h-48">
                        <ArticleImage
                          src={relatedArticle.image}
                          alt={relatedArticle.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-sm text-neutral-900 dark:text-white line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-600 transition-colors mb-2">
                          {relatedArticle.title}
                        </h3>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                          {formatDateInKinyarwanda(relatedArticle.publishedAt)}
                        </p>
                      </div>
                    </article>
                  ))
              ) : (
                <article className="group border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden bg-white dark:bg-neutral-900">
                  <div className="overflow-hidden bg-neutral-100 dark:bg-neutral-800 h-48 flex items-center justify-center">
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">Inkuru (0) bifitanye isano</p>
                  </div>
                </article>
              )}
            </div>
          </section>

          {/* Most Viewed Articles - IZIKUNZWE CYANE */}
          <section className="mt-16 border-t border-neutral-200 dark:border-neutral-700 pt-12">
            <div className="mb-10">
              <div className="text-red-600 text-xs font-semibold tracking-widest mb-2">IZIKUNZWE CYANE</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {mostViewedLoading ? (
                <article className="group border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden bg-white dark:bg-neutral-900 hover:border-red-100 dark:hover:border-red-900/50 transition-colors">
                  <div className="overflow-hidden bg-neutral-100 dark:bg-neutral-800 h-48 flex items-center justify-center">
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">Inkuru ziri gushakishwa...</p>
                  </div>
                </article>
              ) : mostViewedArticles.length > 0 ? (
                mostViewedArticles.map((viewedArticle) => (
                  <article
                    key={viewedArticle.slug}
                    onClick={() => router.push(`/article/${viewedArticle.slug}`)}
                    className="group border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden bg-white dark:bg-neutral-900 hover:border-red-100 dark:hover:border-red-900/50 transition-colors cursor-pointer hover:shadow-lg"
                  >
                      <div className="overflow-hidden bg-neutral-100 dark:bg-neutral-800 h-48">
                        <ArticleImage
                          src={viewedArticle.image}
                          alt={viewedArticle.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-sm text-neutral-900 dark:text-white line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-600 transition-colors mb-2">
                          {viewedArticle.title}
                        </h3>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                          {formatDateInKinyarwanda(viewedArticle.publishedAt)}
                        </p>
                      </div>
                    </article>
                  ))
              ) : (
                <article className="group border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden bg-white dark:bg-neutral-900">
                  <div className="overflow-hidden bg-neutral-100 dark:bg-neutral-800 h-48 flex items-center justify-center">
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">Inkuru (0) bifitanye isano</p>
                  </div>
                </article>
              )}
            </div>
          </section>

          {/* Related Articles - Can be added later by fetching articles with same category */}
          </article>

          {/* Sidebar - Recent Stories - 1/3 width on desktop */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24">
              {/* Recent Stories Section - INKURU ZIHERUKA */}
              <section className="border-t border-neutral-200 dark:border-neutral-700 pt-12">
                <div className="mb-10">
                  <div className="text-red-600 text-xs font-semibold tracking-widest mb-2">INKURU ZIHERUKA</div>
                </div>
                <div className="grid grid-cols-1 gap-8">
                  {recentLoading ? (
                    <article className="group border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden bg-white dark:bg-neutral-900 hover:border-red-100 dark:hover:border-red-900/50 transition-colors">
                      <div className="overflow-hidden bg-neutral-100 dark:bg-neutral-800 h-48 flex items-center justify-center">
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm">Inkuru ziri gushakishwa...</p>
                      </div>
                    </article>
                  ) : recentArticles.length > 0 ? (
                    recentArticles.map((recentArticle) => (
                      <article 
                        key={recentArticle.slug}
                        onClick={() => router.push(`/article/${recentArticle.slug}`)}
                        className="group border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden bg-white dark:bg-neutral-900 hover:border-red-100 dark:hover:border-red-900/50 transition-colors cursor-pointer hover:shadow-lg"
                      >
                        <div className="overflow-hidden bg-neutral-100 dark:bg-neutral-800 h-32">
                          <ArticleImage
                            src={recentArticle.image}
                            alt={recentArticle.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-3">
                          <h3 className="font-semibold text-sm text-neutral-900 dark:text-white line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-600 transition-colors">
                            {recentArticle.title}
                          </h3>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                            {formatDateInKinyarwanda(recentArticle.publishedAt)}
                          </p>
                        </div>
                      </article>
                    ))
                  ) : (
                    <article className="group border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden bg-white dark:bg-neutral-900">
                      <div className="overflow-hidden bg-neutral-100 dark:bg-neutral-800 h-48 flex items-center justify-center">
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm">Inkuru (0) bifitanye isano</p>
                      </div>
                    </article>
                  )}
                </div>
              </section>

            </div>

              {/* Sidebar Advertisement */}
              {sidebarAdverts.length > 0 && (
                <div className="mt-8">
                  {sidebarAdverts.slice(0, 1).map((advert: any) => (
                    <a key={advert.id} href={advert.url || '#'} target="_blank" rel="noopener noreferrer" className="block group hover:opacity-90 transition-opacity">
                      <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden flex items-center justify-center border border-neutral-200 dark:border-neutral-700" style={{minHeight: '200px'}}>
                        <img src={advert.imageUrl} alt={advert.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    </a>
                  ))}
                </div>
              )}
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
