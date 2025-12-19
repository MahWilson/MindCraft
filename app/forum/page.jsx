"use client";
import React, { useEffect, useMemo, useState, memo, useCallback, useRef } from 'react';
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
  Bold,
  Italic,
  List as ListIcon,
  ListOrdered,
  Quote,
  Code as CodeIcon,
  Link2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { ImageGallery } from '@/components/ui/image-gallery';
import { timeAgo, roleFlair } from '@/lib/utils';
import { db } from '@/firebase';
import { collection, onSnapshot, orderBy, query, serverTimestamp, addDoc, doc, getDoc, updateDoc, deleteDoc, deleteField, limit } from 'firebase/firestore';
import { storage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });

const TAG_OPTIONS = ['Database', 'Bug', 'Exam', 'Help', 'React', 'Project', 'Idea', 'UI'];
const SORT_OPTIONS = [
  { value: 'new', label: 'Newest' },
  { value: 'active', label: 'Most Active' },
  { value: 'unanswered', label: 'Unanswered' },
  { value: 'top', label: 'Top' },
];
const MOD_ROLES = ['admin', 'teacher', 'instructor'];
const COMMUNITY_OPTIONS = ['General', 'React', 'UI', 'Backend', 'Database', 'Exam', 'Help'];
const FLAIRS = ['Question', 'Discussion', 'Tutorial', 'Bug', 'Idea'];
const MAX_TITLE = 300;

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
  const [similarSort, setSimilarSort] = useState('relevance'); // relevance | date | popularity
  const [searchCache, setSearchCache] = useState({});
  const [community, setCommunity] = useState('');
  const [communityQuery, setCommunityQuery] = useState('');
  const [nsfw, setNsfw] = useState(false);
  const [flair, setFlair] = useState('');
  const [postType, setPostType] = useState('text'); // text | link | media | poll
  const [suggestedCommunities, setSuggestedCommunities] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [violations, setViolations] = useState([]);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const contentInputRef = useRef(null);
  const applyFormat = useCallback((fmt) => {
    const el = contentInputRef.current;
    const val = newPost.content || "";
    const start = el?.selectionStart ?? val.length;
    const end = el?.selectionEnd ?? val.length;
    const sel = val.slice(start, end);
    let before = val.slice(0, start);
    let after = val.slice(end);
    let insert = "";
    if (fmt === "bold") insert = `**${sel || ""}**`;
    if (fmt === "italic") insert = `_${sel || ""}_`;
    if (fmt === "olist") insert = `${sel || "\n1. Item\n2. Item"}`;
    if (fmt === "ulist") insert = `${sel || "\n- Item\n- Item"}`;
    if (fmt === "link") insert = sel ? `[${sel}](https://example.com)` : "[text](https://example.com)";
    if (fmt === "quote") insert = sel ? `\n> ${sel}` : "\n> quoted text";
    if (fmt === "code") insert = sel ? `\n\`\`${sel}\`\`` : "\n```\ncode\n```";
    const next = before + insert + after;
    setNewPost((p) => ({ ...p, content: next }));
    requestAnimationFrame(() => {
      if (el) {
        const caret = before.length + insert.length;
        el.focus();
        el.setSelectionRange(caret, caret);
      }
    });
  }, [newPost.content]);
  const analyzeLocal = useCallback(async (q, lim = 8) => {
    const STOPWORDS = new Set(['the','a','an','and','or','but','to','of','in','on','for','with','from','by','is','are','was','were','be','been','it','that','this','as','at','we','you','they','i','he','she','them','us','our','your']);
    const tokenize = (s) => (s || '').toLowerCase().replace(/[`~!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/]/g, ' ').split(/\s+/).filter(Boolean);
    const filterTokens = (tokens) => tokens.filter(t => t.length > 1 && !STOPWORDS.has(t));
    const buildBigrams = (tokens) => { const b=[]; for (let i=0;i<tokens.length-1;i++) b.push(tokens[i]+' '+tokens[i+1]); return b; };
    const jaccard = (aSet,bSet) => { const inter=new Set([...aSet].filter(x=>bSet.has(x))).size; const union=new Set([...aSet,...bSet]).size; return union===0?0:inter/union; };
    const tfScore = (tokens, qTokens) => { const c={}; tokens.forEach(t=>{c[t]=(c[t]||0)+1}); return qTokens.reduce((s,qt)=>s+(c[qt]||0),0)/Math.max(tokens.length,1); };
    const recencyWeight = (createdAt) => { try{ const t=createdAt?.toMillis?createdAt.toMillis():new Date(createdAt).getTime(); if(!t||Number.isNaN(t)) return 0.8; const days=Math.max((Date.now()-t)/(1000*60*60*24),0); const w=Math.exp(-days/90); return Math.min(Math.max(w,0.4),1);}catch{return 0.8} };
    const activityWeight = (replies) => { const n=Array.isArray(replies)?replies.length:0; return Math.min(1,0.6+Math.log10(1+n)*0.2) };
    const makeSnippet = (content, qTokens) => { const text=(content||'').trim(); if(!text) return ''; const lower=text.toLowerCase(); let idx=-1; for(const qt of qTokens){ const found=lower.indexOf(qt); if(found!==-1){ idx=found; break; } } if(idx===-1) return text.slice(0,200); const start=Math.max(idx-60,0); const end=Math.min(idx+140,text.length); return (start>0?'…':'')+text.slice(start,end)+(end<text.length?'…':''); };
    const qTokens = filterTokens(tokenize(q.toLowerCase()));
    if (qTokens.length === 0) return [];
    const qBig = new Set(buildBigrams(qTokens));
    const qSet = new Set(qTokens);
    const qCol = query(collection(db,'post'), orderBy('createdAt','desc'), limit(100));
    const snap = await new Promise((resolve, reject) => onSnapshot(qCol, (s) => resolve(s), (e)=>reject(e)));
    const scored = [];
    snap.forEach((d) => {
      const data = d.data();
      const title = data.title || '';
      const content = data.content || '';
      const replies = Array.isArray(data.replies) ? data.replies : [];
      const tTokens = filterTokens(tokenize(title));
      const cTokens = filterTokens(tokenize(content));
      const tSet = new Set(tTokens);
      const cSet = new Set(cTokens);
      const big = new Set([...buildBigrams(tTokens), ...buildBigrams(cTokens)]);
      const jacc = Math.max(jaccard(qSet, tSet), jaccard(qSet, cSet));
      const bigOv = jaccard(qBig, big);
      const tf = Math.max(tfScore(tTokens, qTokens), tfScore(cTokens, qTokens));
      const rec = recencyWeight(data.createdAt);
      const act = activityWeight(replies);
      const raw = 0.35*jacc + 0.20*bigOv + 0.20*tf + 0.15*rec + 0.10*act;
      const score = Math.round(Math.min(Math.max(raw,0),1)*100);
      if (score < 10) return;
      const hasInstructorReply = replies.some(r => MOD_ROLES.includes(r.role));
      scored.push({
        id: d.id,
        title,
        snippet: makeSnippet(content, qTokens),
        tags: Array.isArray(data.tags) ? data.tags : [],
        resolutionStatus: data.resolutionStatus || 'unanswered',
        hasInstructorReply,
        createdAt: data.createdAt || null,
        score,
        replyCount: replies.length
      });
    });
    scored.sort((a,b)=>b.score-a.score);
    return scored.slice(0, lim);
  }, []);
  const highlightText = useCallback((text, q) => {
    const t = String(text || '');
    const s = String(q || '').trim();
    if (!s || s.length < 2) return t;
    const pattern = new RegExp(`(${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
    const parts = t.split(pattern);
    return parts.map((p, i) => pattern.test(p) ? <span key={i} className="bg-yellow-100 text-slate-900 px-[2px] rounded">{p}</span> : p);
  }, []);
  const isModerator = MOD_ROLES.includes(userData?.role);
  const [nameMap, setNameMap] = useState({});

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

  const fetchName = useCallback(async (uid) => {
    if (!uid || nameMap[uid]) return;
    try {
      const snap = await getDoc(doc(db, 'user', uid));
      const nm = snap.exists() ? (snap.data().name || '') : '';
      const pic = snap.exists() ? (snap.data().profilePicture || '') : '';
      if (nm || pic) setNameMap((m) => ({ ...m, [uid]: { name: nm, profilePicture: pic } }));
    } catch {}
  }, [nameMap]);

  const getUserName = useCallback(async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'user', uid));
      return snap.exists() ? (snap.data().name || '') : '';
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    const uids = posts.map((p) => p.authorId).filter(Boolean);
    uids.forEach((u) => fetchName(u));
  }, [posts, fetchName]);

  useEffect(() => {
    const q = `${newPost.title || ''} ${newPost.content || ''}`.trim();
    if (!q || q.length < 2) {
      setSimilarResults([]);
      setSuggestedCommunities([]);
      setSentiment(null);
      setViolations([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        setSimilarLoading(true);
        const cached = searchCache[q];
        if (cached && Date.now() - cached.ts < 60000) {
          if (!cancelled) {
            setSimilarResults(cached.results || []);
            setSuggestedCommunities(cached.suggested || []);
          }
        } else {
          const res = await fetch('/api/forum/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: q, limit: 8 }),
          });
          if (!res.ok) throw new Error('analyze failed');
          const data = await res.json();
          const server = data.results || [];
          if (server.length > 0) {
            if (!cancelled) {
              setSimilarResults(server);
              const counts = Object.create(null);
              server.forEach((r) => {
                const tags = Array.isArray(r.tags) ? r.tags : [];
                tags.forEach((t) => { counts[t] = (counts[t] || 0) + 1; });
              });
              const suggested = Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k])=>k).slice(0,5);
              setSuggestedCommunities(suggested);
              setSearchCache((c) => ({ ...c, [q]: { ts: Date.now(), results: server, suggested } }));
            }
          } else {
            const local = await analyzeLocal(q, 8);
            if (!cancelled) {
              setSimilarResults(local || []);
              setSuggestedCommunities([]);
              setSearchCache((c) => ({ ...c, [q]: { ts: Date.now(), results: local || [], suggested: [] } }));
            }
          }
        }
      } catch {
        try {
          const local = await analyzeLocal(q, 8);
          if (!cancelled) {
            setSimilarResults(local || []);
            setSuggestedCommunities([]);
          }
        } catch {
          if (!cancelled) setSimilarResults([]);
        }
      } finally {
        if (!cancelled) setSimilarLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [newPost.title, newPost.content, searchCache]);

  const filteredCommunities = useMemo(() => {
    const q = communityQuery.trim().toLowerCase();
    if (!q) return COMMUNITY_OPTIONS;
    return COMMUNITY_OPTIONS.filter((c) => c.toLowerCase().includes(q));
  }, [communityQuery]);

  const sentimentScore = useCallback((txt) => {
    const pos = ['great','good','love','awesome','helpful','thanks','cool','nice'];
    const neg = ['bad','hate','stupid','dumb','terrible','awful','bug','error','fail'];
    const t = (txt || '').toLowerCase();
    let p=0,n=0;
    pos.forEach((w)=>{ if (t.includes(w)) p++; });
    neg.forEach((w)=>{ if (t.includes(w)) n++; });
    const total = p+n;
    const score = total ? Math.round((p/total)*100) : 50;
    return { score, label: score>=60?'Positive':score<=40?'Negative':'Neutral' };
  }, []);

  useEffect(() => {
    const q = `${newPost.title || ''} ${newPost.content || ''}`.trim();
    if (!q || q.length < 2) { setSentiment(null); setViolations([]); return; }
    setSentiment(sentimentScore(q));
    const issues = [];
    if (nsfw) issues.push({ type: 'warning', msg: 'Marked NSFW — ensure content follows guidelines' });
    if (q.match(/\b(?:damn|hell|shit)\b/i)) issues.push({ type: 'error', msg: 'Contains profanity' });
    if (q.length < 10) issues.push({ type: 'hint', msg: 'Add more details for better responses' });
    setViolations(issues);
  }, [newPost.title, newPost.content, nsfw, sentimentScore]);

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
      if (sortBy === 'top') {
        const sa = a.score || 0;
        const sb = b.score || 0;
        if (sb !== sa) return sb - sa;
      }
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
    if (!newPost.title.trim()) {
      alert('Please provide a title and content');
      return;
    }
    if (newPost.title.trim().length > MAX_TITLE) {
      alert(`Title must be ${MAX_TITLE} characters or fewer`);
      return;
    }
    if (postType === 'link' && newPost.content && !/^https?:\/\//i.test(newPost.content.trim())) {
      alert('Provide a valid URL starting with http/https');
      return;
    }
    const lc = `${newPost.title} ${newPost.content}`.toLowerCase();
    const prohibited = ['nsfw','porn','sex','nude','explicit','xxx','adult','hate','racist','homophobic','terror','violence'];
    if (prohibited.some((w)=>lc.includes(w))) {
      alert('Content violates community guidelines');
      return;
    }
    if (!user) {
      alert('Please sign in');
      return;
    }
    
    setLoading(true);
    try {
      const imageUrls = await uploadImages(files);
      const authorNameResolved = (await getUserName(user.uid)) || '';
      const postData = {
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        authorId: user.uid,
        authorName: authorNameResolved || userData?.name || user.displayName || (user.email?.split('@')[0] || 'User'),
        role: userData?.role || 'student',
        images: imageUrls,
        tags,
        nsfw,
        flair,
        postType,
        context: community || null,
        pollOptions: postType === 'poll' ? pollOptions.filter((x)=>x.trim()).slice(0,6) : undefined,
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
      setCommunity('');
      setCommunityQuery('');
      setNsfw(false);
      setFlair('');
      setPostType('text');
      setComposerOpen(false);
      setShowPreview(false);
      // alert('Post created successfully'); // removed success alert to reduce annoyance
    } catch (error) {
      console.error('Post creation failed:', error);
      const authorNameResolved = (await getUserName(user.uid)) || '';
      const success = await createPostFallback({
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        authorId: user.uid,
        authorName: authorNameResolved || userData?.name || user.displayName || (user.email?.split('@')[0] || 'User'),
        role: userData?.role || 'student',
        images: [],
        tags,
        nsfw,
        flair,
        postType,
        context: community || null,
        pollOptions: postType === 'poll' ? pollOptions.filter((x)=>x.trim()).slice(0,6) : undefined,
      });
      
      if (success) {
        setNewPost({ title: '', content: '' });
        setFiles([]);
        setTags([]);
        setCommunity('');
        setCommunityQuery('');
        setNsfw(false);
        setFlair('');
        setPostType('text');
        setComposerOpen(false);
        setShowPreview(false);
      } else {
        alert('Failed to create post. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [newPost, files, tags, nsfw, flair, postType, community, user, userData, uploadImages, createPostFallback]);

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
              nameMap={nameMap}
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
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Input
                        placeholder="Select a community"
                        aria-label="Select a community"
                        value={communityQuery}
                        onChange={(e) => setCommunityQuery(e.target.value)}
                        className="w-64"
                      />
                      <div className="absolute left-0 right-0 z-10 mt-1 w-64 max-h-40 overflow-y-auto rounded-md border bg-white dark:bg-slate-800 shadow-lg transition-all">
                        {filteredCommunities.map((c) => (
                          <button
                            key={c}
                            className={`w-full text-left px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 ${community===c?'bg-slate-100 dark:bg-slate-700':''}`}
                            role="option"
                            onClick={() => { setCommunity(c); setCommunityQuery(c); }}
                          >
                            {c}
                          </button>
                        ))}
                        {suggestedCommunities.length > 0 && (
                          <div className="px-2 py-1 text-[11px] text-slate-500">Suggested: {suggestedCommunities.join(", ")}</div>
                        )}
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">NSFW content is prohibited</span>
                      <select value={flair} onChange={(e)=>setFlair(e.target.value)} className="text-sm border rounded px-2 py-1">
                        <option value="">Flair</option>
                        {FLAIRS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {['text','media','link','poll'].map((t) => (
                      <button
                        key={t}
                        className={`px-3 py-1 rounded ${postType===t?'border-b-2 border-indigo-600 font-medium':'text-slate-600'}`}
                        onClick={() => setPostType(t)}
                        aria-label={`Post type ${t}`}
                      >
                        {t === 'text' && <span>Text</span>}
                        {t === 'media' && <span>Images & Video</span>}
                        {t === 'link' && <span>Link</span>}
                        {t === 'poll' && <span>Poll</span>}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Clear, concise title (e.g., 'Fixing debounce in React custom hook')"
                    value={newPost.title}
                    onChange={(e) => setNewPost((p) => ({ ...p, title: e.target.value }))}
                  />
                  <div className="text-[11px] text-slate-500">{(newPost.title || '').length}/{MAX_TITLE}</div>
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
                  {postType === 'text' && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="text-sm text-slate-500 inline-flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-indigo-500" /> Markdown supported</span>
                      <button aria-label="Bold" onClick={()=>applyFormat('bold')} className="px-2 py-1 rounded hover:bg-slate-100"><Bold className="w-4 h-4" /></button>
                      <button aria-label="Italic" onClick={()=>applyFormat('italic')} className="px-2 py-1 rounded hover:bg-slate-100"><Italic className="w-4 h-4" /></button>
                      <button aria-label="Ordered list" onClick={()=>applyFormat('olist')} className="px-2 py-1 rounded hover:bg-slate-100"><ListOrdered className="w-4 h-4" /></button>
                      <button aria-label="Unordered list" onClick={()=>applyFormat('ulist')} className="px-2 py-1 rounded hover:bg-slate-100"><ListIcon className="w-4 h-4" /></button>
                      <button aria-label="Link" onClick={()=>applyFormat('link')} className="px-2 py-1 rounded hover:bg-slate-100"><Link2 className="w-4 h-4" /></button>
                      <button aria-label="Quote" onClick={()=>applyFormat('quote')} className="px-2 py-1 rounded hover:bg-slate-100"><Quote className="w-4 h-4" /></button>
                      <button aria-label="Code" onClick={()=>applyFormat('code')} className="px-2 py-1 rounded hover:bg-slate-100"><CodeIcon className="w-4 h-4" /></button>
                      <Button variant="ghost" size="sm" className="ml-auto gap-2" onClick={() => setShowPreview((p) => !p)}>
                        <Wand2 className="w-4 h-4" />
                        {showPreview ? 'Edit' : 'Preview'}
                      </Button>
                    </div>
                  )}
                  {!showPreview ? (
                    <>
                      {postType === 'text' && (
                        <Textarea
                          rows={10}
                          placeholder="Body text (optional)"
                          value={newPost.content}
                          onChange={(e) => setNewPost((p) => ({ ...p, content: e.target.value }))}
                          ref={contentInputRef}
                          className="font-mono text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      )}
                      {postType === 'media' && (
                        <div
                          className="rounded-lg border border-dashed border-slate-300 p-6 text-center bg-slate-50 dark:bg-slate-900"
                          onDragOver={(e)=>{ e.preventDefault(); e.stopPropagation(); }}
                          onDrop={(e)=>{ e.preventDefault(); const f = Array.from(e.dataTransfer.files || []); setFiles((prev)=>[...prev, ...f]); }}
                        >
                          <p className="text-sm text-slate-600">Drag & drop images/videos here or choose files</p>
                          <div className="mt-3">
                            <input type="file" accept="image/*,video/*" multiple onChange={(e) => setFiles((prev)=>[...prev, ...Array.from(e.target.files || [])])} />
                          </div>
                          {files.length > 0 && (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {files.slice(0,6).map((f,i)=> (
                                <div key={i} className="text-[11px] truncate bg-white/60 border rounded px-2 py-1">{f.name}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {postType === 'link' && (
                        <Input aria-label="URL" placeholder="https://example.com" value={newPost.content} onChange={(e)=>setNewPost((p)=>({ ...p, content: e.target.value }))} />
                      )}
                      {postType === 'poll' && (
                        <div className="space-y-2">
                          {pollOptions.map((opt, idx)=> (
                            <Input key={idx} placeholder={`Option ${idx+1}`} value={opt} onChange={(e)=>setPollOptions((arr)=> arr.map((v,i)=> i===idx ? e.target.value : v))} />
                          ))}
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={()=> setPollOptions((arr)=> arr.length < 6 ? [...arr, ""] : arr)}>Add option</Button>
                            <Button size="sm" variant="outline" onClick={()=> setPollOptions((arr)=> arr.length > 2 ? arr.slice(0,-1) : arr)}>Remove option</Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900 prose prose-slate dark:prose-invert max-w-none min-h-[240px]">
                      <ReactMarkdown>{newPost.content || '_Nothing to preview yet_'}</ReactMarkdown>
                    </div>
                  )}
                  {postType !== 'media' && (
                    <div className="flex items-center gap-3">
                      <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                      {files.length > 0 && (
                        <div className="text-xs text-slate-500">{files.length} attachment{files.length > 1 ? 's' : ''}</div>
                      )}
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setComposerOpen(false); setShowPreview(false); }}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={loading || (newPost.title?.length || 0) > MAX_TITLE}>
                      {loading ? 'Posting...' : 'Post discussion'}
                    </Button>
                  </div>
                </div>
                <div className="border-l border-slate-200 dark:border-slate-800 pl-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Similar questions</p>
                    {similarLoading && <span className="text-[10px] text-slate-500">Searching…</span>}
                  </div>
                  {sentiment && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1"><ShieldCheck className="w-3 h-3" /> Sentiment {sentiment.label} {sentiment.score}%</Badge>
                    </div>
                  )}
                  {violations.length > 0 && (
                    <ul className="mt-1 space-y-1">
                      {violations.map((v, i)=>(
                        <li key={i} className="text-[11px]">{v.msg}</li>
                      ))}
                    </ul>
                  )}
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant={similarSort === 'relevance' ? 'default' : 'outline'} onClick={() => setSimilarSort('relevance')}>Relevance</Button>
                    <Button size="sm" variant={similarSort === 'date' ? 'default' : 'outline'} onClick={() => setSimilarSort('date')}>Date</Button>
                    <Button size="sm" variant={similarSort === 'popularity' ? 'default' : 'outline'} onClick={() => setSimilarSort('popularity')}>Popularity</Button>
                  </div>
                  {(!similarResults || similarResults.length === 0) && !similarLoading && (
                    <p className="text-xs text-slate-500">Start typing a clear title to see existing related threads.</p>
                  )}
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {([...similarResults].sort((a, b) => {
                      if (similarSort === 'date') {
                        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
                        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
                        return tb - ta;
                      }
                      if (similarSort === 'popularity') {
                        const pa = (a.replyCount || 0) + (a.hasInstructorReply ? 1 : 0);
                        const pb = (b.replyCount || 0) + (b.hasInstructorReply ? 1 : 0);
                        if (pb !== pa) return pb - pa;
                        return (b.score || 0) - (a.score || 0);
                      }
                      return (b.score || 0) - (a.score || 0);
                    })).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full text-left rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        onClick={() => window.open(`/forum/${item.id}`, '_blank')}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-200 line-clamp-1">
                            {highlightText(item.title, (newPost.title || '').trim())}
                          </span>
                          <div className="flex items-center gap-2">
                            {typeof item.score === 'number' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {item.score}% match
                              </span>
                            )}
                            <ResolutionBadgeSmall status={item.resolutionStatus} />
                          </div>
                        </div>
                         <p className="text-[11px] text-slate-500 line-clamp-2">{highlightText(item.snippet, (newPost.title || '').trim())}</p>
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

const MetaRow = memo(function MetaRow({ post, nameMap }) {
  const role = roleFlair(post.role);
  const mapped = nameMap?.[post.authorId];
  const displayName = (post.authorName && post.authorName !== 'Anonymous' ? post.authorName : (mapped?.name || null)) || post.authorName || 'User';
  const avatarSrc = mapped?.profilePicture || undefined;
  return (
    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
      <div className="flex items-center gap-2 min-w-0">
        <Avatar src={avatarSrc} name={displayName} className="w-5 h-5 flex-shrink-0" />
        <span className="truncate font-medium text-slate-700 dark:text-slate-200">{displayName}</span>
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
      {post.isExamRelevant && <Badge variant="success" className="text-[10px] gap-1"><BadgeCheck className="w-3 h-3" /> Exam relevant</Badge>}
      {post.isInKnowledgeBase && <Badge variant="secondary" className="text-[10px] gap-1"><ShieldCheck className="w-3 h-3" /> In Knowledge Base</Badge>}
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

const PostCard = memo(function PostCard({ post, user, isModerator, onVote, onReact, onPin, onLock, onDelete, nameMap }) {
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
          <div className="text-[11px] text-slate-600 dark:text-slate-300">{post.score || 0}</div>
          <button 
            onClick={() => onVote(post, 'downvote')} 
            className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Downvote"
          >
            <ArrowBigDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
        </aside>

        <main className="p-4 space-y-2">
          <MetaRow post={post} nameMap={nameMap} />

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
