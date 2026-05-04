const path = require('path');
const express = require('express');  
const mongoose = require('mongoose');   
require('dotenv').config();  
const cors = require('cors'); 
const predictMentalState = require('./ml/mentalStateModel');
let JournalEntry = require('./models/journalEntry');

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
app.get('/api/gemini-key', (req, res) => {
  res.json({ key: process.env.GEMINI_API_KEY });
});
