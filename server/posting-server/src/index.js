require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Multer setup for memory storage (files will be uploaded to Supabase Storage)
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Helper: upload file to Supabase Storage
async function uploadFile(file, folder) {
  const fileExt = path.extname(file.originalname);
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('posts')
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  // Get public URL
  const { data: publicUrl } = supabase.storage.from('posts').getPublicUrl(filePath);
  return publicUrl.publicUrl;
}

// POST /post – create a new question (no title)
app.post('/post', upload.array('media', 5), async (req, res) => {
  const { userId, description, category, location } = req.body;
  const files = req.files || [];

  if (!userId) return res.status(400).json({ error: 'User ID is required' });
  if (!description || description.trim().length < 20) {
    return res.status(400).json({ error: 'Description must be at least 20 characters' });
  }
  if (!category) return res.status(400).json({ error: 'Category is required' });

  try {
    // Upload media files
    const mediaUrls = [];
    for (const file of files) {
      try {
        const url = await uploadFile(file, `user_${userId}`);
        mediaUrls.push({ url, type: file.mimetype.startsWith('image/') ? 'image' : 'video' });
      } catch (err) {
        console.error('Failed to upload file:', err);
      }
    }

    // Insert post into Supabase (no title column)
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        description: description.trim(),
        category,
        location: location || null,
        media: mediaUrls,
        created_at: new Date(),
        likes: 0,
        replies: 0,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, post: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// GET /posts – fetch recent posts (for community feed)
app.get('/posts', async (req, res) => {
  const { limit = 20, category } = req.query;
  let query = supabase
    .from('posts')
    .select('*, profiles(name, avatar)')
    .order('created_at', { ascending: false })
    .limit(parseInt(limit));

  if (category && category !== 'All') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Posting server running on port ${PORT}`);
});