"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { db } from "@/firebase";
import { doc, getDoc, onSnapshot, updateDoc, setDoc } from "firebase/firestore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ImageGallery } from "@/components/ui/image-gallery";
import { timeAgo, roleFlair } from "@/lib/utils";
import {
  BadgeCheck,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ArrowBigUp,
  ArrowBigDown,
  Reply,
  ShieldCheck,
} from "lucide-react";
import { CodeBlockPlus } from "@/components/CodeBlockPlus";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });
const MOD_ROLES = ["admin", "teacher", "instructor"];

function detectAcademicSections(content) {
  if (!content) return [{ type: "content", text: content }];
  const sections = [];
  const lines = content.split("\n");
  let current = { type: "content", text: "" };
  const patterns = {
    problem: /^(?:#+\s*)?(?:problem|issue|bug|error)/i,
    context: /^(?:#+\s*)?(?:context|background|situation)/i,
    attempts: /^(?:#+\s*)?(?:attempt|tried|what.*tried)/i,
    instructor: /^(?:#+\s*)?(?:instructor.*notes?|teacher.*notes?|notes?)/i,
    expected: /^(?:#+\s*)?(?:expected|want|should|need)/i,
    actual: /^(?:#+\s*)?(?:actual|getting|result)/i,
  };
  for (const line of lines) {
    let found = false;
    for (const [type, re] of Object.entries(patterns)) {
      if (re.test(line.trim())) {
        if (current.text.trim()) sections.push(current);
        current = { type, text: "" };
        found = true;
        break;
      }
    }
    if (!found) current.text += (current.text ? "\n" : "") + line;
  }
  if (current.text.trim()) sections.push(current);
  return sections.length > 0 ? sections : [{ type: "content", text: content }];
}

function AcademicSection({ type, children }) {
  const config = {
    problem: { label: "Problem", color: "red", icon: "🐛" },
    context: { label: "Context", color: "blue", icon: "📋" },
    attempts: { label: "Attempts", color: "yellow", icon: "🔧" },
    instructor: { label: "Instructor Notes", color: "purple", icon: "👨‍🏫" },
    expected: { label: "Expected", color: "green", icon: "✅" },
    actual: { label: "Actual", color: "orange", icon: "⚠️" },
    content: { label: "Content", color: "gray", icon: "📝" },
  }[type] || { label: "Content", color: "gray", icon: "📝" };
  const colors = {
    red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
    yellow: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300",
    purple: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300",
    green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300",
    orange: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300",
    gray: "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300",
  };
  return (
    <div className={`mb-4 border rounded-lg p-4 ${colors[config.color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">{config.icon}</span>
        <span className="text-[10px] uppercase tracking-[0.14em] font-semibold">
          {config.label}
        </span>
      </div>
      <div className="prose prose-slate dark:prose-invert max-w-none text-sm">
        {children}
      </div>
    </div>
  );
}

export default function TopicPage({ params }) {
  const { id } = params;
  const { user, userData } = useAuth();
  const isModerator = MOD_ROLES.includes(userData?.role);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [text, setText] = useState("");
  const [sort, setSort] = useState("new");
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);

  const markdownComponents = useMemo(
    () => ({
      code: (props) => <CodeBlockPlus {...props} />,
    }),
    []
  );

  useEffect(() => {
    const ref = doc(db, "post", id);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setPost({ id: snap.id, ...snap.data() });
      else setPost(null);
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!isModerator || !id || notesLoaded) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/forum/notes?postId=${encodeURIComponent(id)}&userRole=${encodeURIComponent(
            userData?.role || ""
          )}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.fallback) {
            // API returned fallback flag - use client-side Firestore
            const notesRef = doc(db, "instructor_notes", id);
            const notesSnap = await getDoc(notesRef);
            if (notesSnap.exists()) {
              const notesData = notesSnap.data();
              setNotes(notesData.notes || "");
            }
          } else {
            setNotes(data.notes || "");
          }
        } else {
          // Fallback to client-side Firestore
          const notesRef = doc(db, "instructor_notes", id);
          const notesSnap = await getDoc(notesRef);
          if (notesSnap.exists()) {
            const notesData = notesSnap.data();
            setNotes(notesData.notes || "");
          }
        }
      } catch {
        // Silently fail - notes are optional
      } finally {
        setNotesLoaded(true);
      }
    })();
  }, [id, isModerator, notesLoaded, userData?.role]);

  useEffect(() => {
    if (!post) return;
    const list = Array.isArray(post.replies) ? post.replies : [];
    const sorted = [...list].sort((a, b) => {
      if (sort === "top") return (b.score || 0) - (a.score || 0);
      const ta = a.createdAt?.toMillis
        ? a.createdAt.toMillis()
        : new Date(a.createdAt).getTime();
      const tb = b.createdAt?.toMillis
        ? b.createdAt.toMillis()
        : new Date(b.createdAt).getTime();
      return tb - ta;
    });
    setReplies(sorted);
  }, [post, sort]);

  const tree = useMemo(() => {
    const byId = Object.create(null);
    replies.forEach((r) => {
      byId[r.id] = { ...r, children: [] };
    });
    const roots = [];
    replies.forEach((r) => {
      if (r.parentReplyId) {
        const parent = byId[r.parentReplyId];
        if (parent) parent.children.push(byId[r.id]);
        else roots.push(byId[r.id]);
      } else roots.push(byId[r.id]);
    });
    return roots;
  }, [replies]);

  const toggle = (rid) =>
    setExpanded((e) => ({
      ...e,
      [rid]: !e[rid],
    }));

  const sendReply = async () => {
    if (!text.trim()) return alert("Enter a reply");
    if (!user) return alert("Please sign in");
    const contentToSend = text.trim();
    setText(""); // Clear input immediately for better UX
    try {
      const res = await fetch("/api/forum/reply-enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: id,
          authorId: user.uid,
          authorName: user.displayName || "Anonymous",
          role: userData?.role || "student",
          content: contentToSend,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // If API says to use fallback, use client-side Firestore
        if (data.fallback) {
          console.log("API returned fallback flag, using client-side Firestore");
          try {
            await appendReply({ content: contentToSend });
            console.log("Reply posted successfully via client-side fallback");
          } catch (err) {
            console.error("Failed to append reply:", err);
            alert("Failed to post reply. Please try again.");
            setText(contentToSend); // Restore text on error
          }
        } else if (data.success) {
          console.log("Reply posted successfully via API");
          // API handled it successfully - do nothing, the real-time listener will update
        } else {
          // Unexpected response - use fallback as safety
          console.warn("Unexpected API response, using fallback:", data);
          try {
            await appendReply({ content: contentToSend });
          } catch (err) {
            console.error("Failed to append reply:", err);
            alert("Failed to post reply. Please try again.");
            setText(contentToSend);
          }
        }
      } else {
        // API failed - use client-side fallback
        try {
          await appendReply({ content: contentToSend });
        } catch (err) {
          console.error("Failed to append reply:", err);
          alert("Failed to post reply. Please try again.");
          setText(contentToSend); // Restore text on error
        }
      }
    } catch (err) {
      console.error("Error sending reply:", err);
      try {
        await appendReply({ content: contentToSend });
      } catch (fallbackErr) {
        console.error("Failed to append reply:", fallbackErr);
        alert("Failed to post reply. Please try again.");
        setText(contentToSend); // Restore text on error
      }
    }
  };

  const appendReply = async ({ content, parentReplyId }) => {
    if (!user) {
      console.error("Cannot append reply: user not available");
      return;
    }
    try {
      const pRef = doc(db, "post", id);
      const snap = await getDoc(pRef);
      if (!snap.exists()) {
        console.error("Post not found:", id);
        return;
      }
      const data = snap.data();
      const arr = Array.isArray(data.replies) ? data.replies : [];
      const newReply = {
        id: crypto.randomUUID(),
        authorId: user.uid,
        authorName: user.displayName || "Anonymous",
        role: userData?.role || "student",
        content: content.trim(),
        createdAt: new Date(),
        votes: {},
        score: 0,
        parentReplyId: parentReplyId || null,
      };
      await updateDoc(pRef, { replies: [...arr, newReply] });
    } catch (err) {
      console.error("Error in appendReply:", err);
      throw err; // Re-throw so caller can handle
    }
  };

  const vote = async (replyId, voteType) => {
    if (!user) return alert("Please sign in");
    try {
      const res = await fetch("/api/forum/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: id,
          replyId,
          userId: user.uid,
          voteType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.fallback) {
          await mutateVotes(replyId, voteType);
        }
      } else {
        await mutateVotes(replyId, voteType);
      }
    } catch {
      await mutateVotes(replyId, voteType);
    }
  };

  const mutateVotes = async (replyId, voteType) => {
    const pRef = doc(db, "post", id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) return;
        const data = snap.data();
        const arr = Array.isArray(data.replies) ? data.replies : [];
        const updated = arr.map((r) => {
          if (r.id !== replyId) return r;
          const votes = { ...(r.votes || {}) };
          const current = votes[user.uid];
          let delta = 0;
      if (current === voteType) {
        delete votes[user.uid];
        delta = voteType === "upvote" ? -1 : 1;
      } else if (current) {
        votes[user.uid] = voteType;
        delta = voteType === "upvote" ? 2 : -2;
      } else {
        votes[user.uid] = voteType;
        delta = voteType === "upvote" ? 1 : -1;
      }
        return { ...r, votes, score: (r.score || 0) + delta };
      });
      await updateDoc(pRef, { replies: updated });
  };

  const replyTo = async (parentId, content) => {
    const msg = (content ?? "").trim();
    if (!msg) return alert("Enter a reply");
    if (!user) return alert("Please sign in");
    try {
      const res = await fetch("/api/forum/reply-enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: id,
          authorId: user.uid,
          authorName: user.displayName || "Anonymous",
          role: userData?.role || "student",
          content: msg,
          parentReplyId: parentId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.fallback) {
          await appendReply({ content: msg, parentReplyId: parentId });
        }
      } else {
        await appendReply({ content: msg, parentReplyId: parentId });
      }
    } catch {
      await appendReply({ content: msg, parentReplyId: parentId });
    }
  };

  const del = async (replyId) => {
    if (!user) return alert("Please sign in");
    if (!confirm("Delete this reply?")) return;
    try {
      const res = await fetch("/api/forum/reply-enhanced", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: id,
          replyId,
          userId: user.uid,
          userRole: userData?.role,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.fallback) {
          await removeReply(replyId);
        }
      } else {
        await removeReply(replyId);
      }
    } catch {
      await removeReply(replyId);
    }
  };

  const removeReply = async (replyId) => {
    const pRef = doc(db, "post", id);
        const snap = await getDoc(pRef);
        if (!snap.exists()) return;
        const data = snap.data();
        const arr = Array.isArray(data.replies) ? data.replies : [];
    const target = arr.find((r) => r.id === replyId);
    if (!target) return;
    const canDelete = isModerator || target.authorId === user?.uid;
    if (!canDelete) return alert("Only teachers/admins or the reply author can delete");
        const updated = arr.filter((r) => r.id !== replyId);
        await updateDoc(pRef, { replies: updated });
  };

  const updateResolutionStatus = async (newStatus) => {
    const pRef = doc(db, "post", id);
      const snap = await getDoc(pRef);
      if (!snap.exists()) return;
    const update = { resolutionStatus: newStatus };
    if (newStatus !== "solved") {
      update.acceptedReplyId = null;
    }
    await updateDoc(pRef, update);
  };

  if (loading) {
    return <SkeletonTopicPage />;
  }

  if (!post) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4">
        <Link href="/forum" className="text-indigo-600 hover:underline">
          ← Back to Forum
        </Link>
      <div className="mt-6">Topic not found</div>
    </div>
  );
  }

  const instructorReplied =
    Array.isArray(post.replies) && post.replies.some((r) => MOD_ROLES.includes(r.role));
  const hasCode = !!(post.content && post.content.includes("```"));

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-900">
      <div className="max-w-5xl mx-auto py-10 px-4 space-y-6 md:grid md:grid-cols-[minmax(0,1.2fr)_260px] md:gap-6">
        <div className="space-y-6">
          <Link href="/forum" className="text-indigo-600 hover:underline text-sm">
            ← Back to Forum
          </Link>

          <Card className="p-6 shadow-sm bg-white/80 dark:bg-slate-800/80">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
                  <Avatar name={post.authorName} className="w-10 h-10" />
                  <div>
                    <div className="text-xs text-slate-500">
                      Posted by {post.authorName || "Anonymous"}
                    </div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const f = roleFlair(post.role);
                        return <Badge variant={f.variant}>{f.emoji} {f.label}</Badge>;
                      })()}
                      <span className="text-xs text-slate-500">{timeAgo(post.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {post.isPinned && (
                    <Badge variant="secondary" className="gap-1">
                      <BadgeCheck className="w-3 h-3" /> Pinned
                    </Badge>
                  )}
                  {post.isLocked && <Badge variant="warning">Locked</Badge>}
                  {post.isExamRelevant && (
                    <Badge variant="warning" className="gap-1">
                      Exam relevant
                    </Badge>
                  )}
                  {post.isInKnowledgeBase && (
                    <Badge variant="secondary" className="gap-1">
                      In Knowledge Base
                    </Badge>
                  )}
                  {instructorReplied && (
                    <Badge variant="success" className="gap-1">
                      <ShieldCheck className="w-3 h-3" /> Instructor replied
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mr-2">
                  {post.title}
                </h1>
                <ResolutionChip resolutionStatus={post.resolutionStatus} />
          </div>

              {hasCode ? (
                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="space-y-4">
                    {detectAcademicSections(post.content || "").map((section, index) => (
                      <AcademicSection key={index} type={section.type}>
                        <ReactMarkdown components={markdownComponents}>{section.text}</ReactMarkdown>
                      </AcademicSection>
                    ))}
          </div>
        </div>
              ) : (
                <div className="space-y-4">
                  {detectAcademicSections(post.content || "").map((section, index) => (
                    <AcademicSection key={index} type={section.type}>
                      <ReactMarkdown components={markdownComponents}>{section.text}</ReactMarkdown>
                    </AcademicSection>
                  ))}
                </div>
              )}

        {Array.isArray(post.images) && post.images.length > 0 && (
            <ImageGallery images={post.images} />
              )}
              {Array.isArray(post.tags) && post.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {post.tags.map((t, i) => (
                    <Badge key={i} variant="outline">
                      #{t}
                    </Badge>
                  ))}
          </div>
        )}

              {isModerator && (
                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  <Button
                    size="sm"
                    variant={post.isExamRelevant ? "default" : "outline"}
                    onClick={async () => {
                      await fetch("/api/forum/exam", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          postId: post.id,
                          userId: user?.uid,
                          userRole: userData?.role,
                          isExamRelevant: !post.isExamRelevant,
                        }),
                      });
                    }}
                  >
                    {post.isExamRelevant ? "Unset exam relevant" : "Mark exam relevant"}
                  </Button>
                  {!post.isInKnowledgeBase && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await fetch("/api/forum/promote", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            postId: post.id,
                            userId: user?.uid,
                            userRole: userData?.role,
                          }),
                        });
                      }}
                    >
                      Promote to Knowledge Base
                    </Button>
                  )}
          </div>
        )}
            </div>
      </Card>

      {!post.isLocked && (
            <Card className="p-5 bg-white/80 dark:bg-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Join the conversation</p>
                <Badge variant="secondary" className="gap-1">
                  <MessageSquare className="w-3 h-3" /> Markdown supported
                </Badge>
              </div>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a thoughtful, code-friendly reply..."
                className="font-mono"
                rows={5}
              />
              <div className="flex justify-between mt-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Resolution:</span>
                  <ResolutionChip resolutionStatus={post.resolutionStatus} />
                  {(isModerator || user?.uid === post.authorId) && (
                    <>
                      <Button
                        size="sm"
                        variant={post.resolutionStatus === "solved" ? "default" : "outline"}
                        onClick={async () => {
                          const newStatus = post.resolutionStatus === "solved" ? "in_progress" : "solved";
                          try {
                            const res = await fetch("/api/forum/status", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                postId: post.id,
                                userId: user.uid,
                                userRole: userData?.role,
                                resolutionStatus: newStatus,
                              }),
                            });
                            if (res.ok) {
                              const data = await res.json();
                              if (data.fallback) {
                                await updateResolutionStatus(newStatus);
                              }
                            } else {
                              await updateResolutionStatus(newStatus);
                            }
                          } catch {
                            await updateResolutionStatus(newStatus);
                          }
                        }}
                      >
                        {post.resolutionStatus === "solved" ? "Mark in progress" : "Mark solved"}
                      </Button>
                    </>
                  )}
                </div>
                <Button onClick={sendReply}>Post comment</Button>
          </div>
        </Card>
      )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              {Array.isArray(post?.replies) ? post.replies.length : 0} Comments
            </div>
            <div className="flex gap-2">
              <Button variant={sort === "new" ? "default" : "outline"} onClick={() => setSort("new")}>
                Newest
              </Button>
              <Button variant={sort === "top" ? "default" : "outline"} onClick={() => setSort("top")}>
                Top
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {post.acceptedReplyId && (
              <AcceptedAnswerBanner
                post={post}
                replies={replies}
                onVote={vote}
                onDelete={del}
                onReply={replyTo}
                expanded={expanded}
                toggle={toggle}
              />
            )}
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
                acceptedReplyId={post.acceptedReplyId}
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

        <aside className="mt-10 md:mt-0 space-y-4">
          <TimelineRail post={post} replies={replies} />
          {isModerator && (
            <Card className="p-4 bg-slate-50/70 dark:bg-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Instructor notes
                </p>
              </div>
              <Textarea
                rows={6}
                className="text-xs"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Private notes for instructors only. Summarize misconceptions, follow-ups, or exam hints."
              />
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!user) return;
                    setNotesSaving(true);
                    try {
                      const res = await fetch("/api/forum/notes", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          postId: post.id,
                          userId: user.uid,
                          userRole: userData?.role,
                          notes,
                        }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        if (data.fallback) {
                          // API returned fallback flag - use client-side Firestore
                          const notesRef = doc(db, "instructor_notes", post.id);
                          await setDoc(
                            notesRef,
                            {
                              notes,
                              updatedAt: new Date(),
                              updatedBy: user.uid,
                            },
                            { merge: true }
                          );
                        }
                      } else {
                        // Fallback to client-side Firestore
                        const notesRef = doc(db, "instructor_notes", post.id);
                        await setDoc(
                          notesRef,
                          {
                            notes,
                            updatedAt: new Date(),
                            updatedBy: user.uid,
                          },
                          { merge: true }
                        );
                      }
                    } catch (err) {
                      // Fallback to client-side Firestore on error
                      try {
                        const notesRef = doc(db, "instructor_notes", post.id);
                        await setDoc(
                          notesRef,
                          {
                            notes,
                            updatedAt: new Date(),
                            updatedBy: user.uid,
                          },
                          { merge: true }
                        );
                      } catch (fallbackErr) {
                        console.error("Failed to save notes:", fallbackErr);
                        alert("Failed to save notes. Please try again.");
                      }
                    } finally {
                      setNotesSaving(false);
                    }
                  }}
                  disabled={notesSaving}
                >
                  {notesSaving ? "Saving..." : "Save notes"}
                </Button>
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function ResolutionChip({ resolutionStatus }) {
  const status = resolutionStatus || "unanswered";
  if (status === "solved") {
    return <Badge variant="success" className="text-xs">Solved</Badge>;
  }
  if (status === "in_progress") {
    return <Badge variant="secondary" className="text-xs">In progress</Badge>;
  }
  return <Badge variant="outline" className="text-xs">Unanswered</Badge>;
}

