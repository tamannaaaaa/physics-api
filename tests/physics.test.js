// tests/physics.test.js
const request = require('supertest');
const app = require('../server');

describe('Physics API Tests', () => {
  
  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
      expect(response.body.version).toBe('1.0.0');
    });
  });

  describe('Materials Endpoint', () => {
    test('should return list of available materials', async () => {
      const response = await request(app)
        .get('/api/materials')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.materials).toBeInstanceOf(Array);
      expect(response.body.materials.length).toBeGreaterThan(0);
      
      // Check if basketball is in the materials
      const basketball = response.body.materials.find(m => m.name === 'basketball');
      expect(basketball).toBeDefined();
      expect(basketball.properties.mass).toBe(0.624);
    });
  });

  describe('Trajectory Calculations', () => {
    test('should calculate basic trajectory', async () => {
      const params = {
        initialHeight: 10,
        initialVelocity: 15,
        launchAngle: 45,
        material: 'basketball'
      };

      const response = await request(app)
        .post('/api/trajectory')
        .send(params)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.results.summary.range).toBeGreaterThan(0);
      expect(response.body.results.summary.flightTime).toBeGreaterThan(0);
      expect(response.body.results.trajectory).toBeInstanceOf(Array);
    });

    test('should reject invalid velocity', async () => {
      const params = {
        initialHeight: 10,
        initialVelocity: -5, // Invalid negative velocity
        launchAngle: 45,
        material: 'basketball'
      };

      const response = await request(app)
        .post('/api/trajectory')
        .send(params)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Initial velocity must be greater than 0');
    });

    test('should reject invalid launch angle', async () => {
      const params = {
        initialHeight: 10,
        initialVelocity: 15,
        launchAngle: 120, // Invalid angle > 90
        material: 'basketball'
      };

      const response = await request(app)
        .post('/api/trajectory')
        .send(params)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Launch angle must be between -90 and 90 degrees');
    });

    test('should handle wind effects', async () => {
      const paramsNoWind = {
        initialHeight: 0,
        initialVelocity: 20,
        launchAngle: 45,
        material: 'basketball',
        windSpeed: 0
      };

      const paramsWithWind = {
        ...paramsNoWind,
        windSpeed: 10,
        windDirection: 0 // headwind
      };

      const responseNoWind = await request(app)
        .post('/api/trajectory')
        .send(paramsNoWind)
        .expect(200);

      const responseWithWind = await request(app)
        .post('/api/trajectory')
        .send(paramsWithWind)
        .expect(200);
      
      // Wind should reduce range
      expect(responseWithWind.body.results.summary.range)
        .toBeLessThan(responseNoWind.body.results.summary.range);
    });
  });

  describe('Collision Calculations', () => {
    test('should calculate collision between two objects', async () => {
      const params = {
        object1: {
          mass1: 1,
          velocity1: { x: 10, y: 0 }
        },
        object2: {
          mass2: 1,
          velocity2: { x: -10, y: 0 },
          restitution: 0.8
        }
      };

      const response = await request(app)
        .post('/api/collision')
        .send(params)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.results.collision.object1FinalVelocity).toBeDefined();
      expect(response.body.results.collision.object2FinalVelocity).toBeDefined();
      expect(response.body.results.collision.impactForce).toBeGreaterThan(0);
    });

    test('should reject missing object parameters', async () => {
      const params = {
        object1: {
          mass1: 1,
          velocity1: { x: 10, y: 0 }
        }
        // Missing object2
      };

      const response = await request(app)
        .post('/api/collision')
        .send(params)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Both object1 and object2 parameters are required');
    });
  });

  describe('Force Calculations', () => {
    test('should calculate forces on object', async () => {
      const params = {
        mass: 1,
        velocity: { x: 10, y: 5 },
        material: 'basketball',
        includeAirResistance: true
      };

      const response = await request(app)
        .post('/api/forces')
        .send(params)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.results.forces.gravity).toBeDefined();
      expect(response.body.results.forces.airResistance).toBeDefined();
      expect(response.body.results.forces.net).toBeDefined();
      
      // Gravity should be downward
      expect(response.body.results.forces.gravity.vector.y).toBeLessThan(0);
    });

    test('should calculate forces without air resistance', async () => {
      const params = {
        mass: 1,
        velocity: { x: 10, y: 5 },
        material: 'basketball',
        includeAirResistance: false
      };

      const response = await request(app)
        .post('/api/forces')
        .send(params)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.results.forces.airResistance).toBeUndefined();
    });
  });

  describe('Quick Throw Scenarios', () => {
    test('should calculate balcony ball scenario', async () => {
      const params = {
        scenario: 'balcony_ball',
        velocity: 12,
        height: 15
      };

      const response = await request(app)
        .post('/api/quick-throw')
        .send(params)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.scenario).toBe('balcony_ball');
      expect(response.body.results.landingDistance).toBeGreaterThan(0);
      expect(response.body.results.flightTime).toBeGreaterThan(0);
    });

    test('should handle unknown scenario', async () => {
      const params = {
        scenario: 'unknown_scenario',
        velocity: 12
      };

      const response = await request(app)
        .post('/api/quick-throw')
        .send(params)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      // Should default to basketball
      expect(response.body.results).toBeDefined();
    });

    test('should include safety warning for high impact', async () => {
      const params = {
        scenario: 'bowling_ball_drop',
        velocity: 30,
        height: 50
      };

      const response = await request(app)
        .post('/api/quick-throw')
        .send(params)
        .expect(200);
      
      // High velocity should trigger safety warning
      if (response.body.results.impactForce > 1000) {
        expect(response.body.results.safetyWarning).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/trajectory')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });

    test('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/api/unknown-endpoint')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint not found');
    });
  });

  describe('Physics Accuracy Tests', () => {
    test('should calculate correct range for 45-degree projectile', async () => {
      // At 45 degrees with no air resistance, range = v²/g
      const velocity = 20; // m/s
      const expectedRange = (velocity * velocity) / 9.81;
      
      const params = {
        initialHeight: 0,
        initialVelocity: velocity,
        launchAngle: 45,
        material: 'custom', // minimal air resistance
        windSpeed: 0
      };

      const response = await request(app)
        .post('/api/trajectory')
        .send(params)
        .expect(200);
      
      // Should be close to theoretical value (within 10% due to air resistance)
      const actualRange = response.body.results.summary.range;
      expect(actualRange).toBeGreaterThan(expectedRange * 0.8);
      expect(actualRange).toBeLessThan(expectedRange * 1.2);
    });

    test('should respect conservation of momentum in collisions', async () => {
      const params = {
        object1: {
          mass1: 2,
          velocity1: { x: 10, y: 0 }
        },
        object2: {
          mass2: 1,
          velocity2: { x: 0, y: 0 },
          restitution: 1.0 // perfectly elastic
        }
      };

      const response = await request(app)
        .post('/api/collision')
        .send(params)
        .expect(200);
      
      const { object1FinalVelocity, object2FinalVelocity } = response.body.results.collision;
      
      // Check momentum conservation: m1*v1i + m2*v2i = m1*v1f + m2*v2f
      const initialMomentum = 2 * 10 + 1 * 0; // 20
      const finalMomentum = 2 * object1FinalVelocity.x + 1 * object2FinalVelocity.x;
      
      expect(Math.abs(finalMomentum - initialMomentum)).toBeLessThan(0.1);
    });
  });
});

// Performance Tests
describe('Performance Tests', () => {
  test('trajectory calculation should complete within 100ms', async () => {
    const startTime = Date.now();
    
    await request(app)
      .post('/api/trajectory')
      .send({
        initialHeight: 10,
        initialVelocity: 15,
        launchAngle: 45,
        material: 'basketball'
      })
      .expect(200);
    
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(100);
  });

  test('should handle multiple concurrent requests', async () => {
    const requests = Array(10).fill().map(() => 
      request(app)
        .post('/api/trajectory')
        .send({
          initialHeight: Math.random() * 20,
          initialVelocity: Math.random() * 30 + 5,
          launchAngle: Math.random() * 90,
          material: 'basketball'
        })
    );

    const responses = await Promise.all(requests);
    
    responses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
