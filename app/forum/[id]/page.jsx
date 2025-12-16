"use client";
import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { db } from '@/firebase';
import { doc, getDoc, onSnapshot, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { ImageGallery } from '@/components/ui/image-gallery';
import { timeAgo, roleFlair } from '@/lib/utils';
import { BadgeCheck, MessageSquare, ChevronDown, ChevronUp, ArrowBigUp, ArrowBigDown, Reply, ShieldCheck } from 'lucide-react';

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });
const MOD_ROLES = ['admin', 'teacher', 'instructor'];

export default function TopicPage({ params }) {
  const { id } = params;
  const { user, userData } = useAuth();
  const isModerator = MOD_ROLES.includes(userData?.role);
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [text, setText] = useState('');
  const [sort, setSort] = useState('new');

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
    const sorted = [...list].sort((a, b) => {
      if (sort === 'top') return (b.score || 0) - (a.score || 0);
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
      return tb - ta;
    });
    setReplies(sorted);
  }, [post, sort]);

  const tree = useMemo(() => {
    const byId = Object.create(null);
    replies.forEach((r) => { byId[r.id] = { ...r, children: [] }; });
    const roots = [];
    replies.forEach((r) => {
      if (r.parentReplyId) {
        const parent = byId[r.parentReplyId];
        if (parent) parent.children.push(byId[r.id]); else roots.push(byId[r.id]);
      } else roots.push(byId[r.id]);
    });
    return roots;
  }, [replies]);

  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const sendReply = async () => {
    if (!text.trim()) return alert('Enter a reply');
    if (!user) return alert('Please sign in');
    try {
      const res = await fetch('/api/forum/reply-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id, authorId: user.uid, authorName: user.displayName || 'Anonymous', role: userData?.role || 'student', content: text }),
      });
      if (res.ok) {
        setText('');
      } else {
        await appendReply({ content: text });
        setText('');
      }
    } catch (err) {
      await appendReply({ content: text });
      setText('');
    }
  };

  const appendReply = async ({ content, parentReplyId }) => {
    const pRef = doc(db, 'post', id);
    const snap = await getDoc(pRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const arr = Array.isArray(data.replies) ? data.replies : [];
    const newReply = {
      id: crypto.randomUUID(),
      authorId: user.uid,
      authorName: user.displayName || 'Anonymous',
      role: userData?.role || 'student',
      content,
      createdAt: new Date(),
      votes: {},
      score: 0,
      parentReplyId,
    };
    await updateDoc(pRef, { replies: [...arr, newReply] });
  };

  const vote = async (replyId, voteType) => {
    if (!user) return alert('Please sign in');
    try {
      const res = await fetch('/api/forum/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id, replyId, userId: user.uid, voteType }),
      });
      if (!res.ok) await mutateVotes(replyId, voteType);
    } catch {
      await mutateVotes(replyId, voteType);
    }
  };

  const mutateVotes = async (replyId, voteType) => {
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
  };

  const replyTo = async (parentId, content) => {
    const msg = (content ?? '').trim();
    if (!msg) return alert('Enter a reply');
    if (!user) return alert('Please sign in');
    try {
      const res = await fetch('/api/forum/reply-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id, authorId: user.uid, authorName: user.displayName || 'Anonymous', role: userData?.role || 'student', content: msg, parentReplyId: parentId }),
      });
      if (!res.ok) await appendReply({ content: msg, parentReplyId: parentId });
    } catch {
      await appendReply({ content: msg, parentReplyId: parentId });
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
      if (!res.ok) await removeReply(replyId);
    } catch {
      await removeReply(replyId);
    }
  };

  const removeReply = async (replyId) => {
    const pRef = doc(db, 'post', id);
    const snap = await getDoc(pRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const arr = Array.isArray(data.replies) ? data.replies : [];
    const target = arr.find((r) => r.id === replyId);
    if (!target) return;
    const canDelete = isModerator || target.authorId === user?.uid;
    if (!canDelete) return alert('Only teachers/admins or the reply author can delete');
    const updated = arr.filter((r) => r.id !== replyId);
    await updateDoc(pRef, { replies: updated });
  };

  if (!post) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4">
        <Link href="/forum" className="text-indigo-600 hover:underline">← Back to Forum</Link>
        <div className="mt-6">Topic not found</div>
      </div>
    );
  }

  const instructorReplied = Array.isArray(post.replies) && post.replies.some((r) => MOD_ROLES.includes(r.role));

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-900">
      <div className="max-w-5xl mx-auto py-10 px-4 space-y-6">
        <Link href="/forum" className="text-indigo-600 hover:underline text-sm">← Back to Forum</Link>

        <Card className="p-6 shadow-sm bg-white/80 dark:bg-slate-800/80">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={post.authorName} className="w-10 h-10" />
                <div>
                  <div className="text-xs text-slate-500">Posted by {post.authorName || 'Anonymous'}</div>
                  <div className="flex items-center gap-2">
                    {(() => { const f = roleFlair(post.role); return (<Badge variant={f.variant}>{f.emoji} {f.label}</Badge>); })()}
                    <span className="text-xs text-slate-500">{timeAgo(post.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {post.isPinned && <Badge variant="secondary" className="gap-1"><BadgeCheck className="w-3 h-3" /> Pinned</Badge>}
                {post.isLocked && <Badge variant="warning">Locked</Badge>}
                {instructorReplied && <Badge variant="success" className="gap-1"><ShieldCheck className="w-3 h-3" /> Instructor replied</Badge>}
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{post.title}</h1>
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown>{post.content || ''}</ReactMarkdown>
            </div>
            {Array.isArray(post.images) && post.images.length > 0 && (
              <ImageGallery images={post.images} />
            )}
            {Array.isArray(post.tags) && post.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {post.tags.map((t, i) => (<Badge key={i} variant="outline">#{t}</Badge>))}
              </div>
            )}
          </div>
        </Card>

        {!post.isLocked && (
          <Card className="p-5 bg-white/80 dark:bg-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Join the conversation</p>
              <Badge variant="secondary" className="gap-1"><MessageSquare className="w-3 h-3" /> Markdown supported</Badge>
            </div>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a thoughtful, code-friendly reply..." className="font-mono" rows={5} />
            <div className="flex justify-end mt-3">
              <Button onClick={sendReply}>Post comment</Button>
            </div>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">{Array.isArray(post?.replies) ? post.replies.length : 0} Comments</div>
          <div className="flex gap-2">
            <Button variant={sort === 'new' ? 'default' : 'outline'} onClick={() => setSort('new')}>Newest</Button>
            <Button variant={sort === 'top' ? 'default' : 'outline'} onClick={() => setSort('top')}>Top</Button>
          </div>
        </div>

        <div className="space-y-3">
          {tree.map((r) => (
            <ReplyNode
              key={r.id}
              r={r}
              depth={0}
              postId={id}
              onVote={vote}
              onDelete={del}
              onReply={replyTo}
              expanded={expanded}
              toggle={toggle}
            />
          ))}
          {replies.length === 0 && (
            <Card className="p-8 text-center bg-white/70 dark:bg-slate-800/70 border-dashed border-2 border-slate-200">
              <div className="mx-auto w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mb-2">
                <MessageSquare className="w-5 h-5" />
              </div>
              <p className="text-slate-600">No comments yet. Start the discussion!</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ReplyNode({ r, depth, postId, onVote, onDelete, onReply, expanded, toggle }) {
  const [subText, setSubText] = useState('');
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(r.content || '');
  const { user, userData } = useAuth();
  const isModerator = MOD_ROLES.includes(userData?.role);

  const hasChildren = r.children && r.children.length > 0;
  const isOpen = expanded[r.id] ?? true;
  const borderColors = ['border-slate-200', 'border-indigo-200', 'border-amber-200', 'border-emerald-200', 'border-pink-200'];
  const borderColor = borderColors[Math.min(depth, borderColors.length - 1)];

  const canEdit = user && (user.uid === r.authorId || isModerator);
  const canDelete = user && (user.uid === r.authorId || isModerator);

  const saveEdit = async () => {
    if (!canEdit) return;
    try {
      const res = await fetch('/api/forum/reply-enhanced', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, replyId: r.id, userId: user.uid, content: editText }),
      });
      if (!res.ok) await patchLocal();
      setEditing(false);
    } catch {
      await patchLocal();
      setEditing(false);
    }
  };

  const patchLocal = async () => {
    const pRef = doc(db, 'post', postId);
    const snap = await getDoc(pRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const arr = Array.isArray(data.replies) ? data.replies : [];
    const idx = arr.findIndex((x) => x.id === r.id);
    if (idx !== -1) { arr[idx] = { ...arr[idx], content: editText, editedAt: new Date() }; await updateDoc(pRef, { replies: arr }); }
  };

  const isInstructor = ['teacher', 'instructor', 'admin'].includes(r.role);

  return (
    <Card className={`p-4 bg-white/80 dark:bg-slate-800/80 border-l-4 ${borderColor}`} style={{ marginLeft: depth * 16 }}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1">
          <IconButton icon={<ArrowBigUp className="w-4 h-4" />} label="Upvote" onClick={() => onVote(r.id, 'upvote')} />
          <IconButton icon={<ArrowBigDown className="w-4 h-4" />} label="Downvote" onClick={() => onVote(r.id, 'downvote')} />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Avatar name={r.authorName} className="w-7 h-7" />
            <span className="font-medium text-slate-900 dark:text-white">{r.authorName || 'Anonymous'}</span>
            {(() => { const f = roleFlair(r.role); return (<Badge variant={f.variant}>{f.emoji} {f.label}</Badge>); })()}
            {isInstructor && <Badge variant="success" className="gap-1"><ShieldCheck className="w-3 h-3" /> Instructor</Badge>}
            <span className="text-xs text-slate-500">{timeAgo(r.createdAt)}</span>
            <button className="ml-auto text-xs text-slate-500 flex items-center gap-1" onClick={() => toggle(r.id)}>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} {isOpen ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {editing ? (
            <div className="space-y-2">
              <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="font-mono" rows={3} />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => { setEditing(false); setEditText(r.content || ''); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown>{r.content || ''}</ReactMarkdown>
            </div>
          )}

          {isOpen && (
            <>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <button className="flex items-center gap-1 hover:text-indigo-600" onClick={() => onReply(r.id, subText || '')}>
                  <Reply className="w-4 h-4" /> Reply
                </button>
                {canEdit && <button className="hover:text-indigo-600" onClick={() => setEditing((v) => !v)}>Edit</button>}
                {canDelete && <button className="text-red-500 hover:text-red-600" onClick={() => onDelete(r.id)}>Delete</button>}
              </div>
              <div className="mt-2 flex gap-2">
                <Textarea value={subText} onChange={(e) => setSubText(e.target.value)} placeholder="Reply with code or context..." rows={2} className="font-mono" />
                <Button onClick={() => { onReply(r.id, subText); setSubText(''); }} size="sm">Send</Button>
              </div>
              {hasChildren && (
                <div className="mt-3 space-y-3">
                  {r.children.map((c) => (
                    <ReplyNode
                      key={c.id}
                      r={c}
                      depth={depth + 1}
                      postId={postId}
                      onVote={onVote}
                      onDelete={onDelete}
                      onReply={onReply}
                      expanded={expanded}
                      toggle={toggle}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function IconButton({ icon, label, onClick }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition bg-white dark:bg-slate-800"
    >
      {icon}
    </button>
  );
}