function AcceptedAnswerBanner({
  post,
  replies,
  onVote,
  onDelete,
  onReply,
  expanded,
  toggle,
}) {
  const accepted = Array.isArray(replies)
    ? replies.find((r) => r.id === post.acceptedReplyId)
    : null;
  if (!accepted) return null;
  return (
    <Card className="border border-emerald-300 bg-emerald-50/70 dark:bg-emerald-900/20">
      <div className="flex items-center justify-between mb-2 px-4 pt-3">
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-200">
          <ShieldCheck className="w-4 h-4" />
          <span>Accepted answer</span>
        </div>
      </div>
      <div className="px-2 pb-3">
        <ReplyNode
          r={accepted}
          depth={0}
          postId={post.id}
          onVote={onVote}
          onDelete={onDelete}
          onReply={onReply}
          expanded={expanded}
          toggle={toggle}
          acceptedReplyId={post.acceptedReplyId}
        />
        </div>
    </Card>
  );
}

function ReplyNode({
  r,
  depth,
  postId,
  onVote,
  onDelete,
  onReply,
  expanded,
  toggle,
  acceptedReplyId,
}) {
  const [subText, setSubText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(r.content || "");
  const { user, userData } = useAuth();
  const isModerator = MOD_ROLES.includes(userData?.role);

  const hasChildren = r.children && r.children.length > 0;
  const isOpen = expanded[r.id] ?? true;
  const borderColors = [
    "border-slate-200",
    "border-indigo-200",
    "border-amber-200",
    "border-emerald-200",
    "border-pink-200",
  ];
  const borderColor = borderColors[Math.min(depth, borderColors.length - 1)];

  const canEdit = user && (user.uid === r.authorId || isModerator);
  const canDelete = user && (user.uid === r.authorId || isModerator);
  const isAccepted = acceptedReplyId === r.id;

  const saveEdit = async () => {
    if (!canEdit) return;
    try {
      const res = await fetch("/api/forum/reply-enhanced", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          replyId: r.id,
          userId: user.uid,
          content: editText,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.fallback) {
          await patchLocal();
        }
      } else {
        await patchLocal();
      }
      setEditing(false);
    } catch {
      await patchLocal();
      setEditing(false);
    }
  };

  const patchLocal = async () => {
    const pRef = doc(db, "post", postId);
      const snap = await getDoc(pRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const arr = Array.isArray(data.replies) ? data.replies : [];
    const idx = arr.findIndex((x) => x.id === r.id);
    if (idx !== -1) {
      arr[idx] = { ...arr[idx], content: editText, editedAt: new Date() };
      await updateDoc(pRef, { replies: arr });
    }
  };

  const isInstructor = ["teacher", "instructor", "admin"].includes(r.role);
  const markers = r.markers || {};

  return (
    <Card
      id={`reply-${r.id}`}
      className={`p-4 bg-white/80 dark:bg-slate-800/80 border-l-4 ${borderColor} ${
        isAccepted ? "ring-2 ring-emerald-400" : ""
      }`}
      style={{ marginLeft: depth * 16 }}
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1">
          <IconButton
            icon={<ArrowBigUp className="w-4 h-4" />}
            label="Upvote"
            onClick={() => onVote(r.id, "upvote")}
          />
          <IconButton
            icon={<ArrowBigDown className="w-4 h-4" />}
            label="Downvote"
            onClick={() => onVote(r.id, "downvote")}
          />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Avatar name={r.authorName} className="w-7 h-7" />
            <span className="font-medium text-slate-900 dark:text-white">
              {r.authorName || "Anonymous"}
            </span>
            {(() => {
              const f = roleFlair(r.role);
              return <Badge variant={f.variant}>{f.emoji} {f.label}</Badge>;
            })()}
            {isInstructor && (
              <Badge variant="success" className="gap-1">
                <ShieldCheck className="w-3 h-3" /> Instructor
              </Badge>
            )}
            {isAccepted && (
              <Badge variant="success" className="gap-1">
                <BadgeCheck className="w-3 h-3" /> Accepted
              </Badge>
            )}
            <span className="text-xs text-slate-500">{timeAgo(r.createdAt)}</span>
            <button
              className="ml-auto text-xs text-slate-500 flex items-center gap-1"
              onClick={() => toggle(r.id)}
            >
              {isOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}{" "}
              {isOpen ? "Collapse" : "Expand"}
            </button>
          </div>

          {editing ? (
        <div className="space-y-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="font-mono"
                rows={3}
              />
          <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setEditText(r.content || "");
                  }}
                >
                  Cancel
                </Button>
          </div>
        </div>
          ) : (
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown components={{ code: (props) => <CodeBlockPlus {...props} /> }}>
                {r.content || ""}
              </ReactMarkdown>
            </div>
          )}

          {isOpen && (
            <>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <button
                  className="flex items-center gap-1 hover:text-indigo-600"
                  onClick={() => onReply(r.id, subText || "")}
                >
                  <Reply className="w-4 h-4" /> Reply
                </button>
                {canEdit && (
                  <button className="hover:text-indigo-600" onClick={() => setEditing((v) => !v)}>
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button className="text-red-500 hover:text-red-600" onClick={() => onDelete(r.id)}>
                    Delete
                  </button>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="uppercase tracking-wide text-[10px] text-slate-400">
                  Quality markers:
                </span>
                <MarkerChip
                  label="Has code"
                  active={!!markers.hasCode}
                  onToggle={async (next) => {
                    await updateMarkers(postId, r.id, user, userData, { hasCode: next });
                  }}
                  canToggle={!!user && (isModerator || user.uid === r.authorId)}
                />
                <MarkerChip
                  label="Shows attempt"
                  active={!!markers.showsAttempt}
                  onToggle={async (next) => {
                    await updateMarkers(postId, r.id, user, userData, { showsAttempt: next });
                  }}
                  canToggle={!!user && (isModerator || user.uid === r.authorId)}
                />
                <MarkerChip
                  label="Explains why"
                  active={!!markers.explainsWhy}
                  onToggle={async (next) => {
                    await updateMarkers(postId, r.id, user, userData, { explainsWhy: next });
                  }}
                  canToggle={!!user && (isModerator || user.uid === r.authorId)}
                />
                <MarkerChip
                  label="Cites ref"
                  active={!!markers.citesRef}
                  onToggle={async (next) => {
                    await updateMarkers(postId, r.id, user, userData, { citesRef: next });
                  }}
                  canToggle={!!user && (isModerator || user.uid === r.authorId)}
                />
              </div>
              <div className="mt-2 flex gap-2">
                <Textarea
                  value={subText}
                  onChange={(e) => setSubText(e.target.value)}
                  placeholder="Reply with code or context..."
                  rows={2}
                  className="font-mono"
                />
                <Button
                  onClick={() => {
                    onReply(r.id, subText);
                    setSubText("");
                  }}
                  size="sm"
                >
                  Send
                </Button>
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
                      acceptedReplyId={acceptedReplyId}
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

async function updateMarkers(postId, replyId, user, userData, markers) {
    if (!user) return;
    try {
    await fetch("/api/forum/markers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        replyId,
        userId: user.uid,
        userRole: userData?.role,
        markers,
      }),
    });
  } catch {
  }
}

function MarkerChip({ label, active, onToggle, canToggle }) {
  const classes = active
    ? "px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200"
    : "px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 border border-slate-200";
  if (!canToggle) {
    return <span className={classes}>{label}</span>;
  }
  return (
    <button
      type="button"
      className={classes + " hover:bg-emerald-50 hover:border-emerald-300 transition"}
      onClick={() => onToggle(!active)}
    >
      {label}
    </button>
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

function TimelineRail({ post, replies }) {
  const all = Array.isArray(replies) ? replies : [];
  if (!post) return null;
  const items = [
    {
      id: post.id,
      type: "post",
      label: "Thread created",
      createdAt: post.createdAt,
    },
    ...all.map((r) => ({
      id: r.id,
      type: "reply",
      label: r.authorName || "Reply",
      createdAt: r.createdAt,
    })),
  ].sort((a, b) => {
    const ta = a.createdAt?.toMillis
      ? a.createdAt.toMillis()
      : new Date(a.createdAt).getTime();
    const tb = b.createdAt?.toMillis
      ? b.createdAt.toMillis()
      : new Date(b.createdAt).getTime();
    return ta - tb;
  });

  if (items.length <= 1) return null;

  const first = items[0].createdAt;
  const last = items[items.length - 1].createdAt;
  const minTime = first?.toMillis ? first.toMillis() : new Date(first).getTime();
  const maxTime = last?.toMillis ? last.toMillis() : new Date(last).getTime();
  const span = Math.max(maxTime - minTime, 1);

  return (
    <Card className="p-4 bg-white/80 dark:bg-slate-800/80">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
        Timeline
      </p>
      <div className="relative h-40">
        <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
        {items.map((item) => {
          const t = item.createdAt?.toMillis
            ? item.createdAt.toMillis()
            : new Date(item.createdAt).getTime();
          const offset = ((t - minTime) / span) * 100;
          const isPost = item.type === "post";
  return (
            <button
              key={item.id}
              type="button"
              className="absolute left-0 flex items-center gap-2 text-left group"
              style={{ top: `${offset}%`, transform: "translateY(-50%)" }}
              onClick={() => {
                if (isPost) {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  return;
                }
                const el = document.getElementById(`reply-${item.id}`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            >
              <span
                className={`ml-1 h-2.5 w-2.5 rounded-full border ${
                  isPost
                    ? "bg-indigo-500 border-indigo-600"
                    : "bg-slate-100 border-slate-400 group-hover:bg-emerald-400 group-hover:border-emerald-500"
                }`}
              />
              <span className="text-[10px] text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-100 max-w-[160px] truncate">
                {isPost ? "Thread created" : item.label}
              </span>
            </button>
          );
        })}
          </div>
    </Card>
  );
}

function SkeletonTopicPage() {
  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-900">
      <div className="max-w-5xl mx-auto py-10 px-4 space-y-6 md:grid md:grid-cols-[minmax(0,1.2fr)_260px] md:gap-6">
        <div className="space-y-6">
          <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-8 w-3/4 bg-slate-200 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-slate-200 rounded animate-pulse" />
            </div>
          </Card>
        </div>
        <div className="hidden md:block">
          <Card className="h-40 bg-slate-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
