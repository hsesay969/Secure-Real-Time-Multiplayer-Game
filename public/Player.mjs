class Player {
  constructor({x, y, score, id}) {
    this.x = x;
    this.y = y;
    this.score = score || 0;
    this.id = id;
    this.radius = 20; // Size of the player for collision detection
  }

  movePlayer(dir, speed) {
    switch(dir) {
      case 'right':
        this.x += speed;
        break;
      case 'left':
        this.x -= speed;
        break;
      case 'up':
        this.y -= speed;
        break;
      case 'down':
        this.y += speed;
        break;
    }
  }

  collision(item) {
    // Calculate distance between player and collectible
    const dx = this.x - item.x;
    const dy = this.y - item.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if the distance is less than the sum of the radii
    return distance < this.radius + item.radius;
  }

  calculateRank(players) {
    // Sort players by score in descending order
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    
    // Find the rank of this player
    const rank = sortedPlayers.findIndex(player => player.id === this.id) + 1;
    
    return `Rank: ${rank}/${players.length}`;
  }
}

export default Player;