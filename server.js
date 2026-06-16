const path = require('path');
const express = require('express');  
const mongoose = require('mongoose');   
require('dotenv').config();  
const cors = require('cors'); 
const predictMentalState = require('./ml/mentalStateModel');
let JournalEntry = require('./models/journalEntry');
const cbtExercises = require('./data/cbt_exercises.json');

let Mood, Post;
let dbConnected = false;

// In-memory fallback storage
let moods = [];
let posts = [];

const app = express();
app.use(cors());
app.use(express.json());
// Serve static frontend files from this project directory
app.use(express.static(path.join(__dirname)));
console.log('SERVING FROM', path.join(__dirname));

// Configure mongoose to not buffer operations
mongoose.set('bufferTimeoutMS', 5000);

function startServer() {
  app.listen(process.env.PORT || 5000, () => {
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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.post('/mood', async (req, res) => {
  try {
    const moodData = { mood: req.body.mood, createdAt: new Date() };
    
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

app.get('/moods', async (req, res) => {
  try {
    if (dbConnected && Mood) {
      const result = await Mood.find().sort({ createdAt: -1 });
      res.json(result);
    } else {
      res.json(moods.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    }
  } catch (error) {
    console.log('GET /moods error:', error.message);
    res.status(500).json([]);
  }
});

app.post('/posts', async (req, res) => {
  try {
    const { message } = req.body;
    const prediction = predictMentalState(message);
    
    const postData = {
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

app.get('/posts', async (req, res) => {
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
app.post('/api/journal', async (req, res) => {
  try {
    const entryData = {
      text: req.body.text,
      mood: req.body.mood,
      tags: req.body.tags,
      createdAt: new Date()
    };
    if (dbConnected && JournalEntry) {
      const entry = new JournalEntry(entryData);
      await entry.save();
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.get('/api/journal', async (req, res) => {
  try {
    if (dbConnected && JournalEntry) {
      const entries = await JournalEntry.find().sort({ createdAt: -1 });
      res.json(entries);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json([]);
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

app.post('/api/chat', async (req, res) => {
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

