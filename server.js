require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const expect = require('chai');
const socket = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');
const Collectible = require('./public/Collectible.mjs');

const app = express();

// Security middleware
app.use(helmet.noSniff());  // Prevent MIME type sniffing
app.use(helmet.xssFilter());  // Prevent XSS attacks
app.use(helmet.noCache());  // Disable caching

// Set headers before other middleware
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'PHP 7.4.3');
  next();
});

app.use('/public', express.static(process.cwd() + '/public'));
app.use('/assets', express.static(process.cwd() + '/assets'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//For FCC testing purposes and enables user to connect from outside the hosting platform
app.use(cors({origin: '*'})); 

// Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  }); 

//For FCC testing purposes
fccTestingRoutes(app);
    
// 404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

const portNum = process.env.PORT || 3000;

// Set up server and tests
const server = app.listen(portNum, () => {
  console.log(`Listening on port ${portNum}`);
  if (process.env.NODE_ENV==='test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (error) {
        console.log('Tests are not valid:');
        console.error(error);
      }
    }, 1500);
  }
});

// Set up Socket.io
const io = socket(server);

// Game state
let players = [];
let collectibles = [];

// Generate a new collectible
function generateCollectible() {
  return new Collectible({
    x: Math.floor(Math.random() * 590) + 25, // Keep within canvas
    y: Math.floor(Math.random() * 430) + 25, // Keep within canvas
    value: 1,
    id: Date.now()
  });
}

// Initialize collectibles
for (let i = 0; i < 3; i++) {
  collectibles.push(generateCollectible());
}

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);
  
  // Handle new player joining
  socket.on('new-player', (playerData) => {
    playerData.id = socket.id; // Use socket.id for player id
    players.push(playerData);
    
    // Send current players and collectibles to the new player
    socket.emit('update-players', players);
    socket.emit('update-collectibles', collectibles);
    
    // Broadcast new player to all other players
    socket.broadcast.emit('update-players', players);
  });
  
  // Handle player movement
  socket.on('update-player', (playerData) => {
    // Update the player's data
    const playerIndex = players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      players[playerIndex] = {
        ...players[playerIndex],
        x: playerData.x,
        y: playerData.y,
        score: playerData.score
      };
      
      // Broadcast updated players to all clients
      io.emit('update-players', players);
    }
  });
  
  // Handle collectible collection
  socket.on('collectible-collected', ({playerId, collectibleId}) => {
    // Find the player
    const playerIndex = players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      // Find the collectible
      const collectibleIndex = collectibles.findIndex(c => c.id === collectibleId);
      if (collectibleIndex !== -1) {
        // Increase player's score
        players[playerIndex].score += collectibles[collectibleIndex].value;
        
        // Remove the collected collectible
        collectibles.splice(collectibleIndex, 1);
        
        // Generate a new collectible
        collectibles.push(generateCollectible());
        
        // Broadcast updated game state to all clients
        io.emit('update-players', players);
        io.emit('update-collectibles', collectibles);
      }
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    const playerIndex = players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      players.splice(playerIndex, 1);
      
      io.emit('update-players', players);
    }
  });
});

module.exports = app; // For testing