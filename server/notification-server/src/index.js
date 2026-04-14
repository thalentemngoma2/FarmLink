require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

// -------------------- Helper --------------------
function getIconType(type) {
  const map = {
    reply: 'chatbubble-outline',
    like: 'heart-outline',
    follow: 'person-add-outline',
    achievement: 'trophy-outline',
    alert: 'alert-circle-outline',
    system: 'checkmark-circle-outline',
  };
  return map[type] || 'notifications-outline';
}

function getIconColor(type) {
  const map = {
    reply: '#3b82f6',
    like: '#ec489a',
    follow: '#8b5cf6',
    achievement: '#f59e0b',
    alert: '#ef4444',
    system: '#22c55e',
  };
  return map[type] || '#9ca3af';
}

// GET /notifications/:userId?filter=all|unread
app.get('/notifications/:userId', async (req, res) => {
  const { userId } = req.params;
  const { filter = 'all' } = req.query;

  if (!userId) return res.status(400).json({ error: 'User ID required' });

  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filter === 'unread') {
      query = query.eq('read', false);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Transform to frontend format
    const notifications = data.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      time: new Date(n.created_at).toLocaleString(),
      read: n.read,
      actionUrl: n.action_url,
      iconName: getIconType(n.type),
      iconColor: getIconColor(n.type),
    }));

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /notifications/:userId/read/:id
app.post('/notifications/:userId/read/:id', async (req, res) => {
  const { userId, id } = req.params;
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /notifications/:userId/read-all
app.post('/notifications/:userId/read-all', async (req, res) => {
  const { userId } = req.params;
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /notifications/:userId/:id
app.delete('/notifications/:userId/:id', async (req, res) => {
  const { userId, id } = req.params;
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Notification server running on port ${PORT}`);
});

// Internal endpoint (used by other services)
app.post('/internal/notifications', async (req, res) => {
  const { user_id, type, title, message, action_url } = req.body;
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({ user_id, type, title, message, action_url, created_at: new Date() });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});