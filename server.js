// Real-World Physics Simulation API
// A comprehensive physics calculation service for real-world scenarios

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Physics constants
const PHYSICS_CONSTANTS = {
  GRAVITY: 9.81, // m/s²
  AIR_DENSITY: 1.225, // kg/m³ at sea level
  TERMINAL_VELOCITY_HUMAN: 56, // m/s
  SOUND_SPEED: 343, // m/s at 20°C
};

// Material properties for realistic calculations
const MATERIALS = {
  basketball: { mass: 0.624, radius: 0.1194, dragCoeff: 0.47, bounciness: 0.85 },
  soccer: { mass: 0.43, radius: 0.11, dragCoeff: 0.25, bounciness: 0.75 },
  tennis: { mass: 0.057, radius: 0.0335, dragCoeff: 0.51, bounciness: 0.73 },
  baseball: { mass: 0.145, radius: 0.037, dragCoeff: 0.3, bounciness: 0.55 },
  golf: { mass: 0.046, radius: 0.021, dragCoeff: 0.24, bounciness: 0.78 },
  bowling: { mass: 7.26, radius: 0.108, dragCoeff: 0.15, bounciness: 0.15 },
  rock: { mass: 0.5, radius: 0.05, dragCoeff: 0.47, bounciness: 0.2 },
  paper_airplane: { mass: 0.003, radius: 0.1, dragCoeff: 0.02, bounciness: 0.1 },
  custom: { mass: 1, radius: 0.05, dragCoeff: 0.47, bounciness: 0.6 }
};

// Utility functions for physics calculations
class PhysicsEngine {
  
  // Calculate projectile motion with air resistance
  static calculateTrajectory(params) {
    const {
      initialHeight = 0,
      initialVelocity = 10,
      launchAngle = 45,
      material = 'basketball',
      windSpeed = 0,
      windDirection = 0,
      airDensity = PHYSICS_CONSTANTS.AIR_DENSITY,
      gravity = PHYSICS_CONSTANTS.GRAVITY
    } = params;

    const obj = MATERIALS[material] || MATERIALS.custom;
    const angleRad = (launchAngle * Math.PI) / 180;
    const windDirRad = (windDirection * Math.PI) / 180;
    
    // Initial velocity components
    let vx = initialVelocity * Math.cos(angleRad);
    let vy = initialVelocity * Math.sin(angleRad);
    let x = 0;
    let y = initialHeight;
    
    const trajectory = [];
    const dt = 0.01; // time step in seconds
    let t = 0;
    
    // Wind components
    const windX = windSpeed * Math.cos(windDirRad);
    const windY = windSpeed * Math.sin(windDirRad);
    
    while (y >= 0) {
      // Current velocity relative to air (including wind)
      const vRelX = vx - windX;
      const vRelY = vy - windY;
      const vRel = Math.sqrt(vRelX * vRelX + vRelY * vRelY);
      
      // Drag force calculation
      const crossSectionalArea = Math.PI * obj.radius * obj.radius;
      const dragMagnitude = 0.5 * obj.dragCoeff * airDensity * crossSectionalArea * vRel * vRel;
      
      // Drag force components (opposite to relative velocity)
      const dragX = vRel > 0 ? -dragMagnitude * (vRelX / vRel) / obj.mass : 0;
      const dragY = vRel > 0 ? -dragMagnitude * (vRelY / vRel) / obj.mass : 0;
      
      // Update velocity (gravity + drag)
      vx += dragX * dt;
      vy += (-gravity + dragY) * dt;
      
      // Update position
      x += vx * dt;
      y += vy * dt;
      
      trajectory.push({
        time: parseFloat(t.toFixed(3)),
        x: parseFloat(x.toFixed(3)),
        y: parseFloat(y.toFixed(3)),
        vx: parseFloat(vx.toFixed(3)),
        vy: parseFloat(vy.toFixed(3)),
        speed: parseFloat(Math.sqrt(vx * vx + vy * vy).toFixed(3))
      });
      
      t += dt;
      
      // Safety check to prevent infinite loops
      if (t > 300) break;
    }
    
    return trajectory;
  }
  
