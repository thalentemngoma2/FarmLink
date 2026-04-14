require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// -------------------- Config --------------------
const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());

// -------------------- Helper Functions --------------------
async function uploadFile(fileBuffer, fileName, folder, bucket = 'farmlink') {
  const filePath = `${folder}/${Date.now()}_${fileName}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, fileBuffer, { contentType: 'image/jpeg' });
  if (error) throw error;
  const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return publicUrl.publicUrl;
}

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

// Mock AI analysis (replace with real model)
async function analyzePlant() {
  await new Promise(resolve => setTimeout(resolve, 500));
  const states = ['healthy', 'disease', 'undergrowth', 'overgrowth'];
  const state = states[Math.floor(Math.random() * states.length)];
  const analysis = {
    healthy: {
      cause: 'No issues detected.',
      solution: 'Continue current care routine.',
      preventiveTips: 'Maintain consistent watering and mulching.'
    },
    disease: {
      cause: 'Fungal infection or pest damage.',
      solution: 'Apply neem oil or copper fungicide.',
      preventiveTips: 'Water at base, ensure good airflow.'
    },
    undergrowth: {
      cause: 'Nutrient deficiency or low sunlight.',
      solution: 'Apply balanced fertilizer, increase light exposure.',
      preventiveTips: 'Soil test before planting, rotate crops.'
    },
    overgrowth: {
      cause: 'Excessive nitrogen or lack of pruning.',
      solution: 'Reduce nitrogen fertilizer, prune overcrowded parts.',
      preventiveTips: 'Follow fertilizer schedules, space plants properly.'
    }
  };
  return { state, ...analysis[state] };
}

// -------------------- Authentication Middleware --------------------
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    req.user = null;
    return next();
  }
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.user = user;
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

app.use(authMiddleware);

// ==================== AUTHENTICATION (clean routes) ====================
app.post('/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name: name || email.split('@')[0] } }
    });
    if (error) throw error;
    res.status(201).json({ message: 'Verification email sent', user: data.user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    res.json({ user: data.user, session: data.session });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

app.post('/auth/verify-otp', async (req, res) => {
  const { email, token } = req.body;
  if (!email || !token) return res.status(400).json({ error: 'Email and token required' });
  try {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;
    res.json({ message: 'Email verified', user: data.user, session: data.session });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'farmlink://reset-password'
    });
    if (error) throw error;
    res.json({ message: 'Reset email sent' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/auth/reset-password', async (req, res) => {
  const { access_token, new_password } = req.body;
  if (!access_token || !new_password) return res.status(400).json({ error: 'Token and password required' });
  try {
    await supabase.auth.setSession({ access_token, refresh_token: '' });
    const { error } = await supabase.auth.updateUser({ password: new_password });
    if (error) throw error;
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/auth/user', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return res.status(401).json({ error: error.message });
  res.json({ user: data.user });
});

// ==================== PROFILE ====================
app.get('/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Profile not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/profile', requireAuth, async (req, res) => {
  const { id, name, avatar, location, joinDate, farmSize, mainCrops, farmingType, stats } = req.body;
  if (!id || req.user.id !== id) return res.status(403).json({ error: 'Unauthorized' });
  try {
    const { data, error } = await supabase.from('profiles').upsert({
      id, name, avatar, location, join_date: joinDate, farm_size: farmSize,
      main_crops: mainCrops, farming_type: farmingType,
      questions_count: stats?.questions, answers_count: stats?.answers,
      likes_count: stats?.likes, updated_at: new Date()
    }, { onConflict: 'id' }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/profile/:userId/achievements', async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase.from('user_achievements').select('achievement_id, earned_at').eq('user_id', userId);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== COMMUNITY POSTS ====================
app.get('/posts', async (req, res) => {
  const { category = 'All', limit = 20 } = req.query;
  try {
    let query = supabase.from('posts').select('*, profiles:user_id (name, avatar), comments_count, likes_count')
      .order('created_at', { ascending: false }).limit(parseInt(limit));
    if (category !== 'All') query = query.eq('category', category);
    const { data, error } = await query;
    if (error) throw error;
    const discussions = data.map(post => ({
      id: post.id, avatar: post.profiles?.avatar || post.profiles?.name?.charAt(0).toUpperCase() || 'U',
      author: post.profiles?.name || 'Anonymous', timeAgo: formatRelativeTime(post.created_at),
      title: post.title, preview: post.preview, category: post.category,
      replies: post.comments_count || 0, likes: post.likes_count || 0,
      imageUri: post.media_urls?.[0] || null, videoUri: post.media_urls?.[0] || null,
      mediaType: post.media_type, likedByUser: false
    }));
    res.json(discussions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/posts/:id/comments', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase.from('comments')
      .select('*, profiles:user_id (name, avatar), replies:comments!parent_comment_id (*, profiles:user_id (name, avatar))')
      .eq('post_id', id).is('parent_comment_id', null).order('created_at', { ascending: true });
    if (error) throw error;
    const comments = data.map(c => ({
      id: c.id, username: c.profiles?.name || 'Anonymous',
      avatar: c.profiles?.avatar || c.profiles?.name?.charAt(0).toUpperCase() || 'U',
      comment: c.content, postedDate: formatRelativeTime(c.created_at), likes: c.likes_count || 0, likedByUser: false,
      replies: (c.replies || []).map(r => ({
        id: r.id, username: r.profiles?.name || 'Anonymous',
        avatar: r.profiles?.avatar || r.profiles?.name?.charAt(0).toUpperCase() || 'U',
        comment: r.content, postedDate: formatRelativeTime(r.created_at), likes: r.likes_count || 0, likedByUser: false
      }))
    }));
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/posts', requireAuth, upload.array('media', 5), async (req, res) => {
  const { title, preview, category, mediaUrls, mediaType } = req.body;
  const files = req.files || [];
  if (!title || !preview) return res.status(400).json({ error: 'Missing title or preview' });

  let finalMediaUrls = mediaUrls || [];
  // Upload any new files
  for (const file of files) {
    try {
      const url = await uploadFile(file.buffer, file.originalname, `posts/${req.user.id}`);
      finalMediaUrls.push(url);
    } catch (err) {
      console.error('File upload failed:', err);
    }
  }

  try {
    const { data, error } = await supabase.from('posts').insert({
      user_id: req.user.id, title, preview, category,
      media_urls: finalMediaUrls, media_type: mediaType || (files.length ? 'image' : null),
      created_at: new Date()
    }).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, post: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/posts/:id/like', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const { data: existing } = await supabase.from('post_likes').select('id').eq('post_id', id).eq('user_id', req.user.id).single();
    if (existing) {
      await supabase.from('post_likes').delete().eq('id', existing.id);
      await supabase.rpc('decrement_post_likes', { post_id: id });
    } else {
      await supabase.from('post_likes').insert({ post_id: id, user_id: req.user.id });
      await supabase.rpc('increment_post_likes', { post_id: id });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/comments', requireAuth, async (req, res) => {
  const { postId, content, parentCommentId } = req.body;
  if (!postId || !content) return res.status(400).json({ error: 'Missing fields' });
  try {
    const { data, error } = await supabase.from('comments').insert({
      post_id: postId, user_id: req.user.id, content,
      parent_comment_id: parentCommentId || null, created_at: new Date()
    }).select().single();
    if (error) throw error;
    await supabase.rpc('increment_post_replies', { post_id: postId });
    res.status(201).json({ success: true, comment: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== NOTIFICATIONS ====================
app.get('/notifications/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  const { filter = 'all' } = req.query;
  if (req.user.id !== userId) return res.status(403).json({ error: 'Forbidden' });
  try {
    let query = supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (filter === 'unread') query = query.eq('read', false);
    const { data, error } = await query;
    if (error) throw error;
    const notifications = data.map(n => ({
      id: n.id, type: n.type, title: n.title, message: n.message,
      time: new Date(n.created_at).toLocaleString(), read: n.read, actionUrl: n.action_url,
      iconName: { reply: 'chatbubble-outline', like: 'heart-outline', follow: 'person-add-outline', achievement: 'trophy-outline', alert: 'alert-circle-outline', system: 'checkmark-circle-outline' }[n.type] || 'notifications-outline',
      iconColor: { reply: '#3b82f6', like: '#ec489a', follow: '#8b5cf6', achievement: '#f59e0b', alert: '#ef4444', system: '#22c55e' }[n.type] || '#9ca3af'
    }));
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/notifications/:userId/read/:id', requireAuth, async (req, res) => {
  const { userId, id } = req.params;
  if (req.user.id !== userId) return res.status(403).json({ error: 'Forbidden' });
  try {
    await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/notifications/:userId/read-all', requireAuth, async (req, res) => {
  const { userId } = req.params;
  if (req.user.id !== userId) return res.status(403).json({ error: 'Forbidden' });
  try {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/notifications/:userId/:id', requireAuth, async (req, res) => {
  const { userId, id } = req.params;
  if (req.user.id !== userId) return res.status(403).json({ error: 'Forbidden' });
  try {
    await supabase.from('notifications').delete().eq('id', id).eq('user_id', userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Internal endpoint (used by other services or future enhancements)
app.post('/internal/notifications', async (req, res) => {
  const { user_id, type, title, message, action_url } = req.body;
  try {
    await supabase.from('notifications').insert({ user_id, type, title, message, action_url, created_at: new Date() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PLANT SCANS ====================
app.post('/scan', requireAuth, upload.single('image'), async (req, res) => {
  const { plantName } = req.body;
  if (!plantName || !req.file) return res.status(400).json({ error: 'Plant name and image required' });
  try {
    const imageUrl = await uploadFile(req.file.buffer, req.file.originalname, `scans/${req.user.id}`);
    const analysis = await analyzePlant();
    const { data, error } = await supabase.from('plant_scans').insert({
      user_id: req.user.id, plant_name: plantName, image_url: imageUrl,
      analysis_state: analysis.state, analysis_cause: analysis.cause,
      analysis_solution: analysis.solution, analysis_preventive: analysis.preventiveTips,
      created_at: new Date()
    }).select().single();
    if (error) throw error;
    res.status(201).json({ analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/scans/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  if (req.user.id !== userId) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data, error } = await supabase.from('plant_scans').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    const scans = data.map(scan => ({
      id: scan.id, plant_name: scan.plant_name, image_url: scan.image_url,
      analysis_state: scan.analysis_state, analysis_cause: scan.analysis_cause,
      analysis_solution: scan.analysis_solution, analysis_preventive: scan.analysis_preventive,
      created_at: scan.created_at
    }));
    res.json(scans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/community-scans', async (req, res) => {
  const { limit = 10 } = req.query;
  try {
    let query = supabase.from('plant_scans').select('*, profiles:user_id (name, location)')
      .order('created_at', { ascending: false }).limit(parseInt(limit));
    if (req.user) query = query.neq('user_id', req.user.id);
    const { data, error } = await query;
    if (error) throw error;
    const communityScans = data.map(scan => ({
      id: scan.id, farmerName: scan.profiles?.name || 'Anonymous Farmer',
      location: scan.profiles?.location || 'Unknown Region', imageUri: scan.image_url,
      plantName: scan.plant_name,
      analysisState: scan.analysis_state === 'healthy' ? 'Healthy' :
                     scan.analysis_state === 'disease' ? 'Disease detected' :
                     scan.analysis_state === 'undergrowth' ? 'Undergrowth' : 'Overgrowth',
      timestamp: formatRelativeTime(scan.created_at)
    }));
    res.json(communityScans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SETTINGS ====================
app.get('/settings', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', req.user.id).single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || { dark_mode: false, push_notifications: true, offline_mode: false, language: 'en' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/settings', requireAuth, async (req, res) => {
  const { dark_mode, push_notifications, offline_mode, language } = req.body;
  try {
    await supabase.from('user_settings').upsert({
      user_id: req.user.id, dark_mode, push_notifications, offline_mode, language, updated_at: new Date()
    }, { onConflict: 'user_id' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== TRENDING ====================
app.get('/trending', async (req, res) => {
  const { limit = 10 } = req.query;
  try {
    const { data, error } = await supabase.from('posts')
      .select('*, profiles:user_id (name, avatar), likes_count, comments_count')
      .order('likes_count', { ascending: false }).limit(parseInt(limit));
    if (error) throw error;
    const trending = data.map(post => ({
      id: post.id, title: post.title, preview: post.preview,
      author: post.profiles?.name || 'Anonymous', likes: post.likes_count,
      replies: post.comments_count, imageUri: post.media_urls?.[0] || null
    }));
    res.json(trending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== COMPATIBILITY WITH OLD PATHS ====================
// (Keep your existing legacy endpoints for a smooth transition)
app.get('/community-server/src/index', async (req, res) => {
  const { userId } = req.query;
  let query = supabase.from('plant_scans').select('*, profiles:user_id (name, location)')
    .order('created_at', { ascending: false }).limit(6);
  if (userId) query = query.neq('user_id', userId);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  const communityScans = data.map(scan => ({
    id: scan.id, farmerName: scan.profiles?.name || 'Anonymous',
    location: scan.profiles?.location || 'Unknown',
    imageUri: scan.image_url, plantName: scan.plant_name,
    analysisState: scan.analysis_state === 'healthy' ? 'Healthy' :
                   scan.analysis_state === 'disease' ? 'Disease detected' :
                   scan.analysis_state === 'undergrowth' ? 'Undergrowth' : 'Overgrowth',
    timestamp: formatRelativeTime(scan.created_at)
  }));
  res.json(communityScans);
});

app.get('/posting-server/src/index', async (req, res) => {
  const { category = 'All', limit = 20, sort = 'recent' } = req.query;
  let query = supabase.from('posts').select('*, profiles:user_id (name, avatar), comments_count, likes_count')
    .limit(parseInt(limit));
  if (category !== 'All') query = query.eq('category', category);
  if (sort === 'popular') query = query.order('likes_count', { ascending: false });
  else query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  const discussions = data.map(post => ({
    id: post.id, avatar: post.profiles?.avatar || post.profiles?.name?.charAt(0).toUpperCase() || 'U',
    author: post.profiles?.name || 'Anonymous', timeAgo: formatRelativeTime(post.created_at),
    title: post.title, preview: post.preview, category: post.category,
    replies: post.comments_count || 0, likes: post.likes_count || 0,
    imageUri: post.media_urls?.[0] || null, videoUri: post.media_urls?.[0] || null,
    mediaType: post.media_type, likedByUser: false
  }));
  res.json(discussions);
});

app.post('/posting-server/src/index', requireAuth, async (req, res) => {
  const { title, preview, category, mediaUrls, mediaType } = req.body;
  if (!title || !preview) return res.status(400).json({ error: 'Missing title or preview' });
  const { data, error } = await supabase.from('posts').insert({
    user_id: req.user.id, title, preview, category,
    media_urls: mediaUrls || [], media_type: mediaType, created_at: new Date()
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true, post: data });
});

app.get('/posting-server/src/index/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('comments')
    .select('*, profiles:user_id (name, avatar), replies:comments!parent_comment_id (*, profiles:user_id (name, avatar))')
    .eq('post_id', id).is('parent_comment_id', null).order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  const comments = data.map(c => ({
    id: c.id, username: c.profiles?.name || 'Anonymous',
    avatar: c.profiles?.avatar || c.profiles?.name?.charAt(0).toUpperCase() || 'U',
    comment: c.content, postedDate: formatRelativeTime(c.created_at),
    likes: c.likes_count || 0, likedByUser: false,
    replies: (c.replies || []).map(r => ({
      id: r.id, username: r.profiles?.name || 'Anonymous',
      avatar: r.profiles?.avatar || r.profiles?.name?.charAt(0).toUpperCase() || 'U',
      comment: r.content, postedDate: formatRelativeTime(r.created_at),
      likes: r.likes_count || 0, likedByUser: false
    }))
  }));
  res.json(comments);
});

app.post('/community-server/src/index', requireAuth, async (req, res) => {
  const { postId, content, parentCommentId } = req.body;
  if (!postId || !content) return res.status(400).json({ error: 'Missing postId or content' });
  const { data, error } = await supabase.from('comments').insert({
    post_id: postId, user_id: req.user.id, content,
    parent_comment_id: parentCommentId || null, created_at: new Date()
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  await supabase.rpc('increment_post_replies', { post_id: postId });
  res.status(201).json({ success: true, comment: data });
});

app.post('/posting-server/src/index/:id/like', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { data: existing } = await supabase.from('post_likes').select('id').eq('post_id', id).eq('user_id', req.user.id).single();
  if (existing) {
    await supabase.from('post_likes').delete().eq('id', existing.id);
    await supabase.rpc('decrement_post_likes', { post_id: id });
  } else {
    await supabase.from('post_likes').insert({ post_id: id, user_id: req.user.id });
    await supabase.rpc('increment_post_likes', { post_id: id });
  }
  res.json({ success: true });
});

app.post('/auth-server/src/index/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name: name || email.split('@')[0] } } });
    if (error) throw error;
    res.status(201).json({ message: 'Verification email sent', user: data.user });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/auth-server/src/index/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    res.json({ user: data.user, session: data.session });
  } catch (err) { res.status(401).json({ error: err.message }); }
});

app.get('/profile-server/src/index', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('profiles').select('name, email, membership_type, avatar, location, farm_size, main_crops, farming_type').eq('id', req.user.id).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/profile-server/src/index', requireAuth, async (req, res) => {
  const updates = req.body;
  const { error } = await supabase.from('profiles').update(updates).eq('id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get('/settings-server/src/index', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('user_settings').select('dark_mode, push_notifications, offline_mode, language').eq('user_id', req.user.id).single();
  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });
  res.json(data || { dark_mode: false, push_notifications: true, offline_mode: false, language: 'en' });
});

app.put('/settings-server/src/index', requireAuth, async (req, res) => {
  const { dark_mode, push_notifications, offline_mode, language } = req.body;
  const { error } = await supabase.from('user_settings').upsert({ user_id: req.user.id, dark_mode, push_notifications, offline_mode, language, updated_at: new Date() }).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get('/notification-server/src/index', requireAuth, async (req, res) => {
  const { filter = 'all' } = req.query;
  let query = supabase.from('notifications').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
  if (filter === 'unread') query = query.eq('read', false);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/notification-server/src/index/:id/read', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post('/notification-server/src/index/read-all', requireAuth, async (req, res) => {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', req.user.id).eq('read', false);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.delete('/notification-server/src/index/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('notifications').delete().eq('id', id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post('/scan-server/src/index', requireAuth, upload.single('image'), async (req, res) => {
  const { plantName } = req.body;
  if (!plantName || !req.file) return res.status(400).json({ error: 'Plant name and image required' });
  const imageUrl = await uploadFile(req.file.buffer, req.file.originalname, `scans/${req.user.id}`);
  const states = ['healthy', 'disease', 'undergrowth', 'overgrowth'];
  const analysis = { state: states[Math.floor(Math.random() * states.length)], cause: 'Sample cause', solution: 'Sample solution', preventiveTips: 'Sample tips' };
  const { data, error } = await supabase.from('plant_scans').insert({
    user_id: req.user.id, plant_name: plantName, image_url: imageUrl,
    analysis_state: analysis.state, analysis_cause: analysis.cause,
    analysis_solution: analysis.solution, analysis_preventive: analysis.preventiveTips,
    created_at: new Date()
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true, scan: data, analysis });
});

app.get('/scan-server/src/index', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('plant_scans').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ==================== START SERVER ====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Unified FarmLink backend running on port ${PORT}`);
});