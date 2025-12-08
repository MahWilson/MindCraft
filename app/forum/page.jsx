"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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

export default function ForumPage() {
  const { user, userData } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('new'); // 'new' | 'top'
  const [timeRange, setTimeRange] = useState('all'); // 'all' | 'week' | 'month'
  const [files, setFiles] = useState([]);
  const [tags, setTags] = useState([]);
  const [filterTags, setFilterTags] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'post'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const pinned = rows.filter((p) => !!p.isPinned);
      const others = rows.filter((p) => !p.isPinned);
      setPosts([...pinned, ...others]);
    });
    return () => unsub();
  }, []);

  const sortedPosts = useMemo(() => {
    const pinned = posts.filter((p) => !!p.isPinned);
    let others = posts.filter((p) => !p.isPinned);
    // time range filter
    const now = Date.now();
    const cutoff = timeRange === 'week' ? now - 7 * 24 * 3600 * 1000 : timeRange === 'month' ? now - 30 * 24 * 3600 * 1000 : 0;
    const inRange = (x) => {
      if (!cutoff) return true;
      const t = x.createdAt?.toMillis ? x.createdAt.toMillis() : new Date(x.createdAt).getTime();
      return t >= cutoff;
    };
    others = others.filter(inRange);
    const pinnedFiltered = pinned.filter(inRange);
    // tag filter
    const byTag = (x) => {
      if (!filterTags.length) return true;
      const ts = Array.isArray(x.tags) ? x.tags : [];
      return filterTags.some((ft) => ts.includes(ft));
    };
    others = others.filter(byTag);
    const pinnedFinal = pinnedFiltered.filter(byTag);
    const sorter = (a, b) => {
      if (sortBy === 'top') return (b.score || 0) - (a.score || 0);
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
      return tb - ta;
    };
    return [...pinnedFinal.sort(sorter), ...others.sort(sorter)];
  }, [posts, sortBy]);

  const handleCreate = async () => {
    if (!newPost.title || !newPost.content) return alert('Please provide a title and content');
    if (!user) return alert('Please sign in');
    setLoading(true);
    try {
      // Upload images if any
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
      if (res.ok) {
        setNewPost({ title: '', content: '' }); setFiles([]); setTags([]);
      } else {
        // Fallback to client-side write
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
        setNewPost({ title: '', content: '' }); setFiles([]); setTags([]);
      }
    } catch (err) {
      // Fallback client-side
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
      setNewPost({ title: '', content: '' }); setFiles([]); setTags([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePin = async (post) => {
    if (!user) return alert('Please sign in');
    if (userData?.role !== 'teacher' && userData?.role !== 'admin') return alert('Only teachers/admins can pin');
    try {
      const res = await fetch('/api/forum/pin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, userId: user.uid, userRole: userData?.role }),
      });
      if (!res.ok) {
        // Fallback client-side
        const pRef = doc(db, 'post', post.id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) return;
        const current = !!snap.data().isPinned;
        await updateDoc(pRef, { isPinned: !current });
      }
    } catch (err) {
      // Fallback client-side
      const pRef = doc(db, 'post', post.id);
      const snap = await getDoc(pRef);
      if (!snap.exists()) return;
      const current = !!snap.data().isPinned;
      await updateDoc(pRef, { isPinned: !current });
    }
  };

  const handleDelete = async (post) => {
    if (!user) return alert('Please sign in');
    if (!confirm('Delete this post?')) return;
    const isOwner = post.authorId === user.uid
    if (userData?.role !== 'teacher' && userData?.role !== 'admin' && !isOwner) return alert('Only teachers/admins or the post author can delete');
    try {
      const res = await fetch('/api/forum/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, userId: user.uid, userRole: userData?.role, reason: '' }),
      });
      if (!res.ok) {
        // Fallback client-side
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
      // Fallback client-side
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

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Forum</h1>
        <div className="flex gap-2">
          <Button variant={sortBy === 'new' ? 'default' : 'outline'} onClick={() => setSortBy('new')}>New</Button>
          <Button variant={sortBy === 'top' ? 'default' : 'outline'} onClick={() => setSortBy('top')}>Top</Button>
          <Button variant={timeRange === 'all' ? 'default' : 'outline'} onClick={() => setTimeRange('all')}>All</Button>
          <Button variant={timeRange === 'week' ? 'default' : 'outline'} onClick={() => setTimeRange('week')}>This Week</Button>
          <Button variant={timeRange === 'month' ? 'default' : 'outline'} onClick={() => setTimeRange('month')}>This Month</Button>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-500">Filter by tag:</span>
        {['Help','Project','Idea'].map((t) => (
          <Button key={t} variant={filterTags.includes(t) ? 'default' : 'outline'} onClick={() => setFilterTags((ft) => ft.includes(t) ? ft.filter(x => x !== t) : [...ft, t])}>#{t}</Button>
        ))}
        {filterTags.length > 0 && (
          <Button variant="outline" onClick={() => setFilterTags([])}>Clear</Button>
        )}
      </div>
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Start a New Discussion</h2>
        <Input
          placeholder="Title"
          value={newPost.title}
          onChange={(e) => setNewPost((p) => ({ ...p, title: e.target.value }))}
          className="mb-3"
        />
        <Textarea
          placeholder="Write your discussion..."
          value={newPost.content}
          onChange={(e) => setNewPost((p) => ({ ...p, content: e.target.value }))}
          className="mb-4"
        />
        <div className="flex items-center gap-2 mb-3">
          <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
        </div>
        {files.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            {files.map((f, i) => (
              <div key={i} className="border rounded p-1 text-xs truncate">{f.name}</div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mb-4">
          <Button variant={tags.includes('Help') ? 'default' : 'outline'} onClick={() => setTags((t) => t.includes('Help') ? t.filter(x => x !== 'Help') : [...t, 'Help'])}>Help</Button>
          <Button variant={tags.includes('Project') ? 'default' : 'outline'} onClick={() => setTags((t) => t.includes('Project') ? t.filter(x => x !== 'Project') : [...t, 'Project'])}>Project</Button>
          <Button variant={tags.includes('Idea') ? 'default' : 'outline'} onClick={() => setTags((t) => t.includes('Idea') ? t.filter(x => x !== 'Idea') : [...t, 'Idea'])}>Idea</Button>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleCreate} disabled={loading}>Post Discussion</Button>
        </div>
      </Card>

      <div className="space-y-3">
        {sortedPosts.map((post) => (
          <Card key={post.id} className="p-0">
            <div className="grid grid-cols-[56px_1fr] gap-0">
              <div className="flex flex-col items-center justify-start border-r p-2">
                <Button variant="ghost" onClick={() => handleVote(post, 'upvote')} className="px-2">▲</Button>
                <div className="text-lg font-semibold">{post.score || 0}</div>
                <Button variant="ghost" onClick={() => handleVote(post, 'downvote')} className="px-2">▼</Button>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={post.authorName} className="w-7 h-7" />
                    <Link href={`/forum/${post.id}`} className="text-lg font-semibold hover:underline">
                      {post.title}
                    </Link>
                    {post.isPinned && (<Badge variant="secondary">Pinned</Badge>)}
                    {post.isLocked && (<Badge variant="warning">Closed</Badge>)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>u/{post.authorName || 'anonymous'}</span>
                    {(() => { const f = roleFlair(post.role); return (<Badge variant={f.variant}>{f.emoji} {f.label}</Badge>); })()}
                    <span>{timeAgo(post.createdAt)}</span>
                  </div>
                </div>
                <p className="text-gray-700">{post.content}</p>
                {Array.isArray(post.images) && post.images.length > 0 && (
                  <ImageGallery images={post.images} />
                )}
                {Array.isArray(post.tags) && post.tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {post.tags.map((t, i) => (<Badge key={i} variant="outline">#{t}</Badge>))}
                  </div>
                )}
                <div className="flex items-center gap-4 border-t pt-2 mt-1 text-sm">
                  <Link href={`/forum/${post.id}`} className="text-gray-600 hover:text-gray-900">💬 {Array.isArray(post.replies) ? post.replies.length : 0} Comments</Link>
                  <button className="text-gray-600 hover:text-gray-900" onClick={() => { const url = `${location.origin}/forum/${post.id}`; if (navigator.share) navigator.share({ title: post.title, url }); else navigator.clipboard.writeText(url); }}>🔗 Share</button>
                  <div className="flex items-center gap-2">
                    <button className="text-gray-600 hover:text-gray-900" onClick={() => handleReact(post, '👍')}>👍 {(Object.values(post.reactions || {}).filter(e => e === '👍').length)}</button>
                    <button className="text-gray-600 hover:text-gray-900" onClick={() => handleReact(post, '❤️')}>❤️ {(Object.values(post.reactions || {}).filter(e => e === '❤️').length)}</button>
                    <button className="text-gray-600 hover:text-gray-900" onClick={() => handleReact(post, '🎉')}>🎉 {(Object.values(post.reactions || {}).filter(e => e === '🎉').length)}</button>
                    <button className="text-gray-600 hover:text-gray-900" onClick={() => handleReact(post, '🤔')}>🤔 {(Object.values(post.reactions || {}).filter(e => e === '🤔').length)}</button>
                    <button className="text-gray-600 hover:text-gray-900" onClick={() => handleReact(post, '👀')}>👀 {(Object.values(post.reactions || {}).filter(e => e === '👀').length)}</button>
                  </div>
                  <div className="ml-auto flex gap-2">
                    {(userData?.role === 'teacher' || userData?.role === 'admin') && (
                      <>
                        <Button variant="outline" onClick={() => handlePin(post)}>{post.isPinned ? 'Unpin' : 'Pin'}</Button>
                        <Button variant="outline" onClick={() => handleLock(post)}>{post.isLocked ? 'Unlock' : 'Lock'}</Button>
                      </>
                    )}
                    {(userData?.role === 'teacher' || userData?.role === 'admin' || post.authorId === user?.uid) && (
                      <Button variant="destructive" onClick={() => handleDelete(post)}>Delete</Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {posts.length === 0 && (
          <div className="text-center text-gray-500 py-8">No discussions yet</div>
        )}
      </div>
    </div>
  );
}
  const handleLock = async (post) => {
    if (!user) return alert('Please sign in');
    if (userData?.role !== 'teacher' && userData?.role !== 'admin') return alert('Only teachers/admins can lock');
    try {
      const res = await fetch('/api/forum/lock', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, userId: user.uid, userRole: userData?.role })
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