  // Calculate impact force and energy
  static calculateImpact(finalVelocity, material = 'basketball', impactSurface = 'concrete') {
    const obj = MATERIALS[material] || MATERIALS.custom;
    const speed = Math.sqrt(finalVelocity.vx * finalVelocity.vx + finalVelocity.vy * finalVelocity.vy);
    
    // Kinetic energy at impact
    const kineticEnergy = 0.5 * obj.mass * speed * speed;
    
    // Impact force estimation (simplified model)
    // Assuming deceleration over contact time based on material properties
    const contactTime = obj.bounciness * 0.01; // More bouncy = longer contact
    const impactForce = obj.mass * speed / contactTime;
    
    // Surface hardness factor
    const surfaceFactors = {
      concrete: 1.0,
      grass: 0.7,
      sand: 0.5,
      water: 0.3,
      wood: 0.8,
      metal: 1.2
    };
    
    const surfaceFactor = surfaceFactors[impactSurface] || 1.0;
    const adjustedForce = impactForce * surfaceFactor;
    
    return {
      impactSpeed: parseFloat(speed.toFixed(3)),
      kineticEnergy: parseFloat(kineticEnergy.toFixed(3)),
      impactForce: parseFloat(adjustedForce.toFixed(3)),
      impactAngle: parseFloat((Math.atan2(Math.abs(finalVelocity.vy), Math.abs(finalVelocity.vx)) * 180 / Math.PI).toFixed(2)),
      estimatedContactTime: parseFloat((contactTime * 1000).toFixed(2)) // in milliseconds
    };
  }
  
  // Calculate collision between two objects
  static calculateCollision(obj1, obj2) {
    const {
      mass1 = 1, velocity1 = { x: 10, y: 0 },
      mass2 = 1, velocity2 = { x: -5, y: 0 },
      restitution = 0.8 // coefficient of restitution
    } = { ...obj1, ...obj2 };
    
    // Conservation of momentum and energy for elastic collision
    const totalMass = mass1 + mass2;
    const relativeVelocity = {
      x: velocity1.x - velocity2.x,
      y: velocity1.y - velocity2.y
    };
    
    // Final velocities after collision
    const v1Final = {
      x: velocity1.x - (2 * mass2 / totalMass) * relativeVelocity.x * restitution,
      y: velocity1.y - (2 * mass2 / totalMass) * relativeVelocity.y * restitution
    };
    
    const v2Final = {
      x: velocity2.x + (2 * mass1 / totalMass) * relativeVelocity.x * restitution,
      y: velocity2.y + (2 * mass1 / totalMass) * relativeVelocity.y * restitution
    };
    
    // Energy calculations
    const initialKE = 0.5 * mass1 * (velocity1.x**2 + velocity1.y**2) + 
                     0.5 * mass2 * (velocity2.x**2 + velocity2.y**2);
    const finalKE = 0.5 * mass1 * (v1Final.x**2 + v1Final.y**2) + 
                   0.5 * mass2 * (v2Final.x**2 + v2Final.y**2);
    
    return {
      object1FinalVelocity: {
        x: parseFloat(v1Final.x.toFixed(3)),
        y: parseFloat(v1Final.y.toFixed(3))
      },
      object2FinalVelocity: {
        x: parseFloat(v2Final.x.toFixed(3)),
        y: parseFloat(v2Final.y.toFixed(3))
      },
      energyLoss: parseFloat((initialKE - finalKE).toFixed(3)),
      impactForce: parseFloat((mass1 * Math.sqrt(relativeVelocity.x**2 + relativeVelocity.y**2) / 0.01).toFixed(3))
    };
  }
  
