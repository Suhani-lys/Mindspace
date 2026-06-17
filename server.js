const path = require('path');
const express = require('express');  
const mongoose = require('mongoose');   
require('dotenv').config();  
const cors = require('cors'); 
const predictMentalState = require('./ml/mentalStateModel');
let JournalEntry = require('./models/journalEntry');
const cbtExercises = require('./data/cbt_exercises.json');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
let User = require('./models/User');
const Razorpay = require('razorpay');
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

let Mood, Post;
let dbConnected = false;

// In-memory fallback storage
let moods = [];
let posts = [];
let journals = [];
let usersFallback = [];

const app = express();
app.use(cors());
app.use(express.json());
// Serve static frontend files from this project directory
app.use(express.static(path.join(__dirname)));
console.log('SERVING FROM', path.join(__dirname));

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configure mongoose to not buffer operations
mongoose.set('bufferTimeoutMS', 5000);

function startServer() {
  server.listen(process.env.PORT || 5000, () => {
    console.log('🚀 Server running on port', process.env.PORT || 5000);
    console.log(`📊 Database: ${dbConnected ? 'MongoDB Connected' : 'Using in-memory storage'}`);
  });
}

function connectDatabase() {
  if (!process.env.MONGO_URI) {
    console.log('⚠️  No MONGO_URI provided. Starting with in-memory storage.');
    startServer();
    return;
  }

  mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 3000 })
    .then(() => {
      console.log('✅ MongoDB Connected');
      dbConnected = true;
      Mood = require('./models/Mood');
      Post = require('./models/post');
      JournalEntry = require('./models/journalEntry');
      User = require('./models/User');
    })
    .catch(err => {
      console.log('⚠️  MongoDB connection failed - using in-memory storage');
      console.log('Error:', err.message.split('\n')[0]);
      dbConnected = false;
    })
    .finally(() => {
      if (!dbConnected) {
        console.log('ℹ️  Running in fallback mode. Data will not persist after restart.');
      }
      startServer();
    });
}

connectDatabase();

