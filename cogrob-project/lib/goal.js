const { Vec3 } = require('vec3')

class Goal {
  goalDistance (node) {
    return 0
  }
  isEnd (node) {
    return true
  }
}

// Y coordinate goal
class YGoal extends Goal {
  constructor (y) {
    super()
    this.y = Math.floor(y)
  }
  goalDistance (node) {
    const dy = this.y - node.y
    return Math.abs(dy)
  }
  isEnd (node) {
    return node.y === this.y
  }
}
// Block goal
class BlockGoal extends Goal {
  constructor (x, y, z) {
    super()
    this.x = Math.floor(x)
    this.y = Math.floor(y)
    this.z = Math.floor(z)
  }
  goalDistance (node) {
    const dx = node.x - this.x
    const dy = node.y - this.y
    const dz = node.z - this.z
    return distanceFunc(dx,dz) + Math.abs(dy < 0 ? dy + 1 : dy)
  }
  isEnd (node) {
    const dx = node.x - this.x
    const dy = node.y - this.y
    const dz = node.z - this.z
    return Math.abs(dx) + Math.abs(dy < 0 ? dy + 1 : dy) + Math.abs(dz) === 1
  }
}

function distanceFunc(dx, dz) {
  dx = Math.abs(dx)
  dz = Math.abs(dz)
  return Math.abs(dz - dx) + Math.min(dx, dz) * Math.SQRT2
}

module.exports = {
  Goal,
  YGoal,
  BlockGoal,
}
