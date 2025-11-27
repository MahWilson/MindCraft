"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
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
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);


  useEffect(() => {
    const ref = doc(db, 'posts', id);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setPost({ id: snap.id, ...snap.data() });
      else setPost(null);
    });
    return () => unsub();
  }, [id]);





  const handleVote = async (postId, replyId, voteType) => {
    if (!user) return alert('Please sign in to vote');
    
    const res = await fetch('/api/forum/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, replyId, userId: user.uid, voteType })
    });
    
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to vote');
    }
  };

  const submitReply = async (parentReplyId = null) => {
    if (!reply.trim()) return alert('Please enter a reply');
    if (!user) return alert('Please sign in to reply');

    const res = await fetch('/api/forum/reply-enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        postId: id, 
        authorId: user.uid, 
        authorName: user.displayName || 'Anonymous', 
        content: reply,
        parentReplyId
      }),
    });
    
    const data = await res.json();
    if (!res.ok || data.error) return alert(data.error || 'Failed to post reply');

    
    setReply('');
    setReplyingTo(null);
  };

  const deleteReply = async (replyId) => {
    if (!user) return alert('Please sign in');
    const confirmed = window.confirm('Delete this reply? This cannot be undone.');
    if (!confirmed) return;
    const reason = window.prompt('Provide a brief reason for deletion (optional):') || '';
    const res = await fetch('/api/forum/reply-enhanced', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: id, replyId, userId: user.uid, userRole: userData?.role, reason }),
    });
    const data = await res.json();
    if (!res.ok || data.error) alert(data.error || 'Failed to delete reply');
  };

  const editReply = async (replyId, currentContent) => {
    if (!user) return alert('Please sign in');
    setEditingId(replyId);
    setEditContent(currentContent);
  };

  const saveEdit = async (replyId) => {
    if (!editContent.trim()) return alert('Reply cannot be empty');
    
    const res = await fetch('/api/forum/reply-enhanced', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: id, replyId, userId: user.uid, content: editContent.trim() }),
    });
    
    const data = await res.json();
    if (!res.ok || data.error) {
      alert(data.error || 'Failed to edit reply');
      return;
    }
    
    setEditingId(null);
    setEditContent('');
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

  const ReplyComponent = ({ reply, depth = 0 }) => {
    const maxDepth = 4;
    const isEditing = editingId === reply.id;
    const isReplying = replyingTo === reply.id;
    
    return (
      <div className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
        <Card className="p-4 mb-3 bg-white">
          <div className="flex space-x-3">
            <VoteButtons item={reply} />
            
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2 text-sm text-gray-500">
                <span className="flex items-center space-x-1">
                  <User size={12} />
                  <span className="font-medium">{reply.authorName}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock size={12} />
                  <span>{formatTimeAgo(reply.createdAt)}</span>
                </span>
                {reply.editedAt && (
                  <span className="text-xs text-gray-400">(edited)</span>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => saveEdit(reply.id)}>
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
                  <p className="text-gray-800 mb-3">{reply.content}</p>
                  
                  <div className="flex items-center space-x-2">
                    {user?.uid === reply.authorId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => editReply(reply.id, reply.content)}
                        className="flex items-center space-x-1"
                      >
                        <Edit size={12} />
                        <span>Edit</span>
                      </Button>
                    )}
                    
                    {(userData?.role === 'teacher' || userData?.role === 'admin' || reply.authorId === user?.uid) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteReply(reply.id)}
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
                        onClick={() => setReplyingTo(reply.id)}
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
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        className="min-h-[60px]"
                      />
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => submitReply(reply.id)}>
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
        
        {reply.replies && reply.replies.length > 0 && (
          <div className="mt-2">
            {reply.replies.map((nestedReply) => (
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
          {post.replies?.length || 0} Comments
        </h2>
        
        <Card className="p-4 mb-6 bg-white">
          <Textarea
            placeholder="What are your thoughts? Share your perspective..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            className="mb-3 min-h-[100px]"
          />
          <div className="flex justify-end">
            <Button onClick={() => submitReply()} size="lg">
              Post Comment
            </Button>
          </div>
        </Card>
        
        <div className="space-y-2">
          {post.replies?.map((reply) => (
            <ReplyComponent key={reply.id} reply={reply} />
          ))}
        </div>
        
        {(!post.replies || post.replies.length === 0) && (
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
