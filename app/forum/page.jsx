"use client";
import React, { useEffect, useState } from "react";
import { db } from "@/firebase";
import { onSnapshot, collection, query, orderBy, doc, updateDoc, arrayUnion, serverTimestamp, addDoc } from "firebase/firestore";
import { MessageSquare, Pin, Trash2, Smile, ArrowUp, ArrowDown, Clock, User, TrendingUp, Award } from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const emojiList = ["👍", "🎉", "❤️", "😂", "😮"];

function ForumPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ title: "", content: "" });
  const [replyOpen, setReplyOpen] = useState({});
  const [replyContent, setReplyContent] = useState({});
  const [sortBy, setSortBy] = useState('new'); // Default to 'new' for school environment

  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      let data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      data = sortPosts(data, sortBy);
      
      data = [
        ...data.filter((p) => p.isPinned),
        ...data.filter((p) => !p.isPinned),
      ];
      
      setPosts(data);
    });
    return () => unsub();
  }, [sortBy]);

  const sortPosts = (posts, sortMethod) => {
    switch (sortMethod) {
      case 'popular':
        return posts.sort((a, b) => (b.reactions ? Object.keys(b.reactions).length : 0) - (a.reactions ? Object.keys(a.reactions).length : 0));
      case 'new':
      default:
        return posts.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
          return timeB - timeA;
        });
    }
  };

  const handleCreate = async () => {
    if (!newPost.title || !newPost.content) {
      alert('Please provide a title and content');
      return;
    }
    if (!user) {
      alert('Please sign in to create a discussion topic');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'posts'), {
        title: newPost.title,
        content: newPost.content,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        role: userData?.role || 'student',
        createdAt: serverTimestamp(),
        isPinned: false,
        reactions: {},
        replies: [],
        votes: {},
        score: 0,
      });

      setNewPost({ title: "", content: "" });
      router.push(`/forum/${docRef.id}`);
    } catch (error) {
      alert(error.message || 'Failed to create topic');
    }
  };

  const handleDelete = async (postId) => {
    if (!user) return alert('Please sign in');
    const confirmed = window.confirm('Delete this post? This cannot be undone.');
    if (!confirmed) return;
    const reason = window.prompt('Provide a brief reason for deletion (optional):') || '';
    const res = await fetch("/api/forum/delete", {
      method: "POST",
      body: JSON.stringify({ postId, userId: user.uid, userRole: userData?.role, reason }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (!res.ok || data.error) alert(data.error || 'Failed to delete post');
  };

  const handlePin = async (postId) => {
    await fetch("/api/forum/pin", {
      method: "PATCH",
      body: JSON.stringify({ postId, userRole: userData?.role }),
      headers: { "Content-Type": "application/json" },
    });
  };

  const handleVote = async (postId, voteType) => {
    if (!user) return alert('Please sign in to vote');
    
    const res = await fetch('/api/forum/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, userId: user.uid, voteType })
    });
    
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to vote');
    }
  };

  const handleReact = async (postId, emoji) => {
    await fetch("/api/forum/react", {
      method: "POST",
      body: JSON.stringify({ postId, userId: user.uid, emoji }),
      headers: { "Content-Type": "application/json" },
    });
  };

  const handleReply = async (postId) => {
    const reply = replyContent[postId];
    if (!reply) {
      alert('Please enter a reply');
      return;
    }
    if (!user) {
      alert('Please sign in to reply');
      return;
    }

    const res = await fetch('/api/forum/reply-enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        content: reply,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      alert(data.error || 'Failed to submit reply');
      return;
    }

    setReplyContent((prev) => ({ ...prev, [postId]: "" }));
    setReplyOpen((prev) => ({ ...prev, [postId]: false }));
  };

  const VoteButtons = ({ post, size = "sm" }) => {
    const userVote = post.votes?.[user?.uid];
    
    return (
      <div className="flex flex-col items-center space-y-1">
        <Button
          variant={userVote === 'upvote' ? 'default' : 'ghost'}
          size={size}
          onClick={() => handleVote(post.id, 'upvote')}
          className="p-1 h-8 w-8 bg-green-100 hover:bg-green-200 text-green-600"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-gray-700">
          {post.score || 0}
        </span>
        <Button
          variant={userVote === 'downvote' ? 'default' : 'ghost'}
          size={size}
          onClick={() => handleVote(post.id, 'downvote')}
          className="p-1 h-8 w-8 bg-red-100 hover:bg-red-200 text-red-600"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Class Discussion Forum</h1>
        {user && (
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="flex items-center space-x-1 bg-blue-100 text-blue-800">
              <Award className="h-4 w-4" />
              <span>{userData?.role || 'student'}</span>
            </Badge>
          </div>
        )}
      </div>

      <div className="flex space-x-2 mb-6">
        <Button
          variant={sortBy === 'new' ? 'default' : 'outline'}
          onClick={() => setSortBy('new')}
          className="flex items-center space-x-1"
        >
          <Clock className="h-4 w-4" />
          <span>Recent</span>
        </Button>
        <Button
          variant={sortBy === 'popular' ? 'default' : 'outline'}
          onClick={() => setSortBy('popular')}
          className="flex items-center space-x-1"
        >
          <TrendingUp className="h-4 w-4" />
          <span>Popular</span>
        </Button>
      </div>

      <Card className="mb-8 p-6 bg-white shadow-lg border-2 border-blue-100">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">Start a New Discussion</h2>
        <Input
          placeholder="What's your topic? (e.g., Help with loops, Sharing my project, Question about arrays)"
          value={newPost.title}
          onChange={(e) => setNewPost((p) => ({ ...p, title: e.target.value }))}
          className="mb-3 text-lg border-blue-200"
        />
        <Textarea
          placeholder="Tell us more about your question, idea, or what you'd like to discuss..."
          value={newPost.content}
          onChange={(e) => setNewPost((p) => ({ ...p, content: e.target.value }))}
          className="mb-4 min-h-[120px] border-blue-200"
        />
        <div className="flex justify-end">
          <Button onClick={handleCreate} size="lg" className="px-6 bg-blue-600 hover:bg-blue-700">
            Post Discussion
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        {posts.map((post) => (
          <Card
            key={post.id}
            className={`p-6 bg-white shadow-md hover:shadow-lg transition-shadow border-2 ${
              post.isPinned ? "border-yellow-400 bg-yellow-50" : "border-gray-200"
            }`}
          >
            {post.isPinned && (
              <div className="absolute top-4 right-4 flex items-center text-yellow-600">
                <Pin className="mr-1" size={18} />
                <span className="font-semibold text-sm">Pinned by Teacher</span>
              </div>
            )}
            
            <div className="flex space-x-4">
              <VoteButtons post={post} />
              
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <Link href={`/forum/${post.id}`} className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
                      {post.title}
                    </h2>
                  </Link>
                  
                  {(userData?.role === "teacher" || userData?.role === "admin") && (
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePin(post.id)}
                        title="Pin/Unpin Post"
                        className="h-8 w-8 text-yellow-600 hover:text-yellow-700"
                      >
                        <Pin size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(post.id)}
                        title="Delete Post"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  )}
                </div>
                
                <p className="text-gray-700 mb-3 line-clamp-3">{post.content}</p>
                
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                  <span className="flex items-center space-x-1">
                    <User size={14} />
                    <span>{post.authorName}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock size={14} />
                    <span>{formatTimeAgo(post.createdAt)}</span>
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {post.role === 'teacher' ? '👩‍🏫 Teacher' : post.role === 'admin' ? '👨‍💼 Admin' : '👨‍🎓 Student'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      {emojiList.map((emoji) => (
                        <Button
                          key={emoji}
                          variant={
                            post.reactions?.[user?.uid] === emoji
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => handleReact(post.id, emoji)}
                          className="h-7 px-2 text-xs rounded-full"
                        >
                          <span>{emoji}</span>
                          <span className="ml-1 text-xs">
                            {
                              Object.values(post.reactions || {}).filter(
                                (e) => e === emoji
                              ).length
                            }
                          </span>
                        </Button>
                      ))}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setReplyOpen((prev) => ({
                          ...prev,
                          [post.id]: !prev[post.id],
                        }))
                      }
                      className="flex items-center space-x-1 text-blue-600"
                    >
                      <MessageSquare size={16} />
                      <span>Reply ({post.replies?.length || 0})</span>
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{post.replies?.length || 0} comments</span>
                    <span>{Object.keys(post.reactions || {}).length} reactions</span>
                  </div>
                </div>
                
                {replyOpen[post.id] && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <Textarea
                      placeholder="Share your thoughts or ask a question..."
                      value={replyContent[post.id] || ""}
                      onChange={(e) =>
                        setReplyContent((prev) => ({
                          ...prev,
                          [post.id]: e.target.value,
                        }))
                      }
                      className="mb-3 min-h-[80px]"
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setReplyOpen((prev) => ({ ...prev, [post.id]: false }))}
                      >
                        Cancel
                      </Button>
                      <Button onClick={() => handleReply(post.id)} className="bg-blue-600 hover:bg-blue-700">
                        Post Reply
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {posts.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No discussions yet</h3>
          <p className="text-gray-500">Be the first to start a discussion with your classmates!</p>
        </div>
      )}
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

export default ForumPage;