"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { db } from '@/firebase';
import { doc, getDoc, onSnapshot, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { ImageGallery } from '@/components/ui/image-gallery';
import { timeAgo, roleFlair } from '@/lib/utils';

export default function TopicPage({ params }) {
  const { id } = params;
  const { user, userData } = useAuth();
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [text, setText] = useState('');

  useEffect(() => {
    const ref = doc(db, 'post', id);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setPost({ id: snap.id, ...snap.data() });
      else setPost(null);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!post) return;
    const list = Array.isArray(post.replies) ? post.replies : [];
    setReplies(list);
  }, [post]);

  const tree = useMemo(() => {
    const byId = Object.create(null);
    replies.forEach(r => { byId[r.id] = { ...r, children: [] }; });
    const roots = [];
    replies.forEach(r => {
      if (r.parentReplyId) {
        const parent = byId[r.parentReplyId];
        if (parent) parent.children.push(byId[r.id]); else roots.push(byId[r.id]);
      } else roots.push(byId[r.id]);
    });
    return roots;
  }, [replies]);

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const sendReply = async () => {
    if (!text.trim()) return alert('Enter a reply');
    if (!user) return alert('Please sign in');
    try {
      const res = await fetch('/api/forum/reply-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id, authorId: user.uid, authorName: user.displayName || 'Anonymous', role: userData?.role || 'student', content: text }),
      });
      if (res.ok) { setText(''); } else {
        const pRef = doc(db, 'post', id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) return;
        const data = snap.data();
        const arr = Array.isArray(data.replies) ? data.replies : [];
        const newReply = { id: crypto.randomUUID(), authorId: user.uid, authorName: user.displayName || 'Anonymous', role: userData?.role || 'student', content: text, createdAt: new Date(), votes: {}, score: 0 };
        await updateDoc(pRef, { replies: [...arr, newReply] });
        setText('');
      }
    } catch (err) {
      const pRef = doc(db, 'post', id);
      const snap = await getDoc(pRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const arr = Array.isArray(data.replies) ? data.replies : [];
      const newReply = { id: crypto.randomUUID(), authorId: user.uid, authorName: user.displayName || 'Anonymous', role: userData?.role || 'student', content: text, createdAt: new Date(), votes: {}, score: 0 };
      await updateDoc(pRef, { replies: [...arr, newReply] });
      setText('');
    }
  };

  const vote = async (replyId, voteType) => {
    if (!user) return alert('Please sign in');
    try {
      const res = await fetch('/api/forum/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id, replyId, userId: user.uid, voteType }),
      });
      if (!res.ok) {
        const pRef = doc(db, 'post', id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) return;
        const data = snap.data();
        const arr = Array.isArray(data.replies) ? data.replies : [];
        const updated = arr.map((r) => {
          if (r.id !== replyId) return r;
          const votes = { ...(r.votes || {}) };
          const current = votes[user.uid];
          let delta = 0;
          if (current === voteType) { delete votes[user.uid]; delta = voteType === 'upvote' ? -1 : 1; }
          else if (current) { votes[user.uid] = voteType; delta = voteType === 'upvote' ? 2 : -2; }
          else { votes[user.uid] = voteType; delta = voteType === 'upvote' ? 1 : -1; }
          return { ...r, votes, score: (r.score || 0) + delta };
        });
        await updateDoc(pRef, { replies: updated });
      }
    } catch (err) {
      const pRef = doc(db, 'post', id);
      const snap = await getDoc(pRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const arr = Array.isArray(data.replies) ? data.replies : [];
      const updated = arr.map((r) => {
        if (r.id !== replyId) return r;
        const votes = { ...(r.votes || {}) };
        const current = votes[user.uid];
        let delta = 0;
        if (current === voteType) { delete votes[user.uid]; delta = voteType === 'upvote' ? -1 : 1; }
        else if (current) { votes[user.uid] = voteType; delta = voteType === 'upvote' ? 2 : -2; }
        else { votes[user.uid] = voteType; delta = voteType === 'upvote' ? 1 : -1; }
        return { ...r, votes, score: (r.score || 0) + delta };
      });
      await updateDoc(pRef, { replies: updated });
    }
  };

  const replyTo = async (parentId, content) => {
    const msg = (content ?? '').trim();
    if (!msg) return alert('Enter a reply');
    if (!user) return alert('Please sign in');
    try {
      const res = await fetch('/api/forum/reply-enhanced', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id, authorId: user.uid, authorName: user.displayName || 'Anonymous', role: userData?.role || 'student', content: msg, parentReplyId: parentId })
      });
      if (!res.ok) {
        const pRef = doc(db, 'post', id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) return;
        const data = snap.data();
        const arr = Array.isArray(data.replies) ? data.replies : [];
        const newReply = { id: crypto.randomUUID(), authorId: user.uid, authorName: user.displayName || 'Anonymous', role: userData?.role || 'student', content: msg, createdAt: new Date(), votes: {}, score: 0, parentReplyId: parentId };
        await updateDoc(pRef, { replies: [...arr, newReply] });
      }
    } catch {
      const pRef = doc(db, 'post', id);
      const snap = await getDoc(pRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const arr = Array.isArray(data.replies) ? data.replies : [];
      const newReply = { id: crypto.randomUUID(), authorId: user.uid, authorName: user.displayName || 'Anonymous', role: userData?.role || 'student', content: msg, createdAt: new Date(), votes: {}, score: 0, parentReplyId: parentId };
      await updateDoc(pRef, { replies: [...arr, newReply] });
    }
  };

  const del = async (replyId) => {
    if (!user) return alert('Please sign in');
    if (!confirm('Delete this reply?')) return;
    try {
      const res = await fetch('/api/forum/reply-enhanced', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id, replyId, userId: user.uid, userRole: userData?.role }),
      });
      if (!res.ok) {
        if (userData?.role !== 'teacher' && userData?.role !== 'admin') {
          const pRefCheck = await getDoc(doc(db, 'post', id));
          if (!pRefCheck.exists()) return;
          const arrCheck = Array.isArray(pRefCheck.data().replies) ? pRefCheck.data().replies : [];
          const target = arrCheck.find(r => r.id === replyId);
          if (target && target.authorId !== user.uid) return alert('Only teachers/admins or reply author can delete');
        }
        const pRef = doc(db, 'post', id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) return;
        const data = snap.data();
        const arr = Array.isArray(data.replies) ? data.replies : [];
        const updated = arr.filter((r) => r.id !== replyId);
        await updateDoc(pRef, { replies: updated });
      }
    } catch (err) {
      if (userData?.role !== 'teacher' && userData?.role !== 'admin') {
        const pRefCheck = await getDoc(doc(db, 'post', id));
        if (!pRefCheck.exists()) return;
        const arrCheck = Array.isArray(pRefCheck.data().replies) ? pRefCheck.data().replies : [];
        const target = arrCheck.find(r => r.id === replyId);
        if (target && target.authorId !== user.uid) return alert('Only teachers/admins or reply author can delete');
      }
      const pRef = doc(db, 'post', id);
      const snap = await getDoc(pRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const arr = Array.isArray(data.replies) ? data.replies : [];
      const updated = arr.filter((r) => r.id !== replyId);
      await updateDoc(pRef, { replies: updated });
    }
  };

  if (!post) return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Link href="/forum" className="text-blue-600 hover:underline">← Back to Forum</Link>
      <div className="mt-6">Topic not found</div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Link href="/forum" className="text-blue-600 hover:underline">← Back to Forum</Link>
      <Card className="p-6 mt-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={post.authorName} className="w-7 h-7" />
            <div className="text-2xl font-bold">{post.title}</div>
            {post.isPinned && (<Badge variant="secondary" className="ml-2">Pinned</Badge>)}
            {post.isLocked && (<Badge variant="warning" className="ml-2">Closed</Badge>)}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>u/{post.authorName || 'anonymous'}</span>
            {(() => { const f = roleFlair(post.role); return (<Badge variant={f.variant}>{f.emoji} {f.label}</Badge>); })()}
            <span>{timeAgo(post.createdAt)}</span>
          </div>
        </div>
        <p className="mt-3 text-gray-700">{post.content}</p>
        {Array.isArray(post.images) && post.images.length > 0 && (
          <div className="mt-3">
            <ImageGallery images={post.images} />
          </div>
        )}
        {Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {post.tags.map((t, i) => (<Badge key={i} variant="outline">#{t}</Badge>))}
          </div>
        )}
      </Card>

      {!post.isLocked && (
        <Card className="p-6 mb-6">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="What are your thoughts?" />
          <div className="flex justify-end mt-3">
            <Button onClick={sendReply}>Post Comment</Button>
          </div>
        </Card>
      )}

      <ToolbarReplies post={post} replies={replies} setReplies={setReplies} />
      <div className="space-y-3 mt-3">
        {tree.map((r) => (
          <ReplyNode key={r.id} r={r} depth={0} onVote={vote} onDelete={del} onReply={replyTo} expanded={expanded} toggle={toggle} />
        ))}
        {replies.length === 0 && (
          <div className="text-center text-gray-500 py-8">No comments yet</div>
        )}
      </div>
    </div>
  );
}

