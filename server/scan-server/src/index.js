require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3003;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Helper: upload image to Supabase Storage
async function uploadImage(fileBuffer, fileName, userId) {
  const filePath = `scans/${userId}/${Date.now()}_${fileName}`;
  const { data, error } = await supabase.storage
    .from('plant-scans')
    .upload(filePath, fileBuffer, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  const { data: publicUrl } = supabase.storage.from('plant-scans').getPublicUrl(filePath);
  return publicUrl.publicUrl;
}

// Mock AI analysis – replace with real model (e.g., TensorFlow, Google Vision)
async function analyzePlant(imageBuffer) {
  // Simulate analysis (same logic as before but on server)
  await new Promise(resolve => setTimeout(resolve, 2000));
  const random = Math.random();
  if (random < 0.25) return {
    state: 'undergrowth',
    cause: 'Nitrogen deficiency or insufficient sunlight.',
    solution: 'Apply compost tea or a balanced organic fertilizer. Ensure 6+ hours of direct sun.',
    preventiveTips: 'Test soil before planting. Rotate crops and add green manure.',
  };
  if (random < 0.5) return {
    state: 'overgrowth',
    cause: 'Excessive nitrogen fertilization or poor pruning.',
    solution: 'Reduce nitrogen-heavy fertilizers. Prune overcrowded branches to improve air circulation.',
    preventiveTips: 'Follow recommended fertilizer schedules. Use slow-release formulas.',
  };
  if (random < 0.75) return {
    state: 'disease',
    cause: 'Fungal infection (leaf spot) or pest damage (aphids).',
    solution: 'Apply neem oil or a copper-based fungicide. Remove affected leaves.',
    preventiveTips: 'Water at the base, avoid wetting leaves. Space plants for airflow.',
  };
  return {
    state: 'healthy',
    cause: 'No issues detected.',
    solution: 'Continue current care routine. Monitor weekly.',
    preventiveTips: 'Maintain consistent watering and mulching.',
  };
}

// POST /scan – requires authentication (userId in body or from token)
app.post('/scan', upload.single('image'), async (req, res) => {
  const { userId, plantName } = req.body;
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  if (!plantName || !plantName.trim()) return res.status(400).json({ error: 'Plant name is required' });
  if (!req.file) return res.status(400).json({ error: 'Image is required' });

  try {
    // 1. Upload image to Supabase Storage
    const imageUrl = await uploadImage(req.file.buffer, req.file.originalname, userId);

    // 2. Run AI analysis
    const analysis = await analyzePlant(req.file.buffer);

    // 3. Save scan record in database
    const { data, error } = await supabase
      .from('plant_scans')
      .insert({
        user_id: userId,
        plant_name: plantName.trim(),
        image_url: imageUrl,
        analysis_state: analysis.state,
        analysis_cause: analysis.cause,
        analysis_solution: analysis.solution,
        analysis_preventive: analysis.preventiveTips,
        created_at: new Date(),
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, scan: data, analysis });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process scan' });
  }
});

// GET /scans/:userId – fetch user's scan history
app.get('/scans/:userId', async (req, res) => {
  const { userId } = req.params;
  const { limit = 20 } = req.query;
  try {
    const { data, error } = await supabase
      .from('plant_scans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /community-scans – fetch recent scans from other users (excluding current user)
app.get('/community-scans', async (req, res) => {
  const { userId, limit = 6 } = req.query;
  try {
    let query = supabase
      .from('plant_scans')
      .select('*, profiles(name, location)')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    if (userId) query = query.neq('user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    // Transform to match frontend CommunityScan type
    const communityScans = data.map(scan => ({
      id: scan.id,
      farmerName: scan.profiles?.name || 'Anonymous',
      location: scan.profiles?.location || 'Unknown',
      imageUri: scan.image_url,
      plantName: scan.plant_name,
      analysisState: scan.analysis_state === 'healthy' ? 'Healthy' :
                     scan.analysis_state === 'disease' ? 'Disease detected' :
                     scan.analysis_state === 'undergrowth' ? 'Undergrowth' : 'Overgrowth',
      timestamp: new Date(scan.created_at).toLocaleString(),
    }));
    res.json(communityScans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Scan server running on port ${PORT}`));