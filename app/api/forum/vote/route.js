import { db } from '@/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { postId, replyId, userId, voteType } = await request.json();
    
    if (!postId || !userId || !voteType || !['upvote', 'downvote'].includes(voteType)) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const postData = postSnap.data();
    const votes = postData.votes || {};
    const userVote = votes[userId];
    
    let scoreChange = 0;
    let newVoteState = {};

    // Handle vote logic (Reddit-style)
    if (userVote === voteType) {
      // Remove vote (toggle off)
      delete votes[userId];
      scoreChange = voteType === 'upvote' ? -1 : 1;
    } else if (userVote && userVote !== voteType) {
      // Change vote (upvote to downvote or vice versa)
      votes[userId] = voteType;
      scoreChange = voteType === 'upvote' ? 2 : -2; // Remove old vote, add new
    } else {
      // New vote
      votes[userId] = voteType;
      scoreChange = voteType === 'upvote' ? 1 : -1;
    }

    const updates = {
      votes,
      score: increment(scoreChange)
    };

    // Handle reply voting if replyId is provided
    if (replyId) {
      const replies = postData.replies || [];
      const replyIndex = replies.findIndex(r => r.id === replyId);
      
      if (replyIndex === -1) {
        return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
      }

      // Update reply votes
      const reply = replies[replyIndex];
      const replyVotes = reply.votes || {};
      const userReplyVote = replyVotes[userId];
      
      let replyScoreChange = 0;

      if (userReplyVote === voteType) {
        delete replyVotes[userId];
        replyScoreChange = voteType === 'upvote' ? -1 : 1;
      } else if (userReplyVote && userReplyVote !== voteType) {
        replyVotes[userId] = voteType;
        replyScoreChange = voteType === 'upvote' ? 2 : -2;
      } else {
        replyVotes[userId] = voteType;
        replyScoreChange = voteType === 'upvote' ? 1 : -1;
      }

      reply.votes = replyVotes;
      reply.score = (reply.score || 0) + replyScoreChange;
      
      updates.replies = replies;
    }

    await updateDoc(postRef, updates);

    return NextResponse.json({ 
      success: true, 
      votes: replyId ? updates.replies?.find(r => r.id === replyId)?.votes : votes,
      score: replyId ? updates.replies?.find(r => r.id === replyId)?.score : (postData.score || 0) + scoreChange
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}