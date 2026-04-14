require('dotenv').config();
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY exists?', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());

// -------------------- Helper functions --------------------
async function uploadFile(fileBuffer, fileName, folder) {
  const filePath = `${folder}/${Date.now()}_${fileName}`;
  const { data, error } = await supabase.storage
    .from('farmlink')
    .upload(filePath, fileBuffer, { contentType: 'image/jpeg' });
  if (error) throw error;
  const { data: publicUrl } = supabase.storage.from('farmlink').getPublicUrl(filePath);
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

// -------------------- Authentication middleware --------------------
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

// ==================== COMMUNITY & POSTS ====================
// GET /community-server/src/index → community scans (public) const url = `${SCAN_API}/community-server/src/index`
app.get('/community-server/src/index', async (req, res) => {
  const { userId } = req.query;
  let query = supabase
    .from('plant_scans')
    .select('*, profiles:user_id (name, location)')
    .order('created_at', { ascending: false })
    .limit(6);
  if (userId) query = query.neq('user_id', userId);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  const communityScans = data.map(scan => ({
    id: scan.id,
    farmerName: scan.profiles?.name || 'Anonymous',
    location: scan.profiles?.location || 'Unknown',
    imageUri: scan.image_url,
    plantName: scan.plant_name,
    analysisState: scan.analysis_state === 'healthy' ? 'Healthy' :
                   scan.analysis_state === 'disease' ? 'Disease detected' :
                   scan.analysis_state === 'undergrowth' ? 'Undergrowth' : 'Overgrowth',
    timestamp: formatRelativeTime(scan.created_at)
  }));
  res.json(communityScans);
});

// GET /posting-server/src/index → posts list (public)
app.get('/posting-server/src/index', async (req, res) => {
  const { category = 'All', limit = 20, sort = 'recent' } = req.query;
  let query = supabase
    .from('posts')
    .select('*, profiles:user_id (name, avatar), comments_count, likes_count')
    .limit(parseInt(limit));
  if (category !== 'All') query = query.eq('category', category);
  if (sort === 'popular') query = query.order('likes_count', { ascending: false });
  else query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  const discussions = data.map(post => ({
    id: post.id,
    avatar: post.profiles?.avatar || post.profiles?.name?.charAt(0).toUpperCase() || 'U',
    author: post.profiles?.name || 'Anonymous',
    timeAgo: formatRelativeTime(post.created_at),
    title: post.title,
    preview: post.preview,
    category: post.category,
    replies: post.comments_count || 0,
    likes: post.likes_count || 0,
    imageUri: post.media_urls?.[0] || null,
    videoUri: post.media_urls?.[0] || null,
    mediaType: post.media_type,
    likedByUser: false,
  }));
  res.json(discussions);
});

// POST /posting-server/src/index → create a new post (auth required)
app.post('/posting-server/src/index', requireAuth, async (req, res) => {
  const { title, preview, category, mediaUrls, mediaType } = req.body;
  if (!title || !preview) return res.status(400).json({ error: 'Missing title or preview' });
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: req.user.id,
      title, preview, category,
      media_urls: mediaUrls || [],
      media_type: mediaType,
      created_at: new Date()
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true, post: data });
});

// GET /posting-server/src/index/:id/comments → get comments for a post (public)
app.get('/posting-server/src/index/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles:user_id (name, avatar), replies:comments!parent_comment_id (*, profiles:user_id (name, avatar))')
    .eq('post_id', id)
    .is('parent_comment_id', null)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
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
});

// POST /community-server/src/index → add a comment (auth required)
app.post('/community-server/src/index', requireAuth, async (req, res) => {
  const { postId, content, parentCommentId } = req.body;
  if (!postId || !content) return res.status(400).json({ error: 'Missing postId or content' });
  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: req.user.id,
      content,
      parent_comment_id: parentCommentId || null,
      created_at: new Date()
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  await supabase.rpc('increment_post_replies', { post_id: postId });
  res.status(201).json({ success: true, comment: data });
});

