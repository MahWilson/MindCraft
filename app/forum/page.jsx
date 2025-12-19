"use client";
import React, { useEffect, useMemo, useState, memo, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowBigUp,
  ArrowBigDown,
  BadgeCheck,
  Filter,
  MessageSquare,
  Pin,
  Plus,
  ShieldCheck,
  Sparkles,
  Tag,
  Unlock,
  Lock,
  Wand2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { ImageGallery } from '@/components/ui/image-gallery';
import { timeAgo, roleFlair } from '@/lib/utils';
import { db } from '@/firebase';
import { collection, onSnapshot, orderBy, query, serverTimestamp, addDoc, doc, getDoc, updateDoc, deleteDoc, deleteField } from 'firebase/firestore';
import { storage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });

const TAG_OPTIONS = ['JavaScript', 'Bug', 'Exam', 'Help', 'React', 'Project', 'Idea', 'UI'];
const SORT_OPTIONS = [
  { value: 'new', label: 'Newest' },
  { value: 'active', label: 'Most Active' },
  { value: 'unanswered', label: 'Unanswered' },
];
const MOD_ROLES = ['admin', 'teacher', 'instructor'];

const STATUS_LABELS = {
  unanswered: 'Unanswered',
  in_progress: 'In progress',
  solved: 'Solved',
};

