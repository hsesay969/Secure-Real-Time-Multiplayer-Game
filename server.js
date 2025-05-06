require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const socket = require('socket.io');

const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');
const Collectible = require('./public/Collectible.mjs');

const app = express();

// 🔐 Apply security headers
app.use(helmet()); // Enables all modern security features
app.use(helmet.hidePoweredBy({ setTo: 'PHP 7.4.3' })); // Fake header for security

// 🔐 Disable caching
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Enable CORS for FCC testing and remote access
app.use(cors({ origin: '*' }));

// Serve static files
app.use('/public', express.static(process.cwd() + '/public'));
app.use('/assets', express.static(process.cwd() + '/assets'));

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve index page
app.route('/')
  .get((req, res) => {
    res.sendFile(process.cwd() + '/views/index.html');
  });

// FCC testing routes
fccTestingRoutes(app);

// 404 middleware
app.use((req, res) => {
  res.status(404).type('text').send('Not Found');
});

// Start the server
const portNum = process.env.PORT || 3000;
const server = app.listen(portNum, () => {
  console.log(`Listening on port ${portNum}`);
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(() => {
      try {
        runner.run();
      } catch (e) {
        console.log('Tests are not valid:');
        console.error(e);
      }
    }, 1500);
  }
});

// 🎮 WebSocket Setup
const io = socket(server);

// Game state
let players = [];
let collectibles = [];

// Helper: Generate new collectible
function generateCollectible() {
  return new Collectible({
    x: Math.floor(Math.random() * 590) + 25,
    y: Math.floor(Math.random() * 430) + 25,
    value: 1,
    id: Date.now()
  });
}

// Start with 3 collectibles
for (let i = 0; i < 3; i++) {
  collectibles.push(generateCollectible());
}

// Handle Socket.io connections
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('new-player', (playerData) => {
    playerData.id = socket.id;
    players.push(playerData);

    socket.emit('update-players', players);
    socket.emit('update-collectibles', collectibles);
    socket.broadcast.emit('update-players', players);
  });

  socket.on('update-player', (playerData) => {
    const playerIndex = players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      players[playerIndex] = {
        ...players[playerIndex],
        x: playerData.x,
        y: playerData.y,
        score: playerData.score
      };
      io.emit('update-players', players);
    }
  });

  socket.on('collectible-collected', ({ playerId, collectibleId }) => {
    const playerIndex = players.findIndex(p => p.id === playerId);
    const collectibleIndex = collectibles.findIndex(c => c.id === collectibleId);

    if (playerIndex !== -1 && collectibleIndex !== -1) {
      players[playerIndex].score += collectibles[collectibleIndex].value;
      collectibles.splice(collectibleIndex, 1);
      collectibles.push(generateCollectible());

      io.emit('update-players', players);
      io.emit('update-collectibles', collectibles);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const index = players.findIndex(p => p.id === socket.id);
    if (index !== -1) {
      players.splice(index, 1);
      io.emit('update-players', players);
    }
  });
});

module.exports = app;
