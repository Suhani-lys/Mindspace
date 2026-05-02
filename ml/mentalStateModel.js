const natural = require('natural');

const emotionClassifier = new natural.BayesClassifier();
const distressClassifier = new natural.BayesClassifier();

// --------------------
// Emotion training data
// --------------------
emotionClassifier.addDocument('I feel nervous and scared about everything', 'anxious');
emotionClassifier.addDocument('I am overthinking and panicking', 'anxious');
emotionClassifier.addDocument('I feel pressure and stress', 'anxious');
emotionClassifier.addDocument('I feel worried and uneasy', 'anxious');
emotionClassifier.addDocument('I am little panicked', 'anxious');

emotionClassifier.addDocument('Everything feels too much and I am exhausted', 'overwhelmed');
emotionClassifier.addDocument('I cannot handle all this anymore', 'overwhelmed');
emotionClassifier.addDocument('I feel mentally drained', 'overwhelmed');
emotionClassifier.addDocument('I am burnt out and overloaded', 'overwhelmed');

emotionClassifier.addDocument('I feel lonely and empty', 'lonely');
emotionClassifier.addDocument('Nobody understands me', 'lonely');
emotionClassifier.addDocument('I feel alone all the time', 'lonely');
emotionClassifier.addDocument('I have no one to talk to', 'lonely');

emotionClassifier.addDocument('I am angry and frustrated', 'angry');
emotionClassifier.addDocument('I feel irritated and mad', 'angry');
emotionClassifier.addDocument('Everything annoys me', 'angry');
emotionClassifier.addDocument('I am furious right now', 'angry');

emotionClassifier.addDocument('I feel sad and low', 'sad');
emotionClassifier.addDocument('I want to cry', 'sad');
emotionClassifier.addDocument('I feel broken inside', 'sad');
emotionClassifier.addDocument('I feel hopeless and down', 'sad');

emotionClassifier.addDocument('I feel hopeful and better', 'hopeful');
emotionClassifier.addDocument('I think things will improve', 'hopeful');
emotionClassifier.addDocument('I am feeling positive today', 'hopeful');
emotionClassifier.addDocument('I am excited and happy', 'hopeful');
emotionClassifier.addDocument('I am excited to see a movie', 'hopeful');
emotionClassifier.addDocument('I feel motivated and excited', 'hopeful');

// --------------------
// Distress training data
// --------------------
distressClassifier.addDocument('I am fine and calm', 'low');
distressClassifier.addDocument('I feel okay today', 'low');
distressClassifier.addDocument('I am peaceful', 'low');
distressClassifier.addDocument('I am excited and happy', 'low');
distressClassifier.addDocument('I feel good and relaxed', 'low');

distressClassifier.addDocument('I am stressed and tired', 'medium');
distressClassifier.addDocument('I feel worried and uneasy', 'medium');
distressClassifier.addDocument('I am struggling a bit', 'medium');
distressClassifier.addDocument('I feel pressure and stress', 'medium');
distressClassifier.addDocument('I am a little panicked', 'medium');

distressClassifier.addDocument('I feel trapped and broken', 'high');
distressClassifier.addDocument('I cannot take this anymore', 'high');
distressClassifier.addDocument('Everything feels unbearable', 'high');
distressClassifier.addDocument('I feel mentally destroyed', 'high');
distressClassifier.addDocument('I want to disappear', 'high');

emotionClassifier.train();
distressClassifier.train();

function includesAny(text, keywords) {
  return keywords.some(word => text.includes(word));
}

function predictMentalState(text) {
  const lowerText = text.toLowerCase();

  // --------------------
  // Emotion override rules
  // --------------------
  if (includesAny(lowerText, ['excited', 'happy', 'motivated', 'positive', 'hopeful', 'better'])) {
    return {
      emotion: 'hopeful',
      distressLevel: 'low'
    };
  }

  if (includesAny(lowerText, ['lonely', 'alone', 'empty', 'isolated'])) {
    return {
      emotion: 'lonely',
      distressLevel: 'medium'
    };
  }

  if (includesAny(lowerText, ['angry', 'furious', 'irritated', 'frustrated', 'mad'])) {
    return {
      emotion: 'angry',
      distressLevel: 'medium'
    };
  }

  if (includesAny(lowerText, ['cry', 'broken', 'hopeless', 'sad', 'down'])) {
    return {
      emotion: 'sad',
      distressLevel: 'medium'
    };
  }

  if (includesAny(lowerText, ['overwhelmed', 'drained', 'burnt out', 'too much', 'exhausted'])) {
    return {
      emotion: 'overwhelmed',
      distressLevel: 'high'
    };
  }

  if (includesAny(lowerText, ['anxious', 'nervous', 'panic', 'panicked', 'worried', 'overthinking', 'scared'])) {
    return {
      emotion: 'anxious',
      distressLevel: 'medium'
    };
  }

  if (includesAny(lowerText, ['cannot take this', 'unbearable', 'trapped', 'destroyed', 'disappear'])) {
    return {
      emotion: 'overwhelmed',
      distressLevel: 'high'
    };
  }

  // --------------------
  // Fallback ML prediction
  // --------------------
  const emotion = emotionClassifier.classify(text);
  const distressLevel = distressClassifier.classify(text);

  return {
    emotion,
    distressLevel
  };
}

module.exports = predictMentalState;