  // Calculate forces acting on an object
  static calculateForces(params) {
    const {
      mass = 1,
      velocity = { x: 0, y: 0 },
      height = 0,
      material = 'basketball',
      includeAirResistance = true
    } = params;
    
    const obj = MATERIALS[material] || MATERIALS.custom;
    const forces = {};
    
    // Gravitational force
    forces.gravity = {
      magnitude: obj.mass * PHYSICS_CONSTANTS.GRAVITY,
      direction: 'downward',
      vector: { x: 0, y: -obj.mass * PHYSICS_CONSTANTS.GRAVITY }
    };
    
    // Air resistance (drag)
    if (includeAirResistance) {
      const speed = Math.sqrt(velocity.x**2 + velocity.y**2);
      const crossSectionalArea = Math.PI * obj.radius * obj.radius;
      const dragMagnitude = 0.5 * obj.dragCoeff * PHYSICS_CONSTANTS.AIR_DENSITY * 
                           crossSectionalArea * speed * speed;
      
      forces.airResistance = {
        magnitude: parseFloat(dragMagnitude.toFixed(3)),
        direction: 'opposite to velocity',
        vector: {
          x: speed > 0 ? parseFloat((-dragMagnitude * velocity.x / speed).toFixed(3)) : 0,
          y: speed > 0 ? parseFloat((-dragMagnitude * velocity.y / speed).toFixed(3)) : 0
        }
      };
    }
    
    // Buoyant force (simplified for air)
    const airBuoyancy = PHYSICS_CONSTANTS.AIR_DENSITY * PHYSICS_CONSTANTS.GRAVITY * 
                       (4/3 * Math.PI * obj.radius**3);
    
    forces.buoyancy = {
      magnitude: parseFloat(airBuoyancy.toFixed(6)),
      direction: 'upward',
      vector: { x: 0, y: airBuoyancy }
    };
    
    // Net force
    const netForce = {
      x: forces.gravity.vector.x + 
         (forces.airResistance?.vector.x || 0) + 
         forces.buoyancy.vector.x,
      y: forces.gravity.vector.y + 
         (forces.airResistance?.vector.y || 0) + 
         forces.buoyancy.vector.y
    };
    
    forces.net = {
      magnitude: parseFloat(Math.sqrt(netForce.x**2 + netForce.y**2).toFixed(3)),
      vector: {
        x: parseFloat(netForce.x.toFixed(3)),
        y: parseFloat(netForce.y.toFixed(3))
      }
    };
    
    return forces;
  }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get available materials
app.get('/api/materials', (req, res) => {
  const materialsInfo = Object.keys(MATERIALS).map(key => ({
    name: key,
    properties: MATERIALS[key]
  }));
  
  res.json({
    success: true,
    materials: materialsInfo,
    count: materialsInfo.length
  });
});

// Calculate projectile trajectory
app.post('/api/trajectory', (req, res) => {
  try {
    const params = req.body;
    
    // Validation
    if (!params.initialVelocity || params.initialVelocity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Initial velocity must be greater than 0'
      });
    }
    
    if (params.launchAngle < -90 || params.launchAngle > 90) {
      return res.status(400).json({
        success: false,
        error: 'Launch angle must be between -90 and 90 degrees'
      });
    }
    
    const trajectory = PhysicsEngine.calculateTrajectory(params);
    const finalPoint = trajectory[trajectory.length - 1];
    const maxHeight = Math.max(...trajectory.map(p => p.y));
    const range = finalPoint.x;
    const flightTime = finalPoint.time;
    
    // Impact calculations
    const impact = PhysicsEngine.calculateImpact(
      { vx: finalPoint.vx, vy: finalPoint.vy },
      params.material,
      params.impactSurface
    );
    
    res.json({
      success: true,
      results: {
        trajectory: trajectory,
        summary: {
          maxHeight: parseFloat(maxHeight.toFixed(3)),
          range: parseFloat(range.toFixed(3)),
          flightTime: parseFloat(flightTime.toFixed(3)),
          landingVelocity: {
            x: finalPoint.vx,
            y: finalPoint.vy,
            magnitude: finalPoint.speed
          }
        },
        impact: impact,
        parameters: params
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error during trajectory calculation',
      details: error.message
    });
  }
});

