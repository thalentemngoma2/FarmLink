require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3004;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for admin operations
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

// -------------------- Sign Up --------------------
app.post('/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name || email.split('@')[0] } }
    });
    if (error) throw error;

    // Auto‑create profile entry (optional, handled by DB trigger)
    res.status(201).json({ message: 'Verification email sent', user: data.user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------- Verify OTP (Email confirmation) --------------------
// Supabase sends a confirmation email automatically. The user clicks the link.
// If you need an OTP code, you can use the `verifyOtp` endpoint with `type: 'email'` and a token.
// Here we provide a generic endpoint for OTP verification.
app.post('/auth/verify-otp', async (req, res) => {
  const { email, token } = req.body;
  if (!email || !token) return res.status(400).json({ error: 'Email and token required' });

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw error;
    res.json({ message: 'Email verified successfully', user: data.user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------- Login --------------------
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

// -------------------- Forgot Password (send reset email) --------------------
app.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'farmlink://reset-password', // deep link to your app
    });
    if (error) throw error;
    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------- Reset Password (after receiving token) --------------------
app.post('/auth/reset-password', async (req, res) => {
  const { access_token, new_password } = req.body;
  if (!access_token || !new_password) return res.status(400).json({ error: 'Token and new password required' });

  try {
    // Set the user's session using the access token
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token: '' });
    if (error) throw error;
    const { error: updateError } = await supabase.auth.updateUser({ password: new_password });
    if (updateError) throw updateError;
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------- Get User (for session validation) --------------------
app.get('/auth/user', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return res.status(401).json({ error: error.message });
  res.json({ user: data.user });
});

app.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
});