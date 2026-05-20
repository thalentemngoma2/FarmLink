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
  const { error } = await supabase.storage
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

<<<<<<< HEAD
// -------------------- Authentication middleware --------------------
=======
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

// Mock AI outbreak verification (returns verdict + reason)
async function verifyOutbreakMedia(mediaUrls, userLocation) {
  // Simulate processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  // For demo, always pass (you can add a random failure for testing)
  const random = Math.random();
  if (random > 0.8) {
    return {
      status: 'rejected',
      confidence: 0.3,
      reason: 'Media does not match outbreak symptoms or appears edited.'
    };
  }
  return {
    status: 'verified',
    confidence: 0.95,
    reason: 'All checks passed – media authentic and location consistent.'
  };
}

// -------------------- Authentication Middleware --------------------
>>>>>>> remotes/gozilethu/farmlink-Mbutho
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
app.get('/community-server/src/index', async (req, res) => {
  const { userId } = req.query;
  let query = supabase
    .from('plant_scans')
    .select('*, profiles:user_id (full_name, location)')
    .order('created_at', { ascending: false })
    .limit(6);
  if (userId) query = query.neq('user_id', userId);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  const communityScans = data.map(scan => ({
    id: scan.id,
    farmerName: scan.profiles?.full_name || 'Anonymous',
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

app.get('/posting-server/src/index', async (req, res) => {
  const { category = 'All', limit = 20, sort = 'recent' } = req.query;
  let query = supabase
    .from('posts')
    .select('*, profiles:user_id (full_name, avatar), comments_count, likes_count')
    .limit(parseInt(limit));
  if (category !== 'All') query = query.eq('category', category);
  if (sort === 'popular') query = query.order('likes_count', { ascending: false });
  else query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  const discussions = data.map(post => ({
    id: post.id,
    avatar: post.profiles?.avatar || post.profiles?.full_name?.charAt(0).toUpperCase() || 'U',
    author: post.profiles?.full_name || 'Anonymous',
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

app.get('/posting-server/src/index/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles:user_id (full_name, avatar), replies:comments!parent_comment_id (*, profiles:user_id (full_name, avatar))')
    .eq('post_id', id)
    .is('parent_comment_id', null)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
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
});

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
app.post('/auth-server/src/index/signup', async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  // Validate role - must be one of the allowed values
  const validRoles = ['farmer', 'retailer', 'admin', 'extension_officer'];
  const normalizedRole = ((role || '').trim().toLowerCase());
  if (!validRoles.includes(normalizedRole)) {
    return res.status(400).json({ error: `Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}` });
  }

   try {
     // Generate a guaranteed globally unique username using UUID
     const { v4: uuidv4 } = require('uuid');
     const uniqueSuffix = uuidv4().substring(0, 8);
     const defaultName = name || `${email.split('@')[0]}_${uniqueSuffix}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
     // Also generate a unique username to prevent collisions from same email prefix
     const defaultUsername = `${email.split('@')[0]}_${uniqueSuffix}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');

     const { data, error } = await supabase.auth.signUp({
       email, password,
       options: {
         data: {
           name: defaultName,
           username: defaultUsername,
           role: normalizedRole,
           location: ''
         },
         emailRedirectTo: undefined
       }
     });
    if (error) throw error;
    res.status(201).json({ message: 'Verification email sent', user: data.user });
  } catch (err) {
    if (err.message && err.message.includes('Database error saving new user')) {
      return res.status(409).json({ error: 'Username or email already exists. Please try a different one.' });
    }
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
    .select('full_name, email, membership_type, avatar, location, farm_size, main_crops, farming_type')
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

<<<<<<< HEAD
// ==================== EXTRA: Trending (public) ====================
app.get('/trending', async (req, res) => {
  const { limit = 10 } = req.query;
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles:user_id (full_name, avatar), likes_count, comments_count')
    .order('likes_count', { ascending: false })
    .limit(parseInt(limit));
  if (error) return res.status(500).json({ error: error.message });
  const trending = data.map(post => ({
    id: post.id,
    title: post.title,
    preview: post.preview,
    author: post.profiles?.full_name || 'Anonymous',
    likes: post.likes_count,
    replies: post.comments_count,
    imageUri: post.media_urls?.[0] || null,
  }));
  res.json(trending);
});

// ==================== TENDER MARKETPLACE ====================

async function getUserRole(userId) {
  const { data, error } = await supabase.from('users').select('role').eq('user_id', userId).single();
  if (error || !data) return null;
  return data.role;
}

app.get('/tenders', async (req, res) => {
  const { category, status = 'open', search } = req.query;
  let query = supabase
    .from('tenders')
    .select('*, retail_profiles:retailer_id(store_name, city), tender_requirements(*)')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  if (category) query = query.eq('product_category', category);
  if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  const tenders = data.map(t => ({
    id: t.tender_id,
    title: t.title,
    description: t.description,
    productCategory: t.product_category,
    quantityNeeded: t.quantity_needed,
    budgetRange: t.budget_range,
    deliveryLocation: t.delivery_location,
    deliveryDate: t.delivery_date,
    deadline: t.deadline,
    status: t.status,
    contactEmail: t.contact_email,
    requiredDocuments: t.required_documents,
    isPrivate: t.is_private,
    retailerName: t.retail_profiles?.store_name || 'Unknown Retailer',
    retailerCity: t.retail_profiles?.city || '',
    requirements: (t.tender_requirements || []).map(r => ({
      id: r.requirement_id,
      productName: r.product_name,
      quantity: r.quantity,
      gradeQuality: r.grade_quality,
    })),
    createdAt: t.created_at,
    timeAgo: formatRelativeTime(t.created_at),
  }));
  res.json(tenders);
});

app.get('/tenders/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('tenders')
    .select('*, retail_profiles:retailer_id(store_name, city, address, business_type), tender_requirements(*)')
    .eq('tender_id', id)
    .single();
  if (error) return res.status(404).json({ error: 'Tender not found' });
  const tender = {
    id: data.tender_id,
    title: data.title,
    description: data.description,
    productCategory: data.product_category,
    quantityNeeded: data.quantity_needed,
    budgetRange: data.budget_range,
    deliveryLocation: data.delivery_location,
    deliveryDate: data.delivery_date,
    deadline: data.deadline,
    status: data.status,
    contactEmail: data.contact_email,
    requiredDocuments: data.required_documents,
    isPrivate: data.is_private,
    retailer: {
      name: data.retail_profiles?.store_name || 'Unknown',
      city: data.retail_profiles?.city || '',
      address: data.retail_profiles?.address || '',
      businessType: data.retail_profiles?.business_type || '',
    },
    requirements: (data.tender_requirements || []).map(r => ({
      id: r.requirement_id,
      productName: r.product_name,
      quantity: r.quantity,
      gradeQuality: r.grade_quality,
      notes: r.notes,
    })),
    createdAt: data.created_at,
  };
  res.json(tender);
});

app.post('/tenders', requireAuth, async (req, res) => {
  const role = await getUserRole(req.user.id);
  if (role !== 'retailer' && role !== 'admin') {
    return res.status(403).json({ error: 'Only retailers can post tenders' });
  }
  const {
    title, description, productCategory, quantityNeeded, budgetRange,
    deliveryLocation, deliveryDate, deadline, contactEmail, requiredDocuments, requirements
  } = req.body;
  if (!title || !description || !deadline) {
    return res.status(400).json({ error: 'Title, description, and deadline are required' });
  }
  const { data: tender, error } = await supabase
    .from('tenders')
    .insert({
      retailer_id: req.user.id,
      title,
      description,
      product_category: productCategory,
      quantity_needed: quantityNeeded,
      budget_range: budgetRange,
      delivery_location: deliveryLocation,
      delivery_date: deliveryDate,
      deadline,
      contact_email: contactEmail,
      required_documents: requiredDocuments,
      status: 'open',
      created_at: new Date(),
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  if (requirements && Array.isArray(requirements) && requirements.length > 0) {
    const reqs = requirements.map(r => ({
      tender_id: tender.tender_id,
      product_name: r.productName,
      quantity: r.quantity,
      grade_quality: r.gradeQuality,
      notes: r.notes,
    }));
    await supabase.from('tender_requirements').insert(reqs);
  }

  res.status(201).json({ success: true, tender });
});

app.put('/tenders/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const role = await getUserRole(req.user.id);
  const { data: existing } = await supabase.from('tenders').select('retailer_id').eq('tender_id', id).single();
  if (!existing) return res.status(404).json({ error: 'Tender not found' });
  if (existing.retailer_id !== req.user.id && role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  const updates = req.body;
  const { error } = await supabase.from('tenders').update(updates).eq('tender_id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get('/my-tenders', requireAuth, async (req, res) => {
  const role = await getUserRole(req.user.id);
  if (role !== 'retailer' && role !== 'admin') {
    return res.status(403).json({ error: 'Only retailers can view their tenders' });
  }
  const { data, error } = await supabase
    .from('tenders')
    .select('*, tender_applications(count)')
    .eq('retailer_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  const tenders = data.map(t => ({
    id: t.tender_id,
    title: t.title,
    status: t.status,
    deadline: t.deadline,
    applicationCount: t.tender_applications?.[0]?.count || 0,
    createdAt: t.created_at,
  }));
  res.json(tenders);
});

app.post('/applications', requireAuth, async (req, res) => {
  const role = await getUserRole(req.user.id);
  if (role !== 'farmer' && role !== 'admin') {
    return res.status(403).json({ error: 'Only farmers can apply to tenders' });
  }
  const { tenderId, proposedPrice, message, deliveryCommitment } = req.body;
  if (!tenderId) return res.status(400).json({ error: 'tenderId is required' });
  const { data, error } = await supabase
    .from('tender_applications')
    .insert({
      tender_id: tenderId,
      farmer_id: req.user.id,
      proposed_price: proposedPrice,
      message,
      delivery_commitment: deliveryCommitment,
      status: 'pending',
      created_at: new Date(),
    })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'You have already applied to this tender' });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json({ success: true, application: data });
});

app.get('/applications', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('tender_applications')
    .select('*, tenders:tender_id(title, retailer_id, status, deadline, retail_profiles:retailer_id(store_name))')
    .eq('farmer_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  const applications = data.map(a => ({
    id: a.application_id,
    tenderId: a.tender_id,
    tenderTitle: a.tenders?.title || '',
    retailerName: a.tenders?.retail_profiles?.store_name || '',
    proposedPrice: a.proposed_price,
    message: a.message,
    status: a.status,
    createdAt: a.created_at,
  }));
  res.json(applications);
});

app.get('/tenders/:id/applications', requireAuth, async (req, res) => {
  const { id } = req.params;
  const role = await getUserRole(req.user.id);
  const { data: tender } = await supabase.from('tenders').select('retailer_id').eq('tender_id', id).single();
  if (!tender) return res.status(404).json({ error: 'Tender not found' });
  if (tender.retailer_id !== req.user.id && role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to view applications' });
  }
  const { data, error } = await supabase
    .from('tender_applications')
    .select('*, profiles:farmer_id(full_name, location, farm_type, bio)')
    .eq('tender_id', id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  const applications = data.map(a => ({
    id: a.application_id,
    farmerId: a.farmer_id,
    farmerName: a.profiles?.full_name || 'Anonymous',
    farmerLocation: a.profiles?.location || '',
    farmType: a.profiles?.farm_type || '',
    bio: a.profiles?.bio || '',
    proposedPrice: a.proposed_price,
    message: a.message,
    deliveryCommitment: a.delivery_commitment,
    status: a.status,
    createdAt: a.created_at,
  }));
  res.json(applications);
});

app.put('/applications/:id/status', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['pending', 'shortlisted', 'accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const role = await getUserRole(req.user.id);
  const { data: appData } = await supabase
    .from('tender_applications')
    .select('tender_id')
    .eq('application_id', id)
    .single();
  if (!appData) return res.status(404).json({ error: 'Application not found' });
  const { data: tender } = await supabase.from('tenders').select('retailer_id').eq('tender_id', appData.tender_id).single();
  if (tender.retailer_id !== req.user.id && role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  const { error } = await supabase.from('tender_applications').update({ status }).eq('application_id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post('/tender-messages', requireAuth, async (req, res) => {
  const { tenderId, receiverId, content } = req.body;
  if (!tenderId || !receiverId || !content) {
    return res.status(400).json({ error: 'tenderId, receiverId, and content are required' });
  }
  const { data: tender } = await supabase.from('tenders').select('retailer_id').eq('tender_id', tenderId).single();
  const { data: application } = await supabase
    .from('tender_applications')
    .select('farmer_id')
    .eq('tender_id', tenderId)
    .eq('farmer_id', req.user.id)
    .maybeSingle();
  const isRetailer = tender && tender.retailer_id === req.user.id;
  const isApplicant = application && application.farmer_id === req.user.id;
  if (!isRetailer && !isApplicant) {
    return res.status(403).json({ error: 'You are not a participant in this tender' });
  }
  const { data, error } = await supabase
    .from('tender_messages')
    .insert({
      tender_id: tenderId,
      sender_id: req.user.id,
      receiver_id: receiverId,
      content,
      created_at: new Date(),
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true, message: data });
});

app.get('/tender-messages/:tenderId', requireAuth, async (req, res) => {
  const { tenderId } = req.params;
  const { data: tender } = await supabase.from('tenders').select('retailer_id').eq('tender_id', tenderId).single();
  const { data: application } = await supabase
    .from('tender_applications')
    .select('farmer_id')
    .eq('tender_id', tenderId)
    .eq('farmer_id', req.user.id)
    .maybeSingle();
  const isRetailer = tender && tender.retailer_id === req.user.id;
  const isApplicant = application && application.farmer_id === req.user.id;
  if (!isRetailer && !isApplicant) {
    return res.status(403).json({ error: 'You are not a participant in this tender' });
  }
  const { data, error } = await supabase
    .from('tender_messages')
    .select('*')
    .eq('tender_id', tenderId)
    .or(`sender_id.eq.${req.user.id},receiver_id.eq.${req.user.id}`)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ==================== EXPERT REQUESTS ====================

app.get('/experts', async (req, res) => {
  // List all available extension officers with their profiles
  const { data: experts, error } = await supabase
    .from('users')
    .select(`
      user_id,
      profiles:user_id (full_name, location, farming_type, bio, avatar)
    `)
    .eq('role', 'extension_officer');
  if (error) return res.status(500).json({ error: error.message });
  const expertsList = (experts || []).map(e => ({
    id: e.user_id,
    name: e.profiles?.full_name || 'Unknown',
    location: e.profiles?.location || '',
    specialty: e.profiles?.farming_type || '',
    bio: e.profiles?.bio || '',
    avatar: e.profiles?.avatar || null,
  }));
  res.json(expertsList);
});

app.post('/expert-requests', requireAuth, async (req, res) => {
  const role = await getUserRole(req.user.id);
  if (role !== 'farmer' && role !== 'admin') {
    return res.status(403).json({ error: 'Only farmers can send expert requests' });
  }
  const { subject, description, category, priority } = req.body;
  if (!subject || !description) {
    return res.status(400).json({ error: 'Subject and description are required' });
  }
  const { data, error } = await supabase
    .from('expert_requests')
    .insert({
      farmer_id: req.user.id,
      subject,
      description,
      category: category || null,
      priority: priority || 'medium',
      status: 'pending',
      created_at: new Date(),
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  // Auto-assign to an available expert if any exist
  try {
    const { data: assignResult } = await supabase.rpc('assign_request_to_expert', {
      request_uuid: data.request_id
    });
    // If an expert was assigned, refresh the returned data with full join
    if (assignResult) {
      const { data: updated } = await supabase
        .from('expert_requests')
        .select(`
          *,
          expert:expert_id (user_id, profiles:user_id (full_name, avatar, location)),
          farmer:farmer_id (user_id, profiles:user_id (full_name, avatar, location))
        `)
        .eq('request_id', data.request_id)
        .single();
      return res.status(201).json({ success: true, request: updated });
    }
  } catch (assignErr) {
    // Auto-assignment failed, request remains pending - that's fine
    console.log('Auto-assignment skipped:', assignErr.message);
  }

  res.status(201).json({ success: true, request: data });
});

app.get('/expert-requests', requireAuth, async (req, res) => {
  const role = await getUserRole(req.user.id);
  let query = supabase
    .from('expert_requests')
    .select(`
      *,
      expert:expert_id (user_id, profiles:user_id (full_name, avatar, location)),
      farmer:farmer_id (user_id, profiles:user_id (full_name, avatar, location))
    `)
    .order('created_at', { ascending: false });

  if (role === 'farmer') {
    query = query.eq('farmer_id', req.user.id);
  } else if (role === 'extension_officer') {
    // Extension officers can view all requests
  } else if (role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  // admin gets all

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const requests = data.map(r => ({
    id: r.request_id,
    subject: r.subject,
    description: r.description,
    category: r.category,
    priority: r.priority,
    status: r.status,
    response: r.response,
    assignedAt: r.assigned_at,
    resolvedAt: r.resolved_at,
    createdAt: r.created_at,
    expert: r.expert ? {
      id: r.expert.user_id,
      name: r.expert.profiles?.full_name || 'Unknown',
      location: r.expert.profiles?.location || '',
      avatar: r.expert.profiles?.avatar || null,
    } : null,
    farmer: r.farmer ? {
      id: r.farmer.user_id,
      name: r.farmer.profiles?.full_name || 'Unknown',
      location: r.farmer.profiles?.location || '',
      avatar: r.farmer.profiles?.avatar || null,
    } : null,
  }));
  res.json(requests);
});

app.get('/expert-requests/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const role = await getUserRole(req.user.id);

  const { data, error } = await supabase
    .from('expert_requests')
    .select(`
      *,
      expert:expert_id (user_id, profiles:user_id (full_name, avatar, location, farming_type, bio)),
      farmer:farmer_id (user_id, profiles:user_id (full_name, avatar, location, farm_size, main_crops))
    `)
    .eq('request_id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Request not found' });
    }
    return res.status(500).json({ error: error.message });
  }

  // Authorization: only farmer (owner), assigned expert, or admin can view
  const isOwner = data.farmer_id === req.user.id;
  const isAssignedExpert = data.expert_id === req.user.id;
  const isAdmin = role === 'admin';
  if (!isOwner && !isAssignedExpert && !isAdmin) {
    return res.status(403).json({ error: 'Not authorized to view this request' });
  }

  const request = {
    id: data.request_id,
    subject: data.subject,
    description: data.description,
    category: data.category,
    priority: data.priority,
    status: data.status,
    response: data.response,
    assignedAt: data.assigned_at,
    resolvedAt: data.resolved_at,
    createdAt: data.created_at,
    expert: data.expert ? {
      id: data.expert.user_id,
      name: data.expert.profiles?.full_name || 'Unknown',
      location: data.expert.profiles?.location || '',
      specialty: data.expert.profiles?.farming_type || '',
      bio: data.expert.profiles?.bio || '',
      avatar: data.expert.profiles?.avatar || null,
    } : null,
    farmer: {
      id: data.farmer.user_id,
      name: data.farmer.profiles?.full_name || 'Unknown',
      location: data.farmer.profiles?.location || '',
      farmSize: data.farmer.profiles?.farm_size || '',
      mainCrops: data.farmer.profiles?.main_crops || [],
      avatar: data.farmer.profiles?.avatar || null,
    },
  };

  res.json(request);
});

app.put('/expert-requests/:id/status', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status, response } = req.body;
  const role = await getUserRole(req.user.id);

  // Validate status
  if (status && !['pending', 'assigned', 'in_progress', 'resolved', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Get current request
  const { data: request, error: fetchErr } = await supabase
    .from('expert_requests')
    .select('*')
    .eq('request_id', id)
    .single();

  if (fetchErr) {
    if (fetchErr.code === 'PGRST116') {
      return res.status(404).json({ error: 'Request not found' });
    }
    return res.status(500).json({ error: fetchErr.message });
  }

  // Authorization: only assigned expert or admin can update status/response
  const isAssignedExpert = request.expert_id === req.user.id;
  const isAdmin = role === 'admin';
  if (!isAssignedExpert && !isAdmin) {
    return res.status(403).json({ error: 'Only the assigned expert or admin can update this request' });
  }

  const updates = { updated_at: new Date() };
  if (status) updates.status = status;
  if (response !== undefined) updates.response = response;

  if (status === 'assigned' && !request.expert_id) {
    updates.expert_id = req.user.id;
    updates.assigned_at = new Date();
  }
  if (status === 'resolved') {
    updates.resolved_at = new Date();
  }

  const { error } = await supabase
    .from('expert_requests')
    .update(updates)
    .eq('request_id', id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

app.post('/expert-requests/:id/messages', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Message content is required' });

  // Verify requester is participant
  const { data: request, error: fetchErr } = await supabase
    .from('expert_requests')
    .select('farmer_id, expert_id')
    .eq('request_id', id)
    .single();

  if (fetchErr) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const isFarmer = request.farmer_id === req.user.id;
  const isExpert = request.expert_id === req.user.id;
  if (!isFarmer && !isExpert) {
    return res.status(403).json({ error: 'Only the farmer or assigned expert can send messages' });
  }

  // If request is in a terminal state, disallow new messages
  if (request.status === 'closed') {
    return res.status(400).json({ error: 'Cannot send messages to a closed request' });
  }

  const { data, error } = await supabase
    .from('expert_request_messages')
    .insert({
      request_id: id,
      sender_id: req.user.id,
      content,
      created_at: new Date(),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true, message: data });
});

app.get('/expert-requests/:id/messages', requireAuth, async (req, res) => {
  const { id } = req.params;

  // Verify requester is participant
  const { data: request, error: fetchErr } = await supabase
    .from('expert_requests')
    .select('farmer_id, expert_id')
    .eq('request_id', id)
    .single();

  if (fetchErr) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const isFarmer = request.farmer_id === req.user.id;
  const isExpert = request.expert_id === req.user.id;
  if (!isFarmer && !isExpert) {
    return res.status(403).json({ error: 'Only the farmer and assigned expert can view messages' });
  }

  const { data, error } = await supabase
    .from('expert_request_messages')
    .select(`
      *,
      sender:sender_id (
        user_id,
        profiles:user_id (full_name, avatar)
      )
    `)
    .eq('request_id', id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const messages = (data || []).map(m => ({
    id: m.message_id,
    content: m.content,
    isRead: m.is_read,
    createdAt: m.created_at,
    sender: {
      id: m.sender.user_id,
      name: m.sender.profiles?.full_name || 'Unknown',
      avatar: m.sender.profiles?.avatar || null,
    },
  }));

  res.json(messages);
});

app.delete('/expert-requests/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  // Get request to check ownership and status
  const { data: request, error: fetchErr } = await supabase
    .from('expert_requests')
    .select('farmer_id, status')
    .eq('request_id', id)
    .single();

  if (fetchErr) {
    return res.status(404).json({ error: 'Request not found' });
  }

  // Only farmer owner can delete, and only if pending or assigned (no messages/responses yet)
  if (request.farmer_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the farmer who created this request can delete it' });
  }

  if (!['pending', 'assigned'].includes(request.status)) {
    return res.status(400).json({ error: 'Cannot delete a request that is in progress or resolved' });
  }

  const { error } = await supabase
    .from('expert_requests')
    .delete()
    .eq('request_id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
=======
// ==================== OUTBREAK REPORTING (NEW) ====================
// Submit an outbreak report (with media)
app.post('/outbreak/report', requireAuth, upload.array('media', 5), async (req, res) => {
  const { animalType, diseaseName, description, location } = req.body;
  const files = req.files || [];
  if (!animalType || !location) {
    return res.status(400).json({ error: 'Animal type and location are required' });
  }
  if (files.length === 0) {
    return res.status(400).json({ error: 'At least one photo/video is required' });
  }

  try {
    // 1. Insert report
    const { data: report, error: reportError } = await supabase
      .from('outbreak_reports')
      .insert({
        user_id: req.user.id,
        animal_type: animalType,
        disease_name: diseaseName || null,
        description: description || null,
        location: location, // expects "POINT(lng lat)" string
        status: 'pending',
        created_at: new Date()
      })
      .select()
      .single();
    if (reportError) throw reportError;

    // 2. Upload media to storage and insert records
    const mediaUrls = [];
    for (const file of files) {
      const fileName = `${report.id}/${Date.now()}_${file.originalname}`;
      const { error: uploadError } = await supabase.storage
        .from('outbreak-media')
        .upload(fileName, file.buffer, { contentType: file.mimetype });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from('outbreak-media').getPublicUrl(fileName);
      mediaUrls.push(publicUrl.publicUrl);
    }
    const mediaInserts = mediaUrls.map(url => ({
      report_id: report.id,
      media_url: url,
      media_type: url.match(/\.mp4$/i) ? 'video' : 'image',
      created_at: new Date()
    }));
    const { error: mediaError } = await supabase.from('outbreak_media').insert(mediaInserts);
    if (mediaError) throw mediaError;

    // 3. Run AI verification (mock)
    const verification = await verifyOutbreakMedia(mediaUrls, location);

    // 4. Update report with verification result
    const { error: updateError } = await supabase
      .from('outbreak_reports')
      .update({
        status: verification.status,
        ai_confidence_score: verification.confidence,
        verification_reason: verification.reason,
        updated_at: new Date()
      })
      .eq('id', report.id);
    if (updateError) throw updateError;

    // 5. If verified, notify relevant farmers (by animal type)
    if (verification.status === 'verified') {
      // Get farmers who farm this animal type
      const { data: farmers } = await supabase
        .from('user_farming_types')
        .select('user_id')
        .contains('animal_types', [animalType]);
      if (farmers && farmers.length) {
        const notifications = farmers.map(f => ({
          user_id: f.user_id,
          type: 'outbreak_alert',
          title: `⚠️ ${animalType.toUpperCase()} Disease Alert`,
          message: `A ${diseaseName || 'disease'} outbreak has been verified near ${location}.`,
          action_url: `/outbreak/${report.id}`,
          created_at: new Date(),
          read: false,
        }));
        await supabase.from('notifications').insert(notifications);
      }
    }

    // 6. Return result with card message
    let cardMessage = '';
    let cardType = '';
    if (verification.status === 'verified') {
      cardMessage = `✅ Report verified! The outbreak has been confirmed and relevant farmers have been notified.`;
      cardType = 'success';
    } else {
      cardMessage = `❌ Report rejected: ${verification.reason}. Please review and resubmit if this was a genuine outbreak.`;
      cardType = 'error';
    }

    res.status(201).json({
      success: true,
      reportId: report.id,
      verificationStatus: verification.status,
      card: { message: cardMessage, type: cardType }
    });
  } catch (err) {
    console.error('Outbreak report error', err);
    res.status(500).json({ error: err.message });
  }
});

// Get a user's outbreak reports (with verification status)
app.get('/outbreak/reports/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  if (req.user.id !== userId) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data, error } = await supabase
      .from('outbreak_reports')
      .select('*, outbreak_media(media_url, media_type)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single outbreak report details (for heat map or details view)
app.get('/outbreak/report/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('outbreak_reports')
      .select('*, outbreak_media(media_url, media_type)')
      .eq('id', id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all verified outbreaks (for heat map)
app.get('/outbreak/verified', async (req, res) => {
  const { limit = 100 } = req.query;
  try {
    const { data, error } = await supabase
      .from('outbreak_reports')
      .select('id, animal_type, disease_name, location, created_at, ai_confidence_score')
      .eq('status', 'verified')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to get verification card for a specific report
app.get('/outbreak/verification/:reportId', async (req, res) => {
  const { reportId } = req.params;
  try {
    const { data, error } = await supabase
      .from('outbreak_reports')
      .select('status, verification_reason, ai_confidence_score')
      .eq('id', reportId)
      .single();
    if (error) throw error;
    let cardMessage = '';
    if (data.status === 'verified') {
      cardMessage = `✅ Report verified! Confidence: ${Math.round(data.ai_confidence_score * 100)}% – ${data.verification_reason || 'Outbreak confirmed.'}`;
    } else if (data.status === 'rejected') {
      cardMessage = `❌ Report rejected: ${data.verification_reason || 'Media validation failed.'} Please provide clearer evidence.`;
    } else {
      cardMessage = `⏳ Verifying your report... We'll notify you once the AI check is complete.`;
    }
    res.json({ status: data.status, message: cardMessage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
>>>>>>> remotes/gozilethu/farmlink-Mbutho
});

// ==================== START SERVER ====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`FarmLink main server running on port ${PORT}`);
});
 
