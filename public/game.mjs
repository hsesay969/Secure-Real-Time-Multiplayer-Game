import Player from './Player.mjs';
import Collectible from './Collectible.mjs';

const socket = io();
const canvas = document.getElementById('game-window');
const context = canvas.getContext('2d');

// Game state
let player;
let players = [];
let collectibles = [];

// Game settings
const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const PLAYER_SPEED = 5;

// Colors
const PLAYER_COLOR = '#0095DD';
const OTHER_PLAYER_COLOR = '#FF6347';
const COLLECTIBLE_COLOR = '#FFFF00';

// Initialize the game
function init() {
  // Create a player with random position
  const playerX = Math.floor(Math.random() * (GAME_WIDTH - 40)) + 20;
  const playerY = Math.floor(Math.random() * (GAME_HEIGHT - 40)) + 20;
  
  player = new Player({
    x: playerX,
    y: playerY,
    score: 0,
    id: Date.now()
  });
  
  // Emit the new player to the server
  socket.emit('new-player', {
    x: player.x,
    y: player.y,
    score: player.score,
    id: player.id
  });
  
  // Start the game loop
  requestAnimationFrame(gameLoop);
  
  // Add event listeners for keyboard input
  document.addEventListener('keydown', handleKeyDown);
}

// Game loop
function gameLoop() {
  // Clear the canvas
  context.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  
  // Draw all players
  drawPlayers();
  
  // Draw all collectibles
  drawCollectibles();
  
  // Check for collisions
  checkCollisions();
  
  // Draw the player's rank
  drawRank();
  
  // Continue the game loop
  requestAnimationFrame(gameLoop);
}

// Handle keyboard input for player movement
function handleKeyDown(e) {
  let dir = null;
  
  switch(e.key) {
    case 'ArrowRight':
    case 'd':
    case 'D':
      dir = 'right';
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      dir = 'left';
      break;
    case 'ArrowUp':
    case 'w':
    case 'W':
      dir = 'up';
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      dir = 'down';
      break;
  }
  
  if (dir) {
    // Move the player
    player.movePlayer(dir, PLAYER_SPEED);
    
    // Keep player within bounds
    player.x = Math.max(player.radius, Math.min(GAME_WIDTH - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(GAME_HEIGHT - player.radius, player.y));
    
    // Emit the player's new position to the server
    socket.emit('update-player', {
      x: player.x,
      y: player.y,
      score: player.score,
      id: player.id
    });
  }
}

// Draw all players
function drawPlayers() {
  // Draw the current player
  context.fillStyle = PLAYER_COLOR;
  context.beginPath();
  context.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  context.fill();
  
  // Draw other players
  context.fillStyle = OTHER_PLAYER_COLOR;
  players.forEach(p => {
    if (p.id !== player.id) {
      context.beginPath();
      context.arc(p.x, p.y, player.radius, 0, Math.PI * 2);
      context.fill();
    }
  });
}

// Draw all collectibles
function drawCollectibles() {
  context.fillStyle = COLLECTIBLE_COLOR;
  collectibles.forEach(item => {
    context.beginPath();
    context.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
    context.fill();
  });
}

// Check for collisions between the player and collectibles
function checkCollisions() {
  collectibles.forEach(item => {
    if (player.collision(item)) {
      // Update the player's score
      player.score += item.value;
      
      // Emit the collision to the server
      socket.emit('collectible-collected', {
        playerId: player.id,
        collectibleId: item.id
      });
    }
  });
}

// Draw the player's rank
function drawRank() {
  const allPlayers = [...players, player];
  const rank = player.calculateRank(allPlayers);
  
  context.fillStyle = '#000000';
  context.font = '16px Arial';
  context.fillText(`Score: ${player.score}`, 8, 20);
  context.fillText(rank, 8, 40);
}

// Socket.io event handlers
socket.on('connect', init);

socket.on('update-players', (updatedPlayers) => {
  players = updatedPlayers;
});

socket.on('update-collectibles', (updatedCollectibles) => {
  collectibles = updatedCollectibles;
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});