// Calculate collision between objects
app.post('/api/collision', (req, res) => {
  try {
    const { object1, object2 } = req.body;
    
    if (!object1 || !object2) {
      return res.status(400).json({
        success: false,
        error: 'Both object1 and object2 parameters are required'
      });
    }
    
    const collision = PhysicsEngine.calculateCollision(object1, object2);
    
    res.json({
      success: true,
      results: {
        collision: collision,
        parameters: { object1, object2 }
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error during collision calculation',
      details: error.message
    });
  }
});

// Calculate forces acting on object
app.post('/api/forces', (req, res) => {
  try {
    const params = req.body;
    const forces = PhysicsEngine.calculateForces(params);
    
    res.json({
      success: true,
      results: {
        forces: forces,
        parameters: params
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error during force calculation',
      details: error.message
    });
  }
});

// Quick calculation endpoint for simple scenarios
app.post('/api/quick-throw', (req, res) => {
  try {
    const { scenario, height = 0, velocity = 10, angle = 45 } = req.body;
    
    // Common scenarios
    const scenarios = {
      'balcony_ball': { material: 'basketball', height: 10, angle: 15 },
      'football_field': { material: 'soccer', height: 0, angle: 30 },
      'baseball_pitch': { material: 'baseball', height: 1.5, angle: 0 },
      'paper_airplane': { material: 'paper_airplane', height: 1.5, angle: 10 }
    };
    
    const config = scenarios[scenario] || { material: 'basketball' };
    const params = {
      initialHeight: config.height || height,
      initialVelocity: velocity,
      launchAngle: config.angle || angle,
      material: config.material,
      windSpeed: 0,
      windDirection: 0
    };
    
    const trajectory = PhysicsEngine.calculateTrajectory(params);
    const finalPoint = trajectory[trajectory.length - 1];
    const impact = PhysicsEngine.calculateImpact(
      { vx: finalPoint.vx, vy: finalPoint.vy },
      params.material
    );
    
    res.json({
      success: true,
      scenario: scenario,
      results: {
        landingDistance: parseFloat(finalPoint.x.toFixed(2)),
        flightTime: parseFloat(finalPoint.time.toFixed(2)),
        maxHeight: parseFloat(Math.max(...trajectory.map(p => p.y)).toFixed(2)),
        impactSpeed: impact.impactSpeed,
        impactForce: impact.impactForce,
        safetyWarning: impact.impactForce > 1000 ? 'High impact force - exercise caution' : null
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error during quick calculation',
      details: error.message
    });
  }
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Real-World Physics Simulation API',
    version: '1.0.0',
    description: 'Calculate trajectories, collisions, and forces for real-world objects',
    endpoints: {
      'GET /api/health': 'Check API health status',
      'GET /api/materials': 'Get available material properties',
      'POST /api/trajectory': 'Calculate projectile motion trajectory',
      'POST /api/collision': 'Calculate collision between two objects',
      'POST /api/forces': 'Calculate forces acting on an object',
      'POST /api/quick-throw': 'Quick calculation for common throwing scenarios'
    },
    examples: {
      trajectory: {
        initialHeight: 10,
        initialVelocity: 15,
        launchAngle: 45,
        material: 'basketball',
        windSpeed: 2,
        windDirection: 90,
        impactSurface: 'concrete'
      },
      collision: {
        object1: {
          mass1: 0.624,
          velocity1: { x: 10, y: 0 }
        },
        object2: {
          mass2: 0.43,
          velocity2: { x: -5, y: 0 },
          restitution: 0.8
        }
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*wildcard', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /api/health',
      'GET /api/materials',
      'GET /api/docs',
      'POST /api/trajectory',
      'POST /api/collision',
      'POST /api/forces',
      'POST /api/quick-throw'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Physics Simulation API running on port ${PORT}`);
  console.log(`📖 Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;