export default function ForumPage() {
  const { user, userData } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [sortBy, setSortBy] = useState('new');
  const [files, setFiles] = useState([]);
  const [tags, setTags] = useState([]);
  const [filterTags, setFilterTags] = useState([]);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [similarResults, setSimilarResults] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const isModerator = MOD_ROLES.includes(userData?.role);

  // Lock body scroll when composer is open
  useEffect(() => {
    if (isComposerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isComposerOpen]);

  useEffect(() => {
    const q = query(collection(db, 'post'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const pinned = rows.filter((p) => !!p.isPinned);
      const others = rows.filter((p) => !p.isPinned);
      setPosts([...pinned, ...others]);
      setIsFetching(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = newPost.title?.trim();
    if (!q || q.length < 3) {
      setSimilarResults([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        setSimilarLoading(true);
        const res = await fetch('/api/forum/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, limit: 8 }),
        });
        if (!res.ok) throw new Error('analyze failed');
        const data = await res.json();
        if (!cancelled) setSimilarResults(data.results || []);
      } catch {
        if (!cancelled) setSimilarResults([]);
      } finally {
        if (!cancelled) setSimilarLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [newPost.title]);

  const sortedPosts = useMemo(() => {
    const byTag = (x) => {
      if (!filterTags.length) return true;
      const ts = Array.isArray(x.tags) ? x.tags : [];
      return filterTags.some((ft) => ts.includes(ft));
    };
    const answered = (p) => Array.isArray(p.replies) && p.replies.some((r) => MOD_ROLES.includes(r.role));
    const pinned = posts.filter((p) => p.isPinned && byTag(p));
    let list = posts.filter((p) => !p.isPinned && byTag(p));
    if (sortBy === 'unanswered') {
      list = list.filter((p) => !(Array.isArray(p.replies) && p.replies.length > 0));
    }
    list.sort((a, b) => {
      if (sortBy === 'active') {
        const ra = Array.isArray(a.replies) ? a.replies.length : 0;
        const rb = Array.isArray(b.replies) ? b.replies.length : 0;
        if (rb !== ra) return rb - ra;
      }
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
      return tb - ta;
    });
    pinned.sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
      return tb - ta;
    });
    return [...pinned, ...list].map((p) => ({
      ...p,
      isAnswered: answered(p),
      resolutionStatus: p.resolutionStatus || (answered(p) ? 'in_progress' : 'unanswered'),
    }));
  }, [posts, sortBy, filterTags]);

  const uploadImages = useCallback(async (files) => {
    const imageUrls = [];
    for (const file of files) {
      try {
        const key = `posts/${user.uid}/${Date.now()}_${file.name}`;
        const r = ref(storage, key);
        await uploadBytes(r, file);
        const url = await getDownloadURL(r);
        imageUrls.push(url);
      } catch (error) {
        console.error('Image upload failed:', error);
        alert(`Failed to upload ${file.name}`);
      }
    }
    return imageUrls;
  }, [user]);

  const createPostFallback = useCallback(async (postData) => {
    try {
      await addDoc(collection(db, 'post'), {
        ...postData,
        createdAt: serverTimestamp(),
        isPinned: false,
        isLocked: false,
        reactions: {},
        votes: {},
        score: 0,
        replies: [],
      });
      return true;
    } catch (error) {
      console.error('Fallback post creation failed:', error);
      return false;
    }
  }, []);

  const handleCreate = useCallback(async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      alert('Please provide a title and content');
      return;
    }
    if (!user) {
      alert('Please sign in');
      return;
    }
    
    setLoading(true);
    try {
      const imageUrls = await uploadImages(files);
      const postData = {
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        role: userData?.role || 'student',
        images: imageUrls,
        tags,
      };

      const res = await fetch('/api/forum/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.fallback) {
          const success = await createPostFallback(postData);
          if (!success) throw new Error('Failed to create post');
        }
      } else {
        const success = await createPostFallback(postData);
        if (!success) throw new Error('Failed to create post');
      }

      // Optimistic UI reset
      setNewPost({ title: '', content: '' });
      setFiles([]);
      setTags([]);
      setComposerOpen(false);
      setShowPreview(false);
      // alert('Post created successfully'); // removed success alert to reduce annoyance
    } catch (error) {
      console.error('Post creation failed:', error);
      const success = await createPostFallback({
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        role: userData?.role || 'student',
        images: [],
        tags,
      });
      
      if (success) {
        setNewPost({ title: '', content: '' });
        setFiles([]);
        setTags([]);
        setComposerOpen(false);
        setShowPreview(false);
      } else {
        alert('Failed to create post. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [newPost, files, tags, user, userData, uploadImages, createPostFallback]);

  const handlePin = useCallback(async (post) => {
    if (!user) {
      alert('Please sign in');
      return;
    }
    if (!isModerator) {
      alert('Only teachers/admins can pin posts');
      return;
    }

    try {
      const res = await fetch('/api/forum/pin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, userId: user.uid, userRole: userData?.role }),
      });

      if (!res.ok) {
        const pRef = doc(db, 'post', post.id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) {
          alert('Post not found');
          return;
        }
        const current = !!snap.data().isPinned;
        await updateDoc(pRef, { isPinned: !current });
      }
    } catch (error) {
      console.error('Pin operation failed:', error);
      try {
        const pRef = doc(db, 'post', post.id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) {
          alert('Post not found');
          return;
        }
        const current = !!snap.data().isPinned;
        await updateDoc(pRef, { isPinned: !current });
      } catch (fallbackError) {
        alert('Failed to pin/unpin post');
      }
    }
  }, [user, isModerator, userData]);

  const handleLock = useCallback(async (post) => {
    if (!user) {
      alert('Please sign in');
      return;
    }
    if (!isModerator) {
      alert('Only teachers/admins can lock posts');
      return;
    }

    try {
      const res = await fetch('/api/forum/lock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, userId: user.uid, userRole: userData?.role }),
      });

      if (!res.ok) {
        const pRef = doc(db, 'post', post.id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) {
          alert('Post not found');
          return;
        }
        const current = !!snap.data().isLocked;
        await updateDoc(pRef, { isLocked: !current });
      }
    } catch (error) {
      console.error('Lock operation failed:', error);
      try {
        const pRef = doc(db, 'post', post.id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) {
          alert('Post not found');
          return;
        }
        const current = !!snap.data().isLocked;
        await updateDoc(pRef, { isLocked: !current });
      } catch (fallbackError) {
        alert('Failed to lock/unlock post');
      }
    }
  }, [user, isModerator, userData]);

  const handleDelete = useCallback(async (post) => {
    if (!user) {
      alert('Please sign in');
      return;
    }
    if (!confirm('Delete this post?')) return;
    
    const isOwner = post.authorId === user.uid;
    if (!isModerator && !isOwner) {
      alert('Only teachers/admins or the post author can delete');
      return;
    }

    try {
      const res = await fetch('/api/forum/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, userId: user.uid, userRole: userData?.role, reason: '' }),
      });

      if (!res.ok) {
        const pRef = doc(db, 'post', post.id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) {
          alert('Post not found');
          return;
        }
        
        await addDoc(collection(db, 'audit_log'), {
          action: 'DELETE_POST',
          postId: post.id,
          deletedContent: snap.data(),
          deletedBy: user.uid,
          reason: '',
          timeStamp: serverTimestamp(),
          replyId: '',
        });
        await deleteDoc(pRef);
      }
      
      // alert('Post deleted successfully');
    } catch (error) {
      console.error('Delete operation failed:', error);
      try {
        const pRef = doc(db, 'post', post.id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) {
          alert('Post not found');
          return;
        }
        
        await addDoc(collection(db, 'audit_log'), {
          action: 'DELETE_POST',
          postId: post.id,
          deletedContent: snap.data(),
          deletedBy: user.uid,
          reason: '',
          timeStamp: serverTimestamp(),
          replyId: '',
        });
        await deleteDoc(pRef);
      } catch (fallbackError) {
        alert('Failed to delete post');
      }
    }
  }, [user, isModerator, userData]);

  const handleReact = useCallback(async (post, emoji) => {
    if (!user) {
      alert('Please sign in');
      return;
    }

    try {
      const res = await fetch('/api/forum/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, userId: user.uid, emoji }),
      });

      if (!res.ok) {
        const pRef = doc(db, 'post', post.id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) {
          alert('Post not found');
          return;
        }
        const current = snap.data().reactions?.[user.uid] || null;
        if (current === emoji) {
          await updateDoc(pRef, { [`reactions.${user.uid}`]: deleteField() });
        } else {
          await updateDoc(pRef, { [`reactions.${user.uid}`]: emoji });
        }
      }
    } catch (error) {
      console.error('Reaction failed:', error);
      try {
        const pRef = doc(db, 'post', post.id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) {
          alert('Post not found');
          return;
        }
        const current = snap.data().reactions?.[user.uid] || null;
        if (current === emoji) {
          await updateDoc(pRef, { [`reactions.${user.uid}`]: deleteField() });
        } else {
          await updateDoc(pRef, { [`reactions.${user.uid}`]: emoji });
        }
      } catch (fallbackError) {
        alert('Failed to add reaction');
      }
    }
  }, [user]);

  const handleVote = useCallback(async (post, voteType) => {
    if (!user) {
      alert('Please sign in');
      return;
    }

    try {
      const res = await fetch('/api/forum/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, userId: user.uid, voteType }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.fallback) {
          const pRef = doc(db, 'post', post.id);
          const snap = await getDoc(pRef);
          if (!snap.exists()) {
            alert('Post not found');
            return;
          }
          
          const postData = snap.data();
          const votes = { ...(postData.votes || {}) };
          const current = votes[user.uid];
          let delta = 0;
          
          if (current === voteType) {
            delete votes[user.uid];
            delta = voteType === 'upvote' ? -1 : 1;
          } else if (current) {
            votes[user.uid] = voteType;
            delta = voteType === 'upvote' ? 2 : -2;
          } else {
            votes[user.uid] = voteType;
            delta = voteType === 'upvote' ? 1 : -1;
          }
          
          await updateDoc(pRef, { votes, score: (postData.score || 0) + delta });
        }
      } else {
        const pRef = doc(db, 'post', post.id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) {
          alert('Post not found');
          return;
        }
        
        const postData = snap.data();
        const votes = { ...(postData.votes || {}) };
        const current = votes[user.uid];
        let delta = 0;
        
        if (current === voteType) {
          delete votes[user.uid];
          delta = voteType === 'upvote' ? -1 : 1;
        } else if (current) {
          votes[user.uid] = voteType;
          delta = voteType === 'upvote' ? 2 : -2;
        } else {
          votes[user.uid] = voteType;
          delta = voteType === 'upvote' ? 1 : -1;
        }
        
        await updateDoc(pRef, { votes, score: (postData.score || 0) + delta });
      }
    } catch (error) {
      console.error('Vote failed:', error);
      try {
        const pRef = doc(db, 'post', post.id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) {
          alert('Post not found');
          return;
        }
        
        const data = snap.data();
        const votes = { ...(data.votes || {}) };
        const current = votes[user.uid];
        let delta = 0;
        
        if (current === voteType) {
          delete votes[user.uid];
          delta = voteType === 'upvote' ? -1 : 1;
        } else if (current) {
          votes[user.uid] = voteType;
          delta = voteType === 'upvote' ? 2 : -2;
        } else {
          votes[user.uid] = voteType;
          delta = voteType === 'upvote' ? 1 : -1;
        }
        
        await updateDoc(pRef, { votes, score: (data.score || 0) + delta });
      } catch (fallbackError) {
        alert('Failed to vote');
      }
    }
  }, [user]);

  const emptyState = !isFetching && sortedPosts.length === 0;

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-900">
      <div className="max-w-5xl mx-auto py-10 px-4 space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.12em] text-slate-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" /> Course Forum
            </p>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Threaded discussions</h1>
            <p className="text-slate-600 dark:text-slate-300">Ask questions, share fixes, and learn from instructors.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setFilterTags([])}>
              <Filter className="w-4 h-4" /> Clear filters
            </Button>
            <Button className="gap-2" onClick={() => setComposerOpen(true)}>
              <Plus className="w-4 h-4" /> New post
            </Button>
          </div>
        </header>

        <Card className="p-4 flex flex-wrap items-center gap-3 border border-slate-200 bg-white/70 dark:bg-slate-800/80">
          <div className="flex gap-2">
            {SORT_OPTIONS.map((s) => (
              <Button
                key={s.value}
                size="sm"
                variant={sortBy === s.value ? 'default' : 'outline'}
                onClick={() => setSortBy(s.value)}
                className="rounded-full"
              >
                {s.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <Tag className="w-4 h-4 text-slate-500" />
            {TAG_OPTIONS.map((t) => {
              const active = filterTags.includes(t);
              return (
                <Button
                  key={t}
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  className="rounded-full text-xs"
                  onClick={() => setFilterTags((ft) => (ft.includes(t) ? ft.filter((x) => x !== t) : [...ft, t]))}
                >
                  #{t}
                </Button>
              );
            })}
          </div>
        </Card>

        <section className="space-y-3">
          {isFetching && (
            <>
              <SkeletonPostCard />
              <SkeletonPostCard />
            </>
          )}
          {sortedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              user={user}
              isModerator={isModerator}
              onVote={handleVote}
              onReact={handleReact}
              onPin={handlePin}
              onLock={handleLock}
              onDelete={handleDelete}
            />
          ))}
          {emptyState && <EmptyState />}
        </section>
      </div>

      {isComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
          <div className="w-full max-w-4xl">
            <Card className="p-6 shadow-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase text-slate-500 tracking-[0.12em]">Create post</p>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Share your question or insight</h3>
                </div>
                <Button variant="ghost" onClick={() => setComposerOpen(false)}>Close</Button>
              </div>
              
              {/* Inline guidance */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">How to ask a good question:</p>
                <ul className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 space-y-0.5">
                  <li>• Include: code snippet, error message, what you tried</li>
                  <li>• Be specific about your problem and expected outcome</li>
                  <li>• Add relevant tags to help others find your question</li>
                </ul>
              </div>
              <div className="grid gap-4 md:grid-cols-[2fr_1.2fr]">
                <div className="space-y-3">
                  <Input
                    placeholder="Clear, concise title (e.g., 'Fixing debounce in React custom hook')"
                    value={newPost.title}
                    onChange={(e) => setNewPost((p) => ({ ...p, title: e.target.value }))}
                  />
                  <div className="flex gap-2 flex-wrap">
                    {TAG_OPTIONS.map((t) => {
                      const active = tags.includes(t);
                      return (
                        <Button
                          key={t}
                          size="sm"
                          variant={active ? 'default' : 'outline'}
                          className="rounded-full text-xs"
                          onClick={() => setTags((ft) => (ft.includes(t) ? ft.filter((x) => x !== t) : [...ft, t]))}
                        >
                          #{t}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <BadgeCheck className="w-4 h-4 text-indigo-500" />
                      Markdown supported — use ``` for code
                    </div>
                    <Button variant="ghost" size="sm" className="gap-2" onClick={() => setShowPreview((p) => !p)}>
                      <Wand2 className="w-4 h-4" />
                      {showPreview ? 'Edit' : 'Preview'}
                    </Button>
                  </div>
                  {!showPreview ? (
                    <Textarea
                      rows={10}
                      placeholder="Describe your problem in detail:\n\n• What are you trying to achieve?\n• What have you tried so far?\n• What error are you getting?\n• Include relevant code snippets\n\nUse ``` for code blocks and be specific!"
                      value={newPost.content}
                      onChange={(e) => setNewPost((p) => ({ ...p, content: e.target.value }))}
                      className="font-mono text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900 prose prose-slate dark:prose-invert max-w-none min-h-[240px]">
                      <ReactMarkdown>{newPost.content || '_Nothing to preview yet_'}</ReactMarkdown>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                    {files.length > 0 && (
                      <div className="text-xs text-slate-500">{files.length} attachment{files.length > 1 ? 's' : ''}</div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setComposerOpen(false); setShowPreview(false); }}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={loading}>
                      {loading ? 'Posting...' : 'Post discussion'}
                    </Button>
                  </div>
                </div>
                <div className="border-l border-slate-200 dark:border-slate-800 pl-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Similar questions</p>
                    {similarLoading && <span className="text-[10px] text-slate-500">Searching…</span>}
                  </div>
                  {(!similarResults || similarResults.length === 0) && !similarLoading && (
                    <p className="text-xs text-slate-500">Start typing a clear title to see existing related threads.</p>
                  )}
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {similarResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full text-left rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        onClick={() => window.open(`/forum/${item.id}`, '_blank')}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-200 line-clamp-1">
                            {item.title}
                          </span>
                          <ResolutionBadgeSmall status={item.resolutionStatus} />
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{item.snippet}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Array.isArray(item.tags) &&
                            item.tags.map((t) => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                #{t}
                              </span>
                            ))}
                          {item.hasInstructorReply && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Instructor replied
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

const MetaRow = memo(function MetaRow({ post }) {
  const role = roleFlair(post.role);
  return (
    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
      <div className="flex items-center gap-2 min-w-0">
        <Avatar name={post.authorName} className="w-5 h-5 flex-shrink-0" />
        <span className="truncate font-medium text-slate-700 dark:text-slate-200">{post.authorName || 'Anonymous'}</span>
        <Badge variant={role.variant} className="text-[10px]">{role.emoji} {role.label}</Badge>
        {post.context && <Badge variant="outline" className="text-[10px]">{post.context}</Badge>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span>{timeAgo(post.createdAt)}</span>
        <ResolutionBadgeSmall status={post.resolutionStatus} />
      </div>
    </div>
  );
});

const StatusBadges = memo(function StatusBadges({ post, instructorReplied }) {
  return (
    <div className="flex flex-wrap gap-1">
      {post.isPinned && <Badge variant="secondary" className="text-[10px] gap-1"><Pin className="w-3 h-3" /> Pinned</Badge>}
      {post.isLocked && <Badge variant="warning" className="text-[10px] gap-1"><Lock className="w-3 h-3" /> Locked</Badge>}
      {instructorReplied && <Badge variant="success" className="text-[10px] gap-1"><ShieldCheck className="w-3 h-3" /> Instructor replied</Badge>}
    </div>
  );
});

const ActionRow = memo(function ActionRow({ post, replyCount, reactionCount, isModerator, user, onReact, onPin, onLock, onDelete }) {
  return (
    <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700 text-[11px] md:text-xs text-slate-600">
      <Link href={`/forum/${post.id}`} className="inline-flex items-center gap-1 hover:text-indigo-600">
        <MessageSquare className="w-3 h-3" /> {replyCount} comment{replyCount !== 1 ? 's' : ''}
      </Link>
      <div className="flex items-center gap-1">
        {['👍', '❤️', '🎉', '🤔', '👀'].map((emoji) => {
          const count = reactionCount(emoji);
          return (
            <button key={emoji} onClick={() => onReact(post, emoji)} className="px-1.5 py-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px]">
              {emoji} {count > 0 && count}
            </button>
          );
        })}
      </div>
      <Link href={`/forum/${post.id}`} className="hover:text-indigo-600">Open</Link>
      <div className="ml-auto flex items-center gap-1">
        {isModerator && (
          <>
            <button onClick={() => onPin(post)} className="hover:text-indigo-600 text-[11px] px-1 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
              {post.isPinned ? 'Unpin' : 'Pin'}
            </button>
            <button onClick={() => onLock(post)} className="hover:text-indigo-600 text-[11px] px-1 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
              {post.isLocked ? 'Unlock' : 'Lock'}
            </button>
          </>
        )}
        {(isModerator || post.authorId === user?.uid) && (
          <button onClick={() => onDelete(post)} className="text-red-600 hover:text-red-700 text-[11px] px-1 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
            Delete
          </button>
        )}
      </div>
    </div>
  );
});

const PostCard = memo(function PostCard({ post, user, isModerator, onVote, onReact, onPin, onLock, onDelete }) {
  const replyCount = Array.isArray(post.replies) ? post.replies.length : 0;
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const reactions = post.reactions || {};
  const reactionCount = useCallback((emoji) => Object.values(reactions).filter((e) => e === emoji).length, [reactions]);
  const instructorReplied = post.isAnswered;
  
  // Check if post contains code
  const hasCode = post.content && post.content.includes('```');
  const codeMatch = hasCode ? post.content.match(/```(\w*)\n?([\s\S]*?)\n?```/) : null;
  const codeLang = codeMatch ? codeMatch[1] || 'code' : 'code';
  const codeSnippet = codeMatch ? codeMatch[2].split('\n')[0].slice(0, 50) + '...' : '';
  
  // Get plain text preview (remove markdown)
  const plainTextPreview = post.content
    ?.replace(/```[\s\S]*?```/g, '')
    ?.replace(/`[^`]*`/g, '')
    ?.replace(/!\[.*?\]\(.*?\)/g, '')
    ?.replace(/\[.*?\]\(.*?\)/g, '')
    ?.replace(/[#*~_>]/g, '')
    ?.trim() || '';

  return (
    <Card className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all duration-150 group">
      <div className="grid grid-cols-[56px,minmax(0,1fr)]">
        <aside className="flex flex-col items-center justify-center gap-1 border-r border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 py-3">
          <button 
            onClick={() => onVote(post, 'upvote')} 
            className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Upvote"
          >
            <ArrowBigUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
          <div className="h-1 w-1 rounded-full bg-slate-400/70" />
          <button 
            onClick={() => onVote(post, 'downvote')} 
            className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Downvote"
          >
            <ArrowBigDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
        </aside>

        <main className="p-4 space-y-2">
          <MetaRow post={post} />

          <Link href={`/forum/${post.id}`} className="block text-sm md:text-base font-semibold text-slate-900 dark:text-white hover:text-indigo-600 line-clamp-2">
            {post.title}
          </Link>

          <p className="text-xs md:text-sm text-slate-700 dark:text-slate-200 line-clamp-2">
            {plainTextPreview}
          </p>

          {hasCode && (
            <div className="inline-flex items-center rounded bg-slate-900 text-slate-100 text-[11px] px-2 py-1 font-mono">
              <span className="opacity-70 mr-1">{codeLang}</span>
              <span className="line-clamp-1">{codeSnippet}</span>
            </div>
          )}

          <StatusBadges post={post} instructorReplied={instructorReplied} />

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {tags.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300">
                  #{t}
                </span>
              ))}
            </div>
          )}

          <ActionRow post={post} replyCount={replyCount} reactionCount={reactionCount} isModerator={isModerator} user={user} onReact={onReact} onPin={onPin} onLock={onLock} onDelete={onDelete} />
        </main>
      </div>
    </Card>
  );
});

function IconPill({ icon, onClick, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition bg-white dark:bg-slate-800"
    >
      {icon}
    </button>
  );
}

function ResolutionBadgeSmall({ status }) {
  const s = status || 'unanswered';
  const label = STATUS_LABELS[s] || 'Unanswered';
  if (s === 'solved') {
    return <Badge variant="success" className="gap-1 text-[10px] px-2 py-0.5">Solved</Badge>;
  }
  if (s === 'in_progress') {
    return <Badge variant="secondary" className="gap-1 text-[10px] px-2 py-0.5">In progress</Badge>;
  }
  return <Badge variant="outline" className="gap-1 text-[10px] px-2 py-0.5">Unanswered</Badge>;
}

function SkeletonPostCard() {
  return (
    <Card className="rounded-xl border border-slate-200 bg-white/60 animate-pulse">
      <div className="grid grid-cols-[56px,minmax(0,1fr)]">
        {/* Vote Rail Skeleton */}
        <aside className="flex flex-col items-center justify-center gap-1 border-r border-slate-100 bg-slate-50/80 py-3">
          <div className="w-4 h-4 bg-slate-200 rounded-full" />
          <div className="h-1 w-1 rounded-full bg-slate-300" />
          <div className="w-4 h-4 bg-slate-200 rounded-full" />
        </aside>
        
        {/* Content Skeleton */}
        <main className="p-4 space-y-2">
          {/* Meta Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-slate-200 rounded-full" />
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-3 w-12 bg-slate-200 rounded" />
            </div>
            <div className="h-3 w-20 bg-slate-200 rounded" />
          </div>
          
          {/* Title */}
          <div className="h-4 w-3/4 bg-slate-200 rounded" />
          
          {/* Content Preview */}
          <div className="space-y-1">
            <div className="h-3 w-full bg-slate-200 rounded" />
            <div className="h-3 w-5/6 bg-slate-200 rounded" />
          </div>
          
          {/* Tags */}
          <div className="flex gap-1">
            <div className="h-4 w-12 bg-slate-200 rounded-full" />
            <div className="h-4 w-16 bg-slate-200 rounded-full" />
          </div>
          
          {/* Action Row */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <div className="h-3 w-16 bg-slate-200 rounded" />
            <div className="h-3 w-12 bg-slate-200 rounded" />
            <div className="h-3 w-8 bg-slate-200 rounded" />
          </div>
        </main>
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="rounded-xl border-2 border-dashed border-slate-200 bg-white/60 p-8">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500">
          <MessageSquare className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No posts yet</h3>
          <p className="text-slate-600 dark:text-slate-400">Be the first to ask a question or share a solution.</p>
        </div>
        
        {/* How to ask a good question tips */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-left max-w-md mx-auto">
          <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2">How to ask a good question:</h4>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 mt-0.5">•</span>
              <span>Include a clear, specific title</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 mt-0.5">•</span>
              <span>Describe what you've tried</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 mt-0.5">•</span>
              <span>Add relevant code snippets</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 mt-0.5">•</span>
              <span>Include error messages if any</span>
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
}