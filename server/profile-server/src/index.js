require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for admin access
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

// GET /profile/:userId - fetch profile info
app.get('/profile/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Profile not found' });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /profile - create or update profile
app.post('/profile', async (req, res) => {
  const { id, name, avatar, location, joinDate, farmSize, mainCrops, farmingType, stats } = req.body;

  if (!id) return res.status(400).json({ error: 'User ID is required' });

  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id,
        name,
        avatar,
        location,
        join_date: joinDate,
        farm_size: farmSize,
        main_crops: mainCrops,
        farming_type: farmingType,
        questions_count: stats?.questions,
        answers_count: stats?.answers,
        likes_count: stats?.likes,
        updated_at: new Date(),
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// GET /profile/:userId/achievements
app.get('/profile/:userId/achievements', async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('achievement_id, earned_at')
      .eq('user_id', userId);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

app.listen(PORT, () => {
  console.log(`Profile server running on port ${PORT}`);
});