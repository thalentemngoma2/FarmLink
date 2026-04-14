require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Notification server URL (to send notifications)
const NOTIFICATION_SERVER = process.env.NOTIFICATION_SERVER || 'http://localhost:3000';

app.use(cors());
app.use(express.json());

// -------------------- Helper: Create notification --------------------
async function createNotification(userId, type, title, message, actionUrl = null) {
  try {
    await axios.post(`${NOTIFICATION_SERVER}/internal/notifications`, {
      user_id: userId,
      type,
      title,
      message,
      action_url: actionUrl,
    });
  } catch (err) {
    console.error('Failed to send notification:', err.message);
  }
}

// -------------------- Posts --------------------
// GET /posts?category=All&limit=20
app.get('/posts', async (req, res) => {
  const { category = 'All', limit = 20 } = req.query;
  try {
    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (name, avatar),
        comments:comments(count)
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    if (category !== 'All') query = query.eq('category', category);
    const { data, error } = await query;
    if (error) throw error;
    // Transform to frontend Discussion format
    const discussions = data.map(post => ({
      id: post.id,
      avatar: post.profiles?.avatar || post.profiles?.name?.charAt(0).toUpperCase() || 'U',
      author: post.profiles?.name || 'Anonymous',
      timeAgo: formatRelativeTime(post.created_at),
      trending: false,
      title: post.title,
      preview: post.preview,
      category: post.category,
      replies: post.comments_count || 0,
      likes: post.likes_count || 0,
      imageUri: post.media_urls?.[0] || null,
      videoUri: post.media_urls?.[0] || null,
      mediaType: post.media_type,
      likedByUser: false, // will be determined by user like check later
      comments: [] // comments fetched separately
    }));
    res.json(discussions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /posts/:id/comments
app.get('/posts/:id/comments', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (name, avatar),
        replies:replies(*, profiles:user_id (name, avatar))
      `)
      .eq('post_id', id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    // Transform to frontend Comment structure
    const comments = data.map(c => ({
      id: c.id,
      username: c.profiles?.name || 'Anonymous',
      avatar: c.profiles?.avatar || c.profiles?.name?.charAt(0).toUpperCase() || 'U',
      comment: c.content,
      postedDate: formatRelativeTime(c.created_at),
      likes: c.likes_count || 0,
      likedByUser: false,
      replies: (c.replies || []).map(r => ({
        id: r.id,
        username: r.profiles?.name || 'Anonymous',
        avatar: r.profiles?.avatar || r.profiles?.name?.charAt(0).toUpperCase() || 'U',
        comment: r.content,
        postedDate: formatRelativeTime(r.created_at),
        likes: r.likes_count || 0,
        likedByUser: false,
      }))
    }));
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /posts - create a new post
app.post('/posts', async (req, res) => {
  const { userId, title, preview, category, mediaUrls, mediaType } = req.body;
  if (!userId || !title || !preview) return res.status(400).json({ error: 'Missing required fields' });
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        title,
        preview,
        category,
        media_urls: mediaUrls || [],
        media_type: mediaType,
        created_at: new Date(),
      })
      .select()
      .single();
    if (error) throw error;
    // Notify followers? (optional)
    res.status(201).json({ success: true, post: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /posts/:id/like - toggle like
app.post('/posts/:id/like', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID required' });
  try {
    // Check if already liked
    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', userId)
      .single();
    if (existing) {
      // Unlike
      await supabase.from('post_likes').delete().eq('id', existing.id);
      await supabase.rpc('decrement_post_likes', { post_id: id });
    } else {
      // Like
      await supabase.from('post_likes').insert({ post_id: id, user_id: userId });
      await supabase.rpc('increment_post_likes', { post_id: id });
      // Send notification to post author
      const { data: post } = await supabase.from('posts').select('user_id').eq('id', id).single();
      if (post && post.user_id !== userId) {
        await createNotification(post.user_id, 'like', 'Someone liked your post', `Your post "${post.title}" received a like.`, `/community/post/${id}`);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /comments - add a comment
app.post('/comments', async (req, res) => {
  const { postId, userId, content, parentCommentId } = req.body;
  if (!postId || !userId || !content) return res.status(400).json({ error: 'Missing fields' });
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content,
        parent_comment_id: parentCommentId || null,
        created_at: new Date(),
      })
      .select()
      .single();
    if (error) throw error;
    // Increment replies count on post
    await supabase.rpc('increment_post_replies', { post_id: postId });
    // Send notification to post author (if not self)
    const { data: post } = await supabase.from('posts').select('user_id, title').eq('id', postId).single();
    if (post && post.user_id !== userId) {
      await createNotification(post.user_id, 'reply', 'New comment on your post', `${userId} commented on "${post.title}"`, `/community/post/${postId}`);
    }
    res.status(201).json({ success: true, comment: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: format relative time
function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

app.listen(PORT, () => {
  console.log(`Community server running on port ${PORT}`);
});