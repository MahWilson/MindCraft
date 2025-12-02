"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/firebase';
import { doc, onSnapshot, getDoc, updateDoc, arrayUnion, collection, addDoc, serverTimestamp, deleteDoc, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, MessageSquare, Edit, Trash2, Clock, User } from 'lucide-react';
import Link from 'next/link';

export default function TopicPage({ params }) {
  const { id } = params;
  const { user, userData } = useAuth();
  const [post, setPost] = useState(null);
  const [reply, setReply] = useState('');
  const [replyInputs, setReplyInputs] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [canParticipate, setCanParticipate] = useState(true);
  const [replyList, setReplyList] = useState([]);
  const [replyTree, setReplyTree] = useState([]);
  const [canModerate, setCanModerate] = useState(false);


  useEffect(() => {
    const ref = doc(db, 'posts', id);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setPost({ id: snap.id, ...snap.data() });
      else setPost(null);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    const q = query(collection(db, 'posts', id, 'replies'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const flat = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReplyList(flat);
      // build nested tree
      const byId = Object.create(null);
      flat.forEach(r => { byId[r.id] = { ...r, replies: [] }; });
      const roots = [];
      flat.forEach(r => {
        if (r.parentReplyId) {
          const parent = byId[r.parentReplyId];
          if (parent) parent.replies.push(byId[r.id]);
        } else {
          roots.push(byId[r.id]);
        }
      });
      setReplyTree(roots);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    const checkAccess = async () => {
      if (!post) return;
      if (post.scope !== 'course' || !post.courseId) { setCanParticipate(true); return; }
      if (!user) { setCanParticipate(false); return; }
      try {
        const ref = doc(db, 'enrollments', `${user.uid}_${post.courseId}`);
        const snap = await getDoc(ref);
        const allowed = snap.exists() || userData?.role === 'teacher' || userData?.role === 'admin';
        setCanParticipate(allowed);
      } catch {
        setCanParticipate(false);
      }
    };
    checkAccess();
  }, [post, user, userData]);

  useEffect(() => {
    const checkModeration = async () => {
      if (!post || !user) { setCanModerate(false); return; }
      if (userData?.role === 'teacher' || userData?.role === 'admin') { setCanModerate(true); return; }
      if (post.authorId === user.uid) { setCanModerate(true); return; }
      if (post.courseId) {
        try {
          const cSnap = await getDoc(doc(db, 'courses', post.courseId));
          setCanModerate(cSnap.exists() && cSnap.data().createdBy === user.uid);
          return;
        } catch {
          setCanModerate(false);
        }
      } else {
        setCanModerate(false);
      }
    };
    checkModeration();
  }, [post, user, userData]);





  const handleVote = async (postId, replyId, voteType) => {
    if (!user) return alert('Please sign in to vote');
    try {
      if (replyId) {
        const rRef = doc(db, 'posts', postId, 'replies', replyId);
        const rSnap = await getDoc(rRef);
        if (!rSnap.exists()) return alert('Reply not found');
        const data = rSnap.data();
        const votes = { ...(data.votes || {}) };
        const current = votes[user.uid];
        let delta = 0;
        if (current === voteType) { delete votes[user.uid]; delta = voteType === 'upvote' ? -1 : 1; }
        else if (current) { votes[user.uid] = voteType; delta = voteType === 'upvote' ? 2 : -2; }
        else { votes[user.uid] = voteType; delta = voteType === 'upvote' ? 1 : -1; }
        await updateDoc(rRef, { votes, score: (data.score || 0) + delta });
      } else {
        const pRef = doc(db, 'posts', postId);
        const pSnap = await getDoc(pRef);
        if (!pSnap.exists()) return;
        const data = pSnap.data();
        const votes = { ...(data.votes || {}) };
        const current = votes[user.uid];
        let delta = 0;
        if (current === voteType) { delete votes[user.uid]; delta = voteType === 'upvote' ? -1 : 1; }
        else if (current) { votes[user.uid] = voteType; delta = voteType === 'upvote' ? 2 : -2; }
        else { votes[user.uid] = voteType; delta = voteType === 'upvote' ? 1 : -1; }
        await updateDoc(pRef, { votes, score: (data.score || 0) + delta });
      }
    } catch (err) {
      alert(err.message || 'Failed to vote');
    }
  };

  const submitReply = async (parentReplyId = null, contentOverride = null) => {
    const text = contentOverride ?? reply;
    if (!text.trim()) return alert('Please enter a reply');
    if (!user) return alert('Please sign in to reply');
    if (!canParticipate) return alert('You are not allowed to reply in this course forum');

    try {
      await addDoc(collection(db, 'posts', id, 'replies'), {
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        content: text,
        createdAt: serverTimestamp(),
        votes: {},
        score: 0,
        parentReplyId: parentReplyId || null,
      });
      setReply('');
      if (parentReplyId) setReplyInputs((prev) => ({ ...prev, [parentReplyId]: '' }));
      setReplyingTo(null);
    } catch (err) {
      alert(err.message || 'Failed to post reply');
    }
  };

  const deleteReply = async (replyId) => {
    if (!user) return alert('Please sign in');
    const confirmed = window.confirm('Delete this reply? This cannot be undone.');
    if (!confirmed) return;
    try {
      const rRef = doc(db, 'posts', id, 'replies', replyId);
      const rSnap = await getDoc(rRef);
      if (!rSnap.exists()) return alert('Reply not found');
      const data = rSnap.data();
      const canDelete = canModerate || data.authorId === user.uid;
      if (!canDelete) return alert('Not allowed');
      // delete reply (children will remain orphaned; optional: cascade by querying and deleting where parentReplyId == replyId)
      await deleteDoc(rRef);
    } catch (err) {
      alert(err.message || 'Failed to delete reply');
    }
  };

  const editReply = async (replyId, currentContent) => {
    if (!user) return alert('Please sign in');
    setEditingId(replyId);
    setEditContent(currentContent);
  };

  const saveEdit = async (replyId) => {
    if (!editContent.trim()) return alert('Reply cannot be empty');
    try {
      const rRef = doc(db, 'posts', id, 'replies', replyId);
      const rSnap = await getDoc(rRef);
      if (!rSnap.exists()) return alert('Reply not found');
      const data = rSnap.data();
      if (data.authorId !== user.uid && userData?.role !== 'teacher' && userData?.role !== 'admin') {
        return alert('You can only edit your own reply');
      }
      await updateDoc(rRef, { content: editContent.trim(), editedAt: serverTimestamp() });
      setEditingId(null);
      setEditContent('');
    } catch (err) {
      alert(err.message || 'Failed to edit reply');
    }
  };

  const VoteButtons = ({ item, type = 'reply', size = "sm" }) => {
    const userVote = item.votes?.[user?.uid];
    
    return (
      <div className="flex flex-col items-center space-y-1">
        <Button
          variant={userVote === 'upvote' ? 'default' : 'ghost'}
          size={size}
          onClick={() => handleVote(id, type === 'reply' ? item.id : null, 'upvote')}
          className="p-1 h-6 w-6"
        >
          <ArrowUp className="h-3 w-3" />
        </Button>
        <span className="text-xs font-medium text-gray-700">
          {item.score || 0}
        </span>
        <Button
          variant={userVote === 'downvote' ? 'default' : 'ghost'}
          size={size}
          onClick={() => handleVote(id, type === 'reply' ? item.id : null, 'downvote')}
          className="p-1 h-6 w-6"
        >
          <ArrowDown className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  const ReplyComponent = ({ reply: replyItem, depth = 0 }) => {
    const maxDepth = 4;
    const isEditing = editingId === replyItem.id;
    const isReplying = replyingTo === replyItem.id;
    
    return (
      <div className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
        <Card className="p-4 mb-3 bg-white">
          <div className="flex space-x-3">
            <VoteButtons item={replyItem} />
            
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2 text-sm text-gray-500">
                <span className="flex items-center space-x-1">
                  <User size={12} />
                  <span className="font-medium">{replyItem.authorName}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock size={12} />
                  <span>{formatTimeAgo(replyItem.createdAt)}</span>
                </span>
                {replyItem.editedAt && (
                  <span className="text-xs text-gray-400">(edited)</span>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    autoFocus
                    className="min-h-[80px]"
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => saveEdit(replyItem.id)}>
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-800 mb-3">{replyItem.content}</p>
                  
                  <div className="flex items-center space-x-2">
                    {user?.uid === replyItem.authorId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => editReply(replyItem.id, replyItem.content)}
                        className="flex items-center space-x-1"
                      >
                        <Edit size={12} />
                        <span>Edit</span>
                      </Button>
                    )}
                    
                    {(canModerate || replyItem.authorId === user?.uid) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteReply(replyItem.id)}
                        className="flex items-center space-x-1 text-red-600"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </Button>
                    )}
                    
                    {depth < maxDepth && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReplyingTo(replyItem.id)}
                        className="flex items-center space-x-1"
                      >
                        <MessageSquare size={12} />
                        <span>Reply</span>
                      </Button>
                    )}
                  </div>
                  
                  {isReplying && (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        placeholder="Write a reply..."
                        value={replyInputs[replyItem.id] || ''}
                        onChange={(e) => setReplyInputs((prev) => ({ ...prev, [replyItem.id]: e.target.value }))}
                        className="min-h-[60px]"
                      />
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => submitReply(replyItem.id, replyInputs[replyItem.id] || '')}>
                          Post Reply
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setReplyingTo(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
        
        {replyItem.replies && replyItem.replies.length > 0 && (
          <div className="mt-2">
            {replyItem.replies.map((nestedReply) => (
              <ReplyComponent key={nestedReply.id} reply={nestedReply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!post) return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Topic not found</h2>
        <p className="text-gray-500 mt-2">The discussion you're looking for doesn't exist.</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/forum" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Back to Forum
        </Link>
        
        {post.isPinned && (
          <Badge variant="secondary" className="mb-3 flex items-center space-x-1">
            <span>📌</span>
            <span>Pinned Post</span>
          </Badge>
        )}
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>
        
        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
          <span className="flex items-center space-x-1">
            <User size={14} />
            <span className="font-medium">{post.authorName}</span>
          </span>
          <Badge variant="outline" className="flex items-center space-x-1">
            {post.role === 'teacher' ? '👩‍🏫' : '👨‍🎓'}
            <span>{post.role}</span>
          </Badge>
          <span className="flex items-center space-x-1">
            <Clock size={14} />
            <span>{formatTimeAgo(post.createdAt)}</span>
          </span>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <span>{post.score || 0} likes</span>
          </Badge>
        </div>
      </div>

      <Card className="p-6 mb-6 bg-white shadow-lg">
        <div className="flex space-x-4">
          <VoteButtons item={post} type="post" />
          <div className="flex-1">
            <p className="text-gray-800 text-lg leading-relaxed">{post.content}</p>
          </div>
        </div>
      </Card>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {replyList.length} Comments
        </h2>
        
      <Card className="p-4 mb-6 bg-white">
          {!canParticipate && (
            <div className="mb-3 text-red-600">You must be enrolled in this course to participate.</div>
          )}
          <Textarea
            placeholder="What are your thoughts? Share your perspective..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            className="mb-3 min-h-[100px]"
            disabled={!canParticipate}
          />
          <div className="flex justify-end">
            <Button onClick={() => submitReply()} size="lg" disabled={!canParticipate}>
              Post Comment
            </Button>
          </div>
        </Card>
        
        <div className="space-y-2">
          {replyTree.map((reply) => (
            <ReplyComponent key={reply.id} reply={reply} />
          ))}
        </div>
        
        {replyList.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No comments yet</h3>
            <p className="text-gray-500">Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  );
}

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Unknown';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
};