function ReplyNode({ r, depth, onVote, onDelete, onReply, expanded, toggle }) {
  const [subText, setSubText] = useState('');
  const hasChildren = r.children && r.children.length > 0;
  const isOpen = expanded[r.id] ?? true;
  const borderColor = ['#e5e7eb','#e0e7ff','#fde68a','#d1fae5','#fce7f3'][Math.min(depth,4)];
  return (
    <Card className="p-4" style={{ marginLeft: depth * 16, borderLeft: `3px solid ${borderColor}` , paddingLeft: 12 }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar name={r.authorName} className="w-6 h-6" />
          <span className="font-medium">u/{r.authorName || 'anonymous'}</span>
          {(() => { const f = roleFlair(r.role); return (<Badge variant={f.variant}>{f.emoji} {f.label}</Badge>); })()}
          <span className="text-xs text-gray-500">{timeAgo(r.createdAt)}</span>
        </div>
        <div className="text-sm text-gray-500">Score: {r.score || 0}</div>
      </div>
      <p className="mt-2 text-gray-700">{r.content}</p>
      <div className="mt-3 flex gap-4 items-center border-t pt-2 text-sm">
        <button className="text-gray-600 hover:text-gray-900" onClick={() => onVote(r.id, 'upvote')}>▲ Upvote</button>
        <button className="text-gray-600 hover:text-gray-900" onClick={() => onVote(r.id, 'downvote')}>▼ Downvote</button>
        <ReplyReaction r={r} postId={r.postId} replyId={r.id} />
        <button className="text-gray-600 hover:text-gray-900" onClick={() => toggle(r.id)}>{isOpen ? 'Collapse' : 'Expand'}</button>
        <Button variant="destructive" onClick={() => onDelete(r.id)}>Delete</Button>
      </div>
      <ReplyEditor initial={r.content} replyId={r.id} postId={r.postId} />
      <div className="mt-3 flex gap-2">
        <Textarea value={subText} onChange={(e) => setSubText(e.target.value)} placeholder="Reply..." />
        <Button onClick={() => { onReply(r.id, subText); setSubText(''); }}>Reply</Button>
      </div>
      {hasChildren && isOpen && (
        <div className="mt-3 space-y-3">
          {r.children.map((c) => (
            <ReplyNode key={c.id} r={c} depth={depth + 1} onVote={onVote} onDelete={onDelete} onReply={onReply} expanded={expanded} toggle={toggle} />
          ))}
        </div>
      )}
    </Card>
  );
}

function ReplyReaction({ r }) {
  const emojis = ['👍','❤️','🎉','🤔','👀'];
  const counts = (e) => Object.values(r.reactions || {}).filter(x => x === e).length;
  const toggle = async (emoji) => {
    try {
      const pRef = doc(db, 'post', r.postId);
      const snap = await getDoc(pRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const arr = Array.isArray(data.replies) ? data.replies : [];
      const idx = arr.findIndex(x => x.id === r.id);
      if (idx === -1) return;
      const me = arr[idx];
      const reactions = { ...(me.reactions || {}) };
      const uid = (typeof window !== 'undefined' && window.__uid) || '';
      if (!uid) return;
      if (reactions[uid] === emoji) delete reactions[uid]; else reactions[uid] = emoji;
      arr[idx] = { ...me, reactions };
      await updateDoc(pRef, { replies: arr });
    } catch {}
  };
  return (
    <div className="flex gap-2">
      {emojis.map((e) => (
        <Button key={e} variant="ghost" onClick={() => toggle(e)}>{e} {counts(e)}</Button>
      ))}
    </div>
  );
}

function ReplyEditor({ initial, replyId, postId }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initial || '');
  const { user } = useAuth();
  const save = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/forum/reply-enhanced', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, replyId, userId: user.uid, content: text })
      });
      if (!res.ok) {
        const pRef = doc(db, 'post', postId);
        const snap = await getDoc(pRef);
        if (!snap.exists()) return;
        const data = snap.data();
        const arr = Array.isArray(data.replies) ? data.replies : [];
        const idx = arr.findIndex(r => r.id === replyId);
        if (idx !== -1) { arr[idx] = { ...arr[idx], content: text, editedAt: new Date() }; await updateDoc(pRef, { replies: arr }); }
      }
      setEditing(false);
    } catch {
      const pRef = doc(db, 'post', postId);
      const snap = await getDoc(pRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const arr = Array.isArray(data.replies) ? data.replies : [];
      const idx = arr.findIndex(r => r.id === replyId);
      if (idx !== -1) { arr[idx] = { ...arr[idx], content: text, editedAt: new Date() }; await updateDoc(pRef, { replies: arr }); }
      setEditing(false);
    }
  };
  return (
    <div className="mt-3">
      {!editing ? (
        <Button variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
      ) : (
        <div className="space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={save}>Save</Button>
            <Button variant="outline" onClick={() => { setEditing(false); setText(initial || ''); }}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarReplies({ post, replies, setReplies }) {
  const [sort, setSort] = useState('new');
  useEffect(() => {
    const arr = Array.isArray(post?.replies) ? [...post.replies] : [];
    const comp = (a, b) => {
      if (sort === 'top') return (b.score || 0) - (a.score || 0);
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
      return tb - ta;
    };
    arr.sort(comp);
    setReplies(arr);
  }, [sort, post, setReplies]);
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-600">{Array.isArray(post?.replies) ? post.replies.length : 0} Comments</div>
      <div className="flex gap-2">
        <Button variant={sort === 'new' ? 'default' : 'outline'} onClick={() => setSort('new')}>New</Button>
        <Button variant={sort === 'top' ? 'default' : 'outline'} onClick={() => setSort('top')}>Top</Button>
      </div>
    </div>
  );
}
