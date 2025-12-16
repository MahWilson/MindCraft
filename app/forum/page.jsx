"use client";
import React, { useEffect, useMemo, useState } from 'react';
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

  const handleCreate = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return alert('Please provide a title and content');
    if (!user) return alert('Please sign in');
    setLoading(true);
    try {
      const imageUrls = [];
      for (const file of files) {
        const key = `posts/${user.uid}/${Date.now()}_${file.name}`;
        const r = ref(storage, key);
        await uploadBytes(r, file);
        const url = await getDownloadURL(r);
        imageUrls.push(url);
      }
      const res = await fetch('/api/forum/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPost.title,
          content: newPost.content,
          authorId: user.uid,
          authorName: user.displayName || 'Anonymous',
          role: userData?.role || 'student',
          images: imageUrls,
          tags,
        }),
      });
      if (!res.ok) {
        await addDoc(collection(db, 'post'), {
          title: newPost.title,
          content: newPost.content,
          authorId: user.uid,
          authorName: user.displayName || 'Anonymous',
          role: userData?.role || 'student',
          createdAt: serverTimestamp(),
          isPinned: false,
          isLocked: false,
          reactions: {},
          votes: {},
          score: 0,
          replies: [],
          images: imageUrls,
          tags,
        });
      }
      setNewPost({ title: '', content: '' });
      setFiles([]);
      setTags([]);
      setComposerOpen(false);
      setShowPreview(false);
    } catch (err) {
      await addDoc(collection(db, 'post'), {
        title: newPost.title,
        content: newPost.content,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        role: userData?.role || 'student',
        createdAt: serverTimestamp(),
        isPinned: false,
        isLocked: false,
        reactions: {},
        votes: {},
        score: 0,
        replies: [],
        images: [],
        tags,
      });
      setNewPost({ title: '', content: '' });
      setFiles([]);
      setTags([]);
      setComposerOpen(false);
      setShowPreview(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePin = async (post) => {
    if (!user) return alert('Please sign in');
    if (!isModerator) return alert('Only teachers/admins can pin');
    try {
      const res = await fetch('/api/forum/pin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, userId: user.uid, userRole: userData?.role }),
      });
      if (!res.ok) {
        const pRef = doc(db, 'post', post.id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) return;
        const current = !!snap.data().isPinned;
        await updateDoc(pRef, { isPinned: !current });
      }
    } catch (err) {
      const pRef = doc(db, 'post', post.id);
      const snap = await getDoc(pRef);
      if (!snap.exists()) return;
      const current = !!snap.data().isPinned;
      await updateDoc(pRef, { isPinned: !current });
    }
  };

  const handleLock = async (post) => {
    if (!user) return alert('Please sign in');
    if (!isModerator) return alert('Only teachers/admins can lock');
    try {
      const res = await fetch('/api/forum/lock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, userId: user.uid, userRole: userData?.role }),
      });
      if (!res.ok) {
        const pRef = doc(db, 'post', post.id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) return;
        const current = !!snap.data().isLocked;
        await updateDoc(pRef, { isLocked: !current });
      }
    } catch {
      const pRef = doc(db, 'post', post.id);
      const snap = await getDoc(pRef);
      if (!snap.exists()) return;
      const current = !!snap.data().isLocked;
      await updateDoc(pRef, { isLocked: !current });
    }
  };

  const handleDelete = async (post) => {
    if (!user) return alert('Please sign in');
    if (!confirm('Delete this post?')) return;
    const isOwner = post.authorId === user.uid;
    if (!isModerator && !isOwner) return alert('Only teachers/admins or the post author can delete');
    try {
      const res = await fetch('/api/forum/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, userId: user.uid, userRole: userData?.role, reason: '' }),
      });
      if (!res.ok) {
        const pRef = doc(db, 'post', post.id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) return;
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
    } catch (err) {
      const pRef = doc(db, 'post', post.id);
      const snap = await getDoc(pRef);
      if (!snap.exists()) return;
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
  };

  const handleReact = async (post, emoji) => {
    if (!user) return alert('Please sign in');
    try {
      const res = await fetch('/api/forum/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, userId: user.uid, emoji }),
      });
      if (!res.ok) {
        const pRef = doc(db, 'post', post.id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) return;
        const current = snap.data().reactions?.[user.uid] || null;
        if (current === emoji) await updateDoc(pRef, { [`reactions.${user.uid}`]: deleteField() });
        else await updateDoc(pRef, { [`reactions.${user.uid}`]: emoji });
      }
    } catch (err) {
      const pRef = doc(db, 'post', post.id);
      const snap = await getDoc(pRef);
      if (!snap.exists()) return;
      const current = snap.data().reactions?.[user.uid] || null;
      if (current === emoji) await updateDoc(pRef, { [`reactions.${user.uid}`]: deleteField() });
      else await updateDoc(pRef, { [`reactions.${user.uid}`]: emoji });
    }
  };

  const handleVote = async (post, voteType) => {
    if (!user) return alert('Please sign in');
    try {
      const res = await fetch('/api/forum/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, userId: user.uid, voteType }),
      });
      if (!res.ok) {
        const pRef = doc(db, 'post', post.id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) return;
        const data = snap.data();
        const votes = { ...(data.votes || {}) };
        const current = votes[user.uid];
        let delta = 0;
        if (current === voteType) { delete votes[user.uid]; delta = voteType === 'upvote' ? -1 : 1; }
        else if (current) { votes[user.uid] = voteType; delta = voteType === 'upvote' ? 2 : -2; }
        else { votes[user.uid] = voteType; delta = voteType === 'upvote' ? 1 : -1; }
        await updateDoc(pRef, { votes, score: (data.score || 0) + delta });
      }
    } catch (err) {
      const pRef = doc(db, 'post', post.id);
      const snap = await getDoc(pRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const votes = { ...(data.votes || {}) };
      const current = votes[user.uid];
      let delta = 0;
      if (current === voteType) { delete votes[user.uid]; delta = voteType === 'upvote' ? -1 : 1; }
      else if (current) { votes[user.uid] = voteType; delta = voteType === 'upvote' ? 2 : -2; }
      else { votes[user.uid] = voteType; delta = voteType === 'upvote' ? 1 : -1; }
      await updateDoc(pRef, { votes, score: (data.score || 0) + delta });
    }
  };

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur">
          <div className="w-full max-w-4xl">
            <Card className="p-6 shadow-2xl bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase text-slate-500 tracking-[0.12em]">Create post</p>
                  <h3 className="text-xl font-semibold">Share your question or insight</h3>
                </div>
                <Button variant="ghost" onClick={() => setComposerOpen(false)}>Close</Button>
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
                      rows={8}
                      placeholder="Describe the problem, share code blocks, and what you tried..."
                      value={newPost.content}
                      onChange={(e) => setNewPost((p) => ({ ...p, content: e.target.value }))}
                      className="font-mono"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800 prose prose-slate max-w-none">
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

