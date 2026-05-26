require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
<<<<<<< HEAD
=======
const server = http.createServer(app);
>>>>>>> gozilethu/farmlink-Mbutho
const PORT = process.env.PORT || 3006;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

<<<<<<< HEAD
// Notification server URL (to send notifications)
=======
// Notification server URL
>>>>>>> gozilethu/farmlink-Mbutho
const NOTIFICATION_SERVER = process.env.NOTIFICATION_SERVER || 'http://localhost:3005';

app.use(cors());
app.use(express.json());

// -------------------- Socket.IO – Private Direct Messaging --------------------
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Map userId -> socket.id for private message routing
const userSockets = new Map();

io.on('connection', async (socket) => {
  const token = socket.handshake.query.token;
  if (!token) {
    socket.disconnect(true);
    return;
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    socket.disconnect(true);
    return;
  }

  const userId = user.id;
  userSockets.set(userId, socket.id);

  console.log(`User ${userId} connected (community server)`);

  // Listen for private messages
  socket.on('private-message', async (data) => {
    const { recipientId, encryptedPayload } = data; // encryptedPayload is the E2EE ciphertext
    if (!recipientId || !encryptedPayload) return;

    // Save the encrypted message to Supabase for history
    try {
      await supabase.from('messages').insert({
        sender_id: userId,
        recipient_id: recipientId,
        encrypted_content: encryptedPayload, // store the encrypted blob
        created_at: new Date(),
      });
    } catch (err) {
      console.error('Failed to save encrypted message:', err);
    }

    // Relay the encrypted payload to the recipient if they are connected
    const recipientSocketId = userSockets.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('private-message', {
        senderId: userId,
        encryptedPayload, // forward encrypted data unchanged
        timestamp: Date.now(),
      });
    }

    // Also send back to sender for immediate UI update (client should decrypt locally)
    socket.emit('private-message', {
      senderId: userId,
      encryptedPayload,
      timestamp: Date.now(),
    });
  });

  // Optional: typing indicators
  socket.on('typing', (data) => {
    const recipientSocketId = userSockets.get(data.recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('typing', { senderId: userId });
    }
  });

  // Disconnect cleanup
  socket.on('disconnect', () => {
    userSockets.delete(userId);
    console.log(`User ${userId} disconnected`);
  });
});

// -------------------- REST endpoints for chat history --------------------
// GET /messages/:otherUserId?limit=50 – retrieve encrypted messages between current user and another user
app.get('/messages/:otherUserId', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing token' });
  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

  const { otherUserId } = req.params;
  const limit = parseInt(req.query.limit) || 50;

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    const messages = data.map(m => ({
      id: m.id,
      senderId: m.sender_id,
      recipientId: m.recipient_id,
      encryptedPayload: m.encrypted_content, // clients must decrypt
      timestamp: m.created_at,
    }));

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// -------------------- Posts (existing endpoints, unchanged) --------------------
app.get('/posts', async (req, res) => {
  const { category = 'All', limit = 20 } = req.query;
  try {
    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (full_name, avatar),
        comments:comments(count)
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    if (category !== 'All') query = query.eq('category', category);
    const { data, error } = await query;
    if (error) throw error;
    const discussions = data.map(post => ({
      id: post.id,
      avatar: post.profiles?.avatar || post.profiles?.full_name?.charAt(0).toUpperCase() || 'U',
      author: post.profiles?.full_name || 'Anonymous',
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
      likedByUser: false,
      comments: []
    }));
    res.json(discussions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/posts/:id/comments', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (full_name, avatar),
        replies:replies(*, profiles:user_id (full_name, avatar))
      `)
      .eq('post_id', id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const comments = data.map(c => ({
      id: c.id,
      username: c.profiles?.full_name || 'Anonymous',
      avatar: c.profiles?.avatar || c.profiles?.full_name?.charAt(0).toUpperCase() || 'U',
      comment: c.content,
      postedDate: formatRelativeTime(c.created_at),
      likes: c.likes_count || 0,
      likedByUser: false,
      replies: (c.replies || []).map(r => ({
        id: r.id,
        username: r.profiles?.full_name || 'Anonymous',
        avatar: r.profiles?.avatar || r.profiles?.full_name?.charAt(0).toUpperCase() || 'U',
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
    res.status(201).json({ success: true, post: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/posts/:id/like', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID required' });
  try {
    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', userId)
      .single();
    if (existing) {
      await supabase.from('post_likes').delete().eq('id', existing.id);
      await supabase.rpc('decrement_post_likes', { post_id: id });
    } else {
      await supabase.from('post_likes').insert({ post_id: id, user_id: userId });
      await supabase.rpc('increment_post_likes', { post_id: id });
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
    await supabase.rpc('increment_post_replies', { post_id: postId });
    const { data: post } = await supabase.from('posts').select('user_id, title').eq('id', postId).single();
    if (post && post.user_id !== userId) {
      await createNotification(post.user_id, 'reply', 'New comment on your post', `${userId} commented on "${post.title}"`, `/community/post/${postId}`);
    }
    res.status(201).json({ success: true, comment: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------- Helper: format relative time --------------------
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

// -------------------- Start server --------------------
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Community server (with messaging) running on port ${PORT}`);
});