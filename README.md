# 🌍 Real-World Physics Simulation API

A powerful, real-time physics calculation API built with Node.js and Express. It allows you to simulate projectile motion, object collisions, and forces based on real-world parameters.

# Features
- ✅ Projectile motion with drag and wind resistance  
- ⚡ Collision simulation using conservation laws  
- 🧲 Force calculation (gravity, air resistance, buoyancy)  
- 🎯 Predefined quick-throw scenarios  
- 📦 Material library with realistic properties  
- 🧪 Built-in validation and error handling  
- 🔒 Rate limiting for protection  

# Base URL
https://physics-api-gaas.onrender.com/

# Installation
git clone https://github.com/tamannaaaaa/physics-api.git
cd physics-api
npm install
npm start

# GET /api/health
{
  "status": "healthy",
  "timestamp": "2025-06-27T12:34:56.000Z",
  "version": "1.0.0"
}

# POST /api/trajectory
{
  "initialHeight": 10,
  "initialVelocity": 20,
  "launchAngle": 45,
  "material": "basketball",
  "windSpeed": 2,
  "windDirection": 90,
  "impactSurface": "concrete"
}

# POST /api/collision
{
  "object1": {
    "mass1": 0.5,
    "velocity1": { "x": 10, "y": 0 }
  },
  "object2": {
    "mass2": 0.5,
    "velocity2": { "x": -5, "y": 0 },
    "restitution": 0.8
  }
}

# POST /api/forces
{
  "mass": 2,
  "velocity": { "x": 5, "y": 2 },
  "height": 10,
  "material": "rock",
  "includeAirResistance": true
}

# POST /api/quick-throw
{
  "scenario": "paper_airplane"
}

# GET /api/materials

# GET /api/docs

# Scenarios
- balcony_ball
- football_field
- baseball_pitch
- paper_airplane

# Rate Limiting
Each IP is limited to 100 requests per 15 minutes.

# Input Validations
- initialVelocity must be greater than 0  
- launchAngle must be between -90 and 90  
- Unknown material defaults to custom

# Author
Tamanna Singh  

# License
MIT License