const JWT_SECRET = process.env.JWT_SECRET || 'mindspace-super-secret-key-2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || !username.trim() || !password.trim()) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const cleanUsername = username.trim();

    // Check if user already exists
    let userExists = false;
    if (dbConnected && User) {
      const existing = await User.findOne({ username: cleanUsername });
      if (existing) userExists = true;
    } else {
      userExists = usersFallback.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
    }

    if (userExists) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (dbConnected && User) {
      const newUser = new User({ username: cleanUsername, password: hashedPassword });
      await newUser.save();
    } else {
      usersFallback.push({
        _id: 'fallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        username: cleanUsername,
        password: hashedPassword,
        createdAt: new Date()
      });
    }

    res.status(201).json({ success: true, message: 'Registration successful' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during registration' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || !username.trim() || !password.trim()) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const cleanUsername = username.trim();
    let matchedUser = null;

    if (dbConnected && User) {
      matchedUser = await User.findOne({ username: cleanUsername });
    } else {
      matchedUser = usersFallback.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
    }

    if (!matchedUser) {
      return res.status(400).json({ success: false, message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, matchedUser.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid username or password' });
    }

    const userId = matchedUser._id.toString();
    const token = jwt.sign({ userId, username: matchedUser.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      username: matchedUser.username,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
});

// Razorpay Subscription Creation
app.post('/api/razorpay/create-subscription', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Check if user exists (DB or fallback)
    let user = null;
    if (dbConnected && User) {
      user = await User.findById(userId);
    } else {
      user = usersFallback.find(u => u._id === userId);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fall back to Mock Checkout if Razorpay is not configured
    if (!razorpay) {
      console.log('⚠️ Razorpay credentials are not configured. Redirecting to simulated checkout.');
      return res.json({
        success: true,
        mock: true,
        url: `/mock-checkout.html?userId=${userId}`
      });
    }

    // Resolve or dynamically create plan ID
    let planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      try {
        const plansList = await razorpay.plans.all();
        const existingPlan = plansList.items.find(p => p.item.name === "MindSpace Premium");
        if (existingPlan) {
          planId = existingPlan.id;
        } else {
          const plan = await razorpay.plans.create({
            period: 'monthly',
            interval: 1,
            item: {
              name: "MindSpace Premium",
              amount: 90000, // Rs 900.00 (90000 paise)
              currency: "INR",
              description: "Monthly mental health resources paywall bypass"
            }
          });
          planId = plan.id;
        }
      } catch (planError) {
        console.error("Failed to dynamically check/create Razorpay plan:", planError);
        planId = 'plan_fallback_mindspace';
      }
    }

    // Real Razorpay Subscription creation
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12,
      quantity: 1,
      notes: {
        userId: userId
      }
    });

    res.json({
      success: true,
      mock: false,
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Razorpay checkout error:', error);
    res.status(500).json({ success: false, message: 'Payment gateway configuration error' });
  }
});

// Verify payment signature
app.post('/api/razorpay/verify-payment', authenticateToken, async (req, res) => {
  try {
    const crypto = require('crypto');
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification fields are required' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret';
    const generated_signature = crypto
      .createHmac('sha256', keySecret)
      .update(razorpay_payment_id + '|' + razorpay_subscription_id)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      // Signature verified successfully
      if (dbConnected && User) {
        const user = await User.findById(req.user.userId);
        if (user) {
          user.isSubscribed = true;
          user.razorpaySubscriptionId = razorpay_subscription_id;
          user.razorpayPaymentId = razorpay_payment_id;
          await user.save();
        }
      } else {
        const user = usersFallback.find(u => u._id === req.user.userId);
        if (user) {
          user.isSubscribed = true;
        }
      }
      console.log(`✅ Razorpay Subscription activated for user: ${req.user.userId}`);
      res.json({ success: true, message: 'Subscription successfully verified' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('Payment signature verification error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during verification' });
  }
});

// Mock Razorpay payment success callback
app.post('/api/razorpay/mock-success', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    if (dbConnected && User) {
      const user = await User.findById(userId);
      if (user) {
        user.isSubscribed = true;
        await user.save();
      }
    } else {
      const user = usersFallback.find(u => u._id === userId);
      if (user) {
        user.isSubscribed = true;
      }
    }

    console.log(`✅ Subscription activated for user: ${userId} (Simulated Checkout)`);
    res.json({ success: true, message: 'Subscription activated' });
  } catch (error) {
    console.error('Mock payment success error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Fetch current subscription status
app.get('/api/razorpay/subscription-status', authenticateToken, async (req, res) => {
  try {
    let isSubscribed = false;
    if (dbConnected && User) {
      const user = await User.findById(req.user.userId);
      isSubscribed = user ? user.isSubscribed : false;
    } else {
      const user = usersFallback.find(u => u._id === req.user.userId);
      isSubscribed = user ? !!user.isSubscribed : false;
    }
    res.json({ success: true, isSubscribed });
  } catch (error) {
    res.status(500).json({ success: false, isSubscribed: false });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.post('/mood', authenticateToken, async (req, res) => {
  try {
    const moodData = { userId: req.user.userId, mood: req.body.mood, createdAt: new Date() };
    
    if (dbConnected && Mood) {
      const newMood = new Mood(moodData);
      await newMood.save();
      res.json({ success: true, message: 'Mood saved to database' });
    } else {
      moods.push(moodData);
      res.json({ success: true, message: 'Mood saved (in-memory)' });
    }
  } catch (error) {
    console.log('POST /mood error:', error.message);
    res.status(500).json({ success: false, message: 'Error saving mood' });
  }
});

app.get('/moods', authenticateToken, async (req, res) => {
  try {
    if (dbConnected && Mood) {
      const result = await Mood.find({ userId: req.user.userId }).sort({ createdAt: -1 });
      res.json(result);
    } else {
      res.json(moods.filter(m => m.userId === req.user.userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    }
  } catch (error) {
    console.log('GET /moods error:', error.message);
    res.status(500).json([]);
  }
});

app.post('/posts', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const prediction = predictMentalState(message);
    
    const postData = {
      userId: req.user.userId,
      message: message,
      predictedEmotion: prediction.emotion,
      distressLevel: prediction.distressLevel,
      createdAt: new Date()
    };

    if (dbConnected && Post) {
      const newPost = new Post(postData);
      await newPost.save();
    } else {
      posts.push(postData);
    }

    res.json({
      success: true,
      message: 'Post saved',
      prediction: prediction
    });
  } catch (error) {
    console.log('POST /posts error:', error.message);
    res.status(500).json({ success: false, message: 'Error saving post' });
  }
});

app.get('/posts', authenticateToken, async (req, res) => {
  try {
    if (dbConnected && Post) {
      const result = await Post.find().sort({ createdAt: -1 });
      res.json(result);
    } else {
      res.json(posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    }
  } catch (error) {
    console.log('GET /posts error:', error.message);
    res.status(500).json([]);
  }
});




// Add these routes:
app.post('/api/journal', authenticateToken, async (req, res) => {
  try {
    const entryData = {
      userId: req.user.userId,
      text: req.body.text,
      mood: req.body.mood,
      tags: req.body.tags || [],
      createdAt: new Date()
    };
    if (dbConnected && JournalEntry) {
      const entry = new JournalEntry(entryData);
      await entry.save();
    } else {
      journals.push(entryData);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.get('/api/journal', authenticateToken, async (req, res) => {
  try {
    if (dbConnected && JournalEntry) {
      const entries = await JournalEntry.find({ userId: req.user.userId }).sort({ createdAt: -1 });
      res.json(entries);
    } else {
      res.json(journals.filter(j => j.userId === req.user.userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    }
  } catch (error) {
    res.status(500).json([]);
  }
});

app.post('/api/ml/predict-emotion', authenticateToken, (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }
    const prediction = predictMentalState(text);
    res.json({ success: true, emotion: prediction.emotion, distressLevel: prediction.distressLevel });
  } catch (error) {
    console.error('Emotion prediction error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/analytics', authenticateToken, async (req, res) => {
  try {
    let allMoods = [];
    let allJournals = [];
    let allPosts = [];

    if (dbConnected && Mood && JournalEntry && Post) {
      allMoods = await Mood.find({ userId: req.user.userId });
      allJournals = await JournalEntry.find({ userId: req.user.userId });
      allPosts = await Post.find({ userId: req.user.userId });
    } else {
      allMoods = moods.filter(m => m.userId === req.user.userId);
      allJournals = journals.filter(j => j.userId === req.user.userId);
      allPosts = posts.filter(p => p.userId === req.user.userId);
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // 1. Calculate check-in streak
    const checkInDates = new Set();
    const addDate = (date) => {
      if (!date) return;
      const d = new Date(date);
      const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      checkInDates.add(formatted);
    };

    allMoods.forEach(m => addDate(m.createdAt));
    allJournals.forEach(j => addDate(j.createdAt));
    allPosts.forEach(p => addDate(p.createdAt));

    const sortedDates = Array.from(checkInDates).sort((a, b) => new Date(b) - new Date(a));
    
    let streak = 0;
    if (sortedDates.length > 0) {
      const todayStr = `${startOfToday.getFullYear()}-${String(startOfToday.getMonth() + 1).padStart(2, '0')}-${String(startOfToday.getDate()).padStart(2, '0')}`;
      
      const yesterday = new Date(startOfToday);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

      if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
        streak = 1;
        let current = new Date(sortedDates[0] === todayStr ? startOfToday : yesterday);
        
        while (true) {
          current.setDate(current.getDate() - 1);
          const currentStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
          if (checkInDates.has(currentStr)) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    // 2. Weekly statistics (last 7 days)
    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const weeklyMoods = allMoods.filter(m => new Date(m.createdAt) >= sevenDaysAgo);
    const weeklyJournals = allJournals.filter(j => new Date(j.createdAt) >= sevenDaysAgo);
    const weeklyPosts = allPosts.filter(p => new Date(p.createdAt) >= sevenDaysAgo);

    const ventsCount = weeklyPosts.length;
    const journalsCount = weeklyJournals.length;

    // 3. Calm Days Count & Most Frequent Mood
    const moodCounts = {};
    let calmDays = 0;
    const uniqueCalmDays = new Set();

    const processMoodValue = (moodVal, date) => {
      if (!moodVal) return;
      const normalized = moodVal.trim();
      moodCounts[normalized] = (moodCounts[normalized] || 0) + 1;
      
      if (['Good', 'Happy', 'Neutral', 'Calm'].includes(normalized)) {
        const d = new Date(date);
        const dateStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        uniqueCalmDays.add(dateStr);
      }
    };

    weeklyMoods.forEach(m => processMoodValue(m.mood, m.createdAt));
    weeklyJournals.forEach(j => processMoodValue(j.mood, j.createdAt));

    calmDays = uniqueCalmDays.size;

    let mostFrequentMood = 'Neutral';
    let maxCount = 0;
    let totalMoodLogs = 0;
    Object.keys(moodCounts).forEach(m => {
      totalMoodLogs += moodCounts[m];
      if (moodCounts[m] > maxCount) {
        maxCount = moodCounts[m];
        mostFrequentMood = m;
      }
    });

    const frequentMoodPercentage = totalMoodLogs > 0 ? Math.round((maxCount / totalMoodLogs) * 100) : 0;

    // 4. Timeline Data: Average mood score for each of the last 7 days
    const days = [];
    const dayLabels = [];
    const moodMap = {
      'Very Sad': 1,
      'Sad': 2,
      'Neutral': 3,
      'Good': 4,
      'Calm': 4,
      'Happy': 5
    };

    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      dayLabels.push(weekdayNames[d.getDay()]);

      const scores = [];
      allMoods.forEach(m => {
        const md = new Date(m.createdAt);
        const mdStr = `${md.getFullYear()}-${String(md.getMonth() + 1).padStart(2, '0')}-${String(md.getDate()).padStart(2, '0')}`;
        if (mdStr === dateStr && moodMap[m.mood]) {
          scores.push(moodMap[m.mood]);
        }
      });
      allJournals.forEach(j => {
        const jd = new Date(j.createdAt);
        const jdStr = `${jd.getFullYear()}-${String(jd.getMonth() + 1).padStart(2, '0')}-${String(jd.getDate()).padStart(2, '0')}`;
        if (jdStr === dateStr && moodMap[j.mood]) {
          scores.push(moodMap[j.mood]);
        }
      });

      if (scores.length > 0) {
        const avg = scores.reduce((sum, val) => sum + val, 0) / scores.length;
        days.push(Math.round(avg * 10) / 10);
      } else {
        days.push(3); // default to Neutral (3)
      }
    }

    res.json({
      success: true,
      streak,
      ventsCount,
      journalsCount,
      calmDays,
      mostFrequentMood,
      frequentMoodPercentage,
      timeline: {
        labels: dayLabels,
        data: days
      }
    });

  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
async function callHuggingFace(promptText) {
  const model = "meta-llama/Llama-3.3-70B-Instruct";
  console.log(`🤖 Attempting Hugging Face Fallback using model: ${model}`);
  
  if (!process.env.HF_API_KEY) {
    throw new Error("HF_API_KEY is not configured in environment variables.");
  }

  const response = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.HF_API_KEY}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { "role": "system", "content": "You are a compassionate mental health support companion called MindSpace AI. Respond directly in a supportive, empathetic tone." },
        { "role": "user", "content": promptText }
      ],
      max_tokens: 150,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Hugging Face API Error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content;
  if (!reply) {
    throw new Error("Invalid response structure from Hugging Face chat completion");
  }

  return reply.trim();
}

const localResponses = {
  anxious: [
    "I hear that you're feeling anxious. Take a slow, deep breath. Let's identify the catastrophe: what is the worst thing you fear happening? By assessing its actual probability and mapping out how you would cope, you can gently restore emotional balance.",
    "Anxiety often makes us overestimate threats. Remember that thoughts are not facts. If your worst fear did happen, what strengths could you draw on to manage it? Let's take things one step at a time.",
    "It takes real courage to face these racing thoughts. Let's pause and look at the evidence: is the threat as certain as it feels? You have navigated difficult times before, and you can handle this too."
  ],
  overwhelmed: [
    "It sounds like everything is piling up and it's too much right now. Let's make a distinction: what can you control in this exact moment, and what is out of your hands? Try to identify one tiny action that takes under 5 minutes and focus solely on that.",
    "Feeling overwhelmed is mentally draining. You don't have to carry all of this right now. Let's chunk things down: what are three bite-sized steps we can break this situation into? Focus only on the first step.",
    "I hear you, and it's okay to take a pause. When everything feels urgent, nothing is. Let's identify the single highest priority task that you have control over today, and let the rest sit."
  ],
  lonely: [
    "I'm sorry you're feeling alone. Remember that feeling lonely is a universal human experience and not a personal failure. Try to practice a little self-compassion today without judging yourself for this pain.",
    "Loneliness can feel very heavy, but writing down your thoughts shows incredible strength. Try to think of one small, low-pressure act of kindness or comfort you can do for yourself today.",
    "Sending you warmth. Even when it feels like nobody understands, your feelings are completely valid and matter. What is one small way you can connect with a trusted space or resource today?"
  ],
  angry: [
    "I hear your frustration and anger. Let's take a conscious breath to check in with your body. Try to identify the 'should' rule that feels violated here, and see if we can reframe it from a broader perspective.",
    "That sounds incredibly frustrating. Anger is a normal reaction to difficult boundaries. Take a moment to pause and cool down: what is the core trigger, and how can we assert your needs calmly?",
    "It's completely okay to vent your irritation here. Let's look at the situation: is there a way to reframe this so it feels less personal or threatening to your peace of mind?"
  ],
  sad: [
    "I hear you, and it is completely okay to feel down or sad right now. Try to identify if you are falling into all-or-nothing thinking. Can we find objective evidence of times when things were a little lighter?",
    "That sounds really painful, and your feelings are completely valid. When sadness feels heavy, planning one simple activity that brought you joy or achievement in the past can help gently lift the weight.",
    "Remember that healing isn't linear, and you're doing the best you can. Let's challenge any negative distortions about the future: what is one small, positive thing you can focus on today?"
  ],
  hopeful: [
    "It's wonderful to hear you feeling hopeful and positive! Take a moment to anchor this positive state—savor it fully and acknowledge the effort that led you here.",
    "I'm so glad things are looking better. Write down the specifics of what is working well right now so you can draw on this strength during future moments of distress.",
    "That's beautiful. What's one thing you're most excited or grateful for today? Celebrating these moments reinforces your mental resilience."
  ],
  general: [
    "I hear you. It takes courage to express what you're feeling, and your thoughts are completely valid. Try to focus on the present moment and take a slow, grounding breath.",
    "I'm here with you. Sometimes just putting feelings into words helps lighten the weight. Let's do a quick sensory check-in: name a few things you can see or feel around you right now.",
    "Thank you for sharing this. Your feelings matter, and taking this step to talk about them shows real strength. I'm here to support you whenever you need to talk."
  ]
};

app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const cleanMessage = message.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~?()]/g, "");
    const greetings = [
      'hi', 'hello', 'hey', 'greetings', 'yo', 'sup', 'hello there', 'hi there',
      'how are you', 'how is it going', 'hows it going', 'how is going', 'hows going',
      'what is up', 'whats up', 'whatup', 'good morning', 'good afternoon', 'good evening'
    ];
    const isGreeting = greetings.includes(cleanMessage) || greetings.some(g => cleanMessage.startsWith(g + ' '));

    if (isGreeting) {
      return res.json({
        success: true,
        reply: "Hello! I'm MindSpace AI, your compassionate support companion. How are you feeling today? Feel free to share whatever is on your mind, or vent about anything that's been weighing you down.",
        emotion: "general",
        distressLevel: "low",
        fallbackUsed: "greeting"
      });
    }

    const prediction = predictMentalState(message);
    const cbt = cbtExercises[prediction.emotion] || cbtExercises['general'];

    const promptText = `User's currently detected emotion: ${prediction.emotion} (Distress Level: ${prediction.distressLevel}).
Guide them using this CBT (Cognitive Behavioral Therapy) exercise:
Technique: ${cbt.technique_name}
Steps to guide the user:
${cbt.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

The user says: "${message}".

Write a warm, empathetic, and supportive response in 3-4 sentences. Gently guide them inline through the CBT steps. Do not list the steps formally or mention system commands.`;

    let reply = "";
    let fallbackUsed = false;

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("Gemini Key is missing in environment variables.");
      }

      console.log("⚡ Attempting Gemini API call...");
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `You are a compassionate mental health support companion called MindSpace AI. Respond in a supportive, empathetic tone. Prompt context: ${promptText}` }]
          }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!reply) {
        throw new Error("Empty candidate list from Gemini API response");
      }
      console.log("✅ Gemini API call succeeded!");
    } catch (geminiError) {
      console.warn('⚠️ Gemini call failed. Reason:', geminiError.message);
      try {
        reply = await callHuggingFace(promptText);
        fallbackUsed = "huggingface";
        console.log("✅ Hugging Face fallback call succeeded!");
      } catch (hfError) {
        console.error('❌ Hugging Face fallback failed as well. Reason:', hfError.message);
        console.log('🤖 Activating Tier-3 Local Empathy Fallback...');
        const templates = localResponses[prediction.emotion] || localResponses['general'];
        reply = templates[Math.floor(Math.random() * templates.length)];
        fallbackUsed = "local";
      }
    }

    res.json({
      success: true,
      reply: reply,
      emotion: prediction.emotion,
      distressLevel: prediction.distressLevel,
      fallbackUsed: fallbackUsed
    });
  } catch (error) {
    console.error('Proxy chat error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Socket.io real-time chat setup
io.on('connection', (socket) => {
  console.log('👤 User connected to socket:', socket.id);

  socket.on('join_room', (roomName) => {
    socket.join(roomName);
    console.log(`🚪 User ${socket.id} joined room: ${roomName}`);
  });

  socket.on('send_message', (data) => {
    const { room, message, sender } = data;
    if (!message || !message.trim()) return;

    // Toxicity and distress check using NLP model
    const prediction = predictMentalState(message);

    // Distress levels or self-harm keywords trigger crisis flows
    const selfHarmKeywords = ['suicide', 'kill myself', 'end it all', 'disappear', 'cut myself', 'ending my life', 'want to die'];
    const isCrisis = selfHarmKeywords.some(keyword => message.toLowerCase().includes(keyword)) || prediction.distressLevel === 'high';

    if (isCrisis) {
      // 1. Send warning directly back to the sender
      socket.emit('crisis_warning', {
        message: "It sounds like you're going through a very tough time. Please remember you are not alone and help is available.",
        hotlines: [
          { name: "National Suicide Prevention Lifeline", number: "988" },
          { name: "Crisis Text Line", number: "Text HOME to 741741" }
        ]
      });

      // 2. Broadcast flagged/masked message to other clients in the room
      io.to(room).emit('receive_message', {
        senderId: socket.id,
        sender: sender || 'Anonymous',
        message: '[Flagged: This message has been hidden to maintain a safe space]',
        flagged: true,
        createdAt: new Date()
      });
    } else {
      // Message approved: broadcast normally
      io.to(room).emit('receive_message', {
        senderId: socket.id,
        sender: sender || 'Anonymous',
        message: message,
        flagged: false,
        createdAt: new Date()
      });
    }
  });

  socket.on('typing', (data) => {
    socket.to(data.room).emit('typing');
  });

  socket.on('stop_typing', (data) => {
    socket.to(data.room).emit('stop_typing');
  });

  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
  });
});