// POST /posting-server/src/index/:id/like → toggle like on a post (auth required)
app.post('/posting-server/src/index/:id/like', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { data: existing } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', id)
    .eq('user_id', req.user.id)
    .single();
  if (existing) {
    await supabase.from('post_likes').delete().eq('id', existing.id);
    await supabase.rpc('decrement_post_likes', { post_id: id });
  } else {
    await supabase.from('post_likes').insert({ post_id: id, user_id: req.user.id });
    await supabase.rpc('increment_post_likes', { post_id: id });
  }
  res.json({ success: true });
});

// ==================== AUTHENTICATION ====================
// We use separate paths for each auth action to avoid conflicts.
app.post('/auth-server/src/index/signup', async (req, res) => {
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

app.post('/auth-server/src/index/login', async (req, res) => {
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

app.post('/auth-server/src/index/verify-otp', async (req, res) => {
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

app.post('/auth-server/src/index/forgot-password', async (req, res) => {
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

app.post('/auth-server/src/index/reset-password', async (req, res) => {
  const { access_token, new_password } = req.body;
  if (!access_token || !new_password) return res.status(400).json({ error: 'Token and password required' });
  try {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token: '' });
    if (error) throw error;
    const { error: updateError } = await supabase.auth.updateUser({ password: new_password });
    if (updateError) throw updateError;
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==================== PROFILE ====================
app.get('/profile-server/src/index', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, email, membership_type, avatar, location, farm_size, main_crops, farming_type')
    .eq('id', req.user.id)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/profile-server/src/index', requireAuth, async (req, res) => {
  const updates = req.body;
  const { error } = await supabase.from('profiles').update(updates).eq('id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ==================== SETTINGS ====================
app.get('/settings-server/src/index', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('dark_mode, push_notifications, offline_mode, language')
    .eq('user_id', req.user.id)
    .single();
  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });
  res.json(data || { dark_mode: false, push_notifications: true, offline_mode: false, language: 'en' });
});

app.put('/settings-server/src/index', requireAuth, async (req, res) => {
  const { dark_mode, push_notifications, offline_mode, language } = req.body;
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: req.user.id, dark_mode, push_notifications, offline_mode, language, updated_at: new Date() })
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ==================== NOTIFICATIONS ====================
app.get('/notification-server/src/index', requireAuth, async (req, res) => {
  const { filter = 'all' } = req.query;
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (filter === 'unread') query = query.eq('read', false);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/notification-server/src/index/:id/read', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post('/notification-server/src/index/read-all', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', req.user.id)
    .eq('read', false);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.delete('/notification-server/src/index/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ==================== PLANT SCANS ====================
app.post('/scan-server/src/index', requireAuth, upload.single('image'), async (req, res) => {
  const { plantName } = req.body;
  if (!plantName || !req.file) return res.status(400).json({ error: 'Plant name and image required' });
  const imageUrl = await uploadFile(req.file.buffer, req.file.originalname, `scans/${req.user.id}`);
  // Mock AI analysis
  const states = ['healthy', 'disease', 'undergrowth', 'overgrowth'];
  const analysis = {
    state: states[Math.floor(Math.random() * states.length)],
    cause: 'Sample cause',
    solution: 'Sample solution',
    preventiveTips: 'Sample tips'
  };
  const { data, error } = await supabase
    .from('plant_scans')
    .insert({
      user_id: req.user.id,
      plant_name: plantName,
      image_url: imageUrl,
      analysis_state: analysis.state,
      analysis_cause: analysis.cause,
      analysis_solution: analysis.solution,
      analysis_preventive: analysis.preventiveTips,
      created_at: new Date()
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true, scan: data, analysis });
});

app.get('/scan-server/src/index', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('plant_scans')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ==================== EXTRA: Trending (public) ====================
app.get('/trending', async (req, res) => {
  const { limit = 10 } = req.query;
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles:user_id (name, avatar), likes_count, comments_count')
    .order('likes_count', { ascending: false })
    .limit(parseInt(limit));
  if (error) return res.status(500).json({ error: error.message });
  const trending = data.map(post => ({
    id: post.id,
    title: post.title,
    preview: post.preview,
    author: post.profiles?.name || 'Anonymous',
    likes: post.likes_count,
    replies: post.comments_count,
    imageUri: post.media_urls?.[0] || null,
  }));
  res.json(trending);
});

// ==================== START SERVER ====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`FarmLink main server running on port ${PORT}`);
});