// server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Enable CORS for all routes
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store recent coordinates
let coordinateHistory = [];
const MAX_HISTORY_LENGTH = 100;

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Send existing history to new client
  if (coordinateHistory.length > 0) {
    socket.emit('coordinate-history', coordinateHistory);
  }
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// API endpoint to receive coordinates
app.post('/api/coordinates', (req, res) => {
  const { coordinates } = req.body;
  
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 3) {
    return res.status(400).json({ error: 'Invalid coordinates format. Expected [distance, x, z]' });
  }
  
  const [distance, x, z] = coordinates;
  
  // Validate coordinate values
  if (typeof distance !== 'number' || typeof x !== 'number' || typeof z !== 'number') {
    return res.status(400).json({ error: 'All coordinate values must be numbers' });
  }
  
  console.log(`Received coordinates: distance=${distance}, x=${x}, z=${z}`);
  
  // Process and store the coordinates
  const coordinateData = {
    distance,
    x,
    z,
    timestamp: Date.now()
  };
  
  coordinateHistory.push(coordinateData);
  if (coordinateHistory.length > MAX_HISTORY_LENGTH) {
    coordinateHistory.shift();
  }
  
  // Broadcast to all connected clients
  io.emit('new-coordinate', coordinateData);
  
  res.json({ status: 'success', message: 'Coordinates received' });
});

// Get all coordinates
app.get('/api/coordinates', (req, res) => {
  res.json(coordinateHistory);
});

// Clear all coordinates
app.delete('/api/coordinates', (req, res) => {
  coordinateHistory = [];
  io.emit('coordinates-cleared');
  res.json({ status: 'success', message: 'Coordinates cleared' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});