import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '..', 'dist');

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Free APIs (No Keys Required)
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const OSRM_URL = 'https://router.project-osrm.org';
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1';

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    services: {
      geocoding: 'ok',
      routing: 'ok',
      weather: 'ok',
      ai: process.env.AI_API_KEY ? 'ok' : 'missing_key',
      traffic: process.env.TOMTOM_API_KEY ? 'ok' : 'missing_key',
      flood: process.env.TOMORROW_IO_API_KEY ? 'ok' : 'missing_key',
    }
  });
});

// Geocoding Proxy (Nominatim)
app.get('/api/geocode', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    
    const url = `${NOMINATIM_URL}/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RouteMindAI/2.0 (support@routemind.ai)' }
    });
    
    if (!response.ok) throw new Error('Geocoding failed');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch geocoding data' });
  }
});

// Reverse Geocoding Proxy
app.get('/api/reverse-geocode', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'Coordinates required' });
    
    const url = `${NOMINATIM_URL}/reverse?lat=${lat}&lon=${lon}&format=json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RouteMindAI/2.0 (support@routemind.ai)' }
    });
    
    if (!response.ok) throw new Error('Reverse geocoding failed');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reverse geocoding data' });
  }
});

// Weather Proxy (Open-Meteo)
app.get('/api/weather', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'Coordinates required' });
    
    const url = `${OPEN_METEO_URL}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&hourly=visibility`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error('Weather API failed');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// Routing Proxy (OSRM)
app.get('/api/route', async (req, res) => {
  try {
    const { profile = 'driving', coordinates } = req.query;
    if (!coordinates) return res.status(400).json({ error: 'Coordinates required' });
    
    const url = `${OSRM_URL}/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson&steps=true&alternatives=3`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error('Routing API failed');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch routing data' });
  }
});

// AI Agent Endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, context } = req.body;
    
    if (!process.env.AI_API_KEY) {
      return res.status(400).json({ 
        error: 'AI_API_KEY not configured. Verified live data is temporarily unavailable.',
        isFallback: true
      });
    }

    // Since this is a demo environment for the frontend, if there's no real SDK setup, 
    // we'll send a mocked response but clearly label it as a fallback if the API key is invalid.
    // In a real app, you would use @google/generative-ai here.
    
    // For now, let's implement a smart fallback logic based on context if we don't actually hit the API.
    // This allows testing the UI even if the user hasn't put in a real Gemini API key.
    if (process.env.AI_API_KEY === 'DEMO_KEY' || !process.env.AI_API_KEY) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      return res.json({
        reply: "I am running in fallback mode without a real API key. Please configure `AI_API_KEY` in the server `.env` file to enable real conversational intelligence. Based on your context, you are on " + (context.currentRoad || "an unknown road") + "."
      });
    }

    // Call actual Gemini API here if key is provided
    // For this environment, we'll try to use standard HTTP call to Gemini REST API to avoid needing SDK installation.
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.AI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `System Context: ${JSON.stringify(context)}\n\nUser Question: ${messages[messages.length - 1].content}` }] }
        ],
        systemInstruction: {
          role: "user",
          parts: [{ text: "You are RouteMind AI, an intelligent navigation assistant. Answer questions concisely based strictly on the provided system context. If the context does not have the answer or says data is unavailable, state clearly that verified live data is currently unavailable. Do not hallucinate roads, traffic, or weather." }]
        }
      })
    });

    if (!response.ok) {
       return res.status(500).json({ error: 'AI API request failed' });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";
    
    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'AI processing failed' });
  }
});

// Premium endpoints (Traffic, Flood)
app.get('/api/traffic', (req, res) => {
  if (!process.env.TOMTOM_API_KEY) {
    return res.status(404).json({ error: 'Traffic API key not configured. Verified live data is unavailable.' });
  }
  // Implement real TomTom call here
  res.json({ status: 'unavailable', message: 'Traffic API not fully implemented' });
});

app.get('/api/flood', (req, res) => {
  if (!process.env.TOMORROW_IO_API_KEY) {
    return res.status(404).json({ error: 'Flood API key not configured. Verified live data is unavailable.' });
  }
  // Implement real Tomorrow.io call here
  res.json({ status: 'unavailable', message: 'Flood API not fully implemented' });
});

// Serve production static frontend build if dist folder exists
app.use(express.static(distPath));

// For SPA routing, redirect all non-API GET requests to index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}

export default app;