function PostCard({ post, user, isModerator, onVote, onReact, onPin, onLock, onDelete }) {
  const replyCount = Array.isArray(post.replies) ? post.replies.length : 0;
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const reactions = post.reactions || {};
  const reactionCount = (emoji) => Object.values(reactions).filter((e) => e === emoji).length;
  const instructorReplied = post.isAnswered;
  return (
    <Card className="p-0 overflow-hidden border border-slate-200 bg-white/80 dark:bg-slate-800/80">
      <div className="grid grid-cols-[64px_1fr]">
        <div className="flex flex-col items-center gap-2 border-r border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 py-4">
          <IconPill icon={<ArrowBigUp className="w-5 h-5" />} label="Upvote" onClick={() => onVote(post, 'upvote')} />
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Vote</div>
          <IconPill icon={<ArrowBigDown className="w-5 h-5" />} label="Downvote" onClick={() => onVote(post, 'downvote')} />
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {post.isPinned && (
                  <Badge variant="secondary" className="gap-1">
                    <Pin className="w-3 h-3" /> Pinned
                  </Badge>
                )}
                {post.isLocked && (
                  <Badge variant="warning" className="gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </Badge>
                )}
                <ResolutionBadgeSmall status={post.resolutionStatus} />
                {instructorReplied && (
                  <Badge variant="success" className="gap-1">
                    <ShieldCheck className="w-3 h-3" /> Instructor replied
                  </Badge>
                )}
              </div>
              <Link href={`/forum/${post.id}`} className="text-xl font-semibold text-slate-900 dark:text-white hover:text-indigo-600">
                {post.title}
              </Link>
              <p className="text-slate-700 dark:text-slate-200 line-clamp-3">{post.content}</p>
              {Array.isArray(post.images) && post.images.length > 0 && (
                <ImageGallery images={post.images} />
              )}
              {tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {tags.map((t) => (
                    <Badge key={t} variant="outline" className="rounded-full">#{t}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <Avatar name={post.authorName} className="w-8 h-8" />
                <div className="text-right">
                  <div className="text-slate-900 dark:text-white font-medium">{post.authorName || 'Anonymous'}</div>
                  <div className="flex items-center gap-2 text-xs">
                    {(() => { const f = roleFlair(post.role); return (<Badge variant={f.variant}>{f.emoji} {f.label}</Badge>); })()}
                    <span>{timeAgo(post.createdAt)}</span>
                  </div>
                </div>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700 text-sm">
            <Link href={`/forum/${post.id}`} className="flex items-center gap-1 text-slate-600 hover:text-indigo-600">
              <MessageSquare className="w-4 h-4" /> {replyCount} comment{replyCount !== 1 ? 's' : ''}
            </Link>
            <div className="flex items-center gap-1 text-slate-600">
              {['👍', '❤️', '🎉', '🤔', '👀'].map((emoji) => (
                <button key={emoji} onClick={() => onReact(post, emoji)} className="px-2 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                  {emoji} {reactionCount(emoji)}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {isModerator && (
                <>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => onPin(post)}>
                    <Pin className="w-4 h-4" /> {post.isPinned ? 'Unpin' : 'Pin'}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => onLock(post)}>
                    {post.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />} {post.isLocked ? 'Unlock' : 'Lock'}
                  </Button>
                </>
              )}
              {(isModerator || post.authorId === user?.uid) && (
                <Button size="sm" variant="destructive" onClick={() => onDelete(post)}>Delete</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

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
    <Card className="p-5 border border-slate-200 bg-white/60 animate-pulse">
      <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
      <div className="h-5 w-3/4 bg-slate-200 rounded mb-3" />
      <div className="h-3 w-full bg-slate-200 rounded mb-1" />
      <div className="h-3 w-5/6 bg-slate-200 rounded" />
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="p-10 text-center border-dashed border-2 border-slate-200 bg-white/60">
      <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 mb-3">
        <MessageSquare className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">No posts yet</h3>
      <p className="text-slate-600">Be the first to ask a question or share a solution.</p>
    </Card>
  );
}
