require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3007;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

// GET /user/:userId - get user profile (name, email, badge)
app.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('name, email, membership_type, avatar')
      .eq('id', userId)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /settings/:userId - get user preferences
app.get('/settings/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('dark_mode, push_notifications, offline_mode, language')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error; // not found is fine
    if (!data) {
      // return defaults
      return res.json({ dark_mode: false, push_notifications: true, offline_mode: false, language: 'en' });
    }
    res.json({
      dark_mode: data.dark_mode,
      push_notifications: data.push_notifications,
      offline_mode: data.offline_mode,
      language: data.language,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /settings/:userId - update user preferences
app.put('/settings/:userId', async (req, res) => {
  const { userId } = req.params;
  const { dark_mode, push_notifications, offline_mode, language } = req.body;
  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        dark_mode,
        push_notifications,
        offline_mode,
        language,
        updated_at: new Date(),
      }, { onConflict: 'user_id' });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Settings server running on port ${PORT}`);
});