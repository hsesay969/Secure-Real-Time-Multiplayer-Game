class Collectible {
  constructor({x, y, value, id}) {
    this.x = x;
    this.y = y;
    this.value = value || 1;
    this.id = id || Date.now();
    this.radius = 10; // For collision detection
  }
}

try {
  module.exports = Collectible;
} catch(e) {}

export default Collectible;