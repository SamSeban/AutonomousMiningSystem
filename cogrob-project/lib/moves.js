const { Vec3 } = require('vec3')
const nbt = require('prismarine-nbt')
const Move = require('cogrob-project/lib/move')

const directions = [
  {x: 0, z: -1}, // North
  {x: 0, z: 1}, // South
  {x: 1, z: 0}, // East
  {x: -1, z: 0} // West
]

class Pathfinding {
  constructor (aiBot) {
    const blockReg = aiBot.registry
    this.aiBot = aiBot
    this.putCost = 1
    this.waterCost = 1
    this.breakCost = 1
    this.largestDrop = 4
    this.airBlocks = new Set()
    this.airBlocks = new Set()
    this.airBlocks.add(blockReg.blocksByName.air.id)
    this.airBlocks.add(blockReg.blocksByName.water.id)
    this.airBlocks.add(blockReg.blocksByName.lava.id)
    this.buildingBlocks = []
    this.buildingBlocks.push(blockReg.itemsByName.dirt.id)
    this.buildingBlocks.push(blockReg.itemsByName.cobblestone.id)
    this.avoidBlocks = new Set()
    this.avoidBlocks.add(blockReg.blocksByName.fire.id)
    this.avoidBlocks.add(blockReg.blocksByName.lava.id)
    this.waterBlocks = new Set()
    this.waterBlocks.add(blockReg.blocksByName.water.id)
    this.waterBlocks.add(blockReg.blocksByName.lava.id)
  }

  findBuildingItem () {
    const itemArray = this.aiBot.inventory.items()
    for (const itemId of this.buildingBlocks) {
      for (const k in itemArray) {
        const currentItem = itemArray[k]
        if (currentItem.type === itemId) return currentItem
      }
    }
    return null
  }

  retrieveBlock (position, dx, dy, dz) {
    const blk = position ? this.aiBot.blockAt(new Vec3(position.x + dx, position.y + dy, position.z + dz), false) : null
    if (!blk) {
      return {
        emptyBlock: false,
        canFall: false,
        safe: false,
        physical: false,
        liquid: false,
        height: dy
      }
    }
    blk.safe = blk.boundingBox === 'empty' && !this.avoidBlocks.has(blk.type)
    blk.physical = blk.boundingBox === 'block'
    blk.emptyBlock = this.airBlocks.has(blk.type) && !blk.physical
    blk.liquid = this.waterBlocks.has(blk.type)
    blk.height = position.y + dy

    return blk
  }

  destroyCost (block, blocksToBreak) {
    let cost = 0
    if (block.safe) return cost
    blocksToBreak.push(block.position)

    const tool = this.aiBot.pathfinder.bestTool(block)
    const enchants = (tool && tool.nbt) ? nbt.simplify(tool.nbt).Enchantments : []
    const effects = this.aiBot.entity.effects
    const digTime = block.digTime(tool ? tool.type : null, false, false, false, enchants, effects)
    const laborCost = (1 + 3 * digTime / 1000) * this.breakCost
    cost += laborCost
    return cost
  }
  moveJumpUp (node, dir, neighbors) {
    const playerBlock = this.retrieveBlock(node, 0, 2, 0);
    const middleBlock = this.retrieveBlock(node, dir.x, 1, dir.z);
    const bottomBlock = this.retrieveBlock(node, dir.x, 0, dir.z);
    const upperBlock = this.retrieveBlock(node, dir.x, 2, dir.z);

    let cost = 2;  (move+jump)
    const toBreak = [];
    const toPlace = [];


    if (!bottomBlock.physical) {
      const belowBlock = this.retrieveBlock(node, dir.x, -1, dir.z);
      if (!belowBlock.physical) {
        if (!belowBlock.emptyBlock) {
          toBreak.push(belowBlock.position);
        }
        toPlace.push({ x: node.x, y: node.y - 1, z: node.z, dx: dir.x, dy: 0, dz: dir.z, returnPos: new Vec3(node.x, node.y, node.z) });
        cost += this.putCost; 
      }

      if (!bottomBlock.emptyBlock) {
        toBreak.push(bottomBlock.position);
      }
      toPlace.push({ x: node.x + dir.x, y: node.y - 1, z: node.z + dir.z, dx: 0, dy: 1, dz: 0 });
      cost += this.putCost; 

      bottomBlock.height += 1;
    }

    cost += this.destroyCost(playerBlock, toBreak);
    cost += this.destroyCost(upperBlock, toBreak);
    cost += this.destroyCost(middleBlock, toBreak);

    neighbors.push(new Move(middleBlock.position.x, middleBlock.position.y, middleBlock.position.z, node.remainingBlocks - toPlace.length, cost, toBreak, toPlace));

  }

  moveForward (node, dir, neighbors) {
    const middleBlock = this.retrieveBlock(node, dir.x, 1, dir.z);
    const bottomBlock = this.retrieveBlock(node, dir.x, 0, dir.z);
    const belowBlock = this.retrieveBlock(node, dir.x, -1, dir.z);

    let cost = 1; 

    const toBreak = [];
    const toPlace = [];

    if (!belowBlock.physical && !bottomBlock.liquid) {
      if (!belowBlock.emptyBlock) {
        toBreak.push(belowBlock.position);
      }
      toPlace.push({ x: node.x, y: node.y - 1, z: node.z, dx: dir.x, dy: 0, dz: dir.z });
      cost += this.putCost;
    }

    cost += this.destroyCost(middleBlock, toBreak);

    if (this.retrieveBlock(node, 0, 0, 0).liquid) cost += this.waterCost;

    neighbors.push(new Move(bottomBlock.position.x, bottomBlock.position.y, bottomBlock.position.z, node.remainingBlocks - toPlace.length, cost, toBreak, toPlace));
  }

  landingBlock (node, dir) {
    let landingBlock = this.retrieveBlock(node, dir.x, -2, dir.z);
    while (landingBlock.position && landingBlock.position.y > this.bot.game.minY) {
      if (landingBlock.physical) {
        if (node.y - landingBlock.position.y <= this.maxDropDown) {
          return this.retrieveBlock(landingBlock.position, 0, 1, 0);
        }
      }
      landingBlock = this.retrieveBlock(landingBlock.position, 0, -1, 0);
    }
    return null;
  }

  moveDropDown (node, dir, neighbors) {
    const middleBlock = this.retrieveBlock(node, dir.x, 1, dir.z);
    const bottomBlock = this.retrieveBlock(node, dir.x, 0, dir.z);
    const belowBlock = this.retrieveBlock(node, dir.x, -1, dir.z);

    let cost = 1; 
    const toBreak = [];
    const toPlace = [];

    const landingBlock = this.landingBlock(node, dir);
    if (!landingBlock) return;

    cost += this.destroyCost(middleBlock, toBreak);
    cost += this.destroyCost(bottomBlock, toBreak);
    cost += this.destroyCost(belowBlock, toBreak);

    if (bottomBlock.liquid) return; // dont go underwater

    neighbors.push(new Move(landingBlock.position.x, landingBlock.position.y, landingBlock.position.z, node.remainingBlocks - toPlace.length, cost, toBreak, toPlace));
  }

  moveDown (node, neighbors) {
    const block0 = this.retrieveBlock(node, 0, -1, 0);

    let cost = 1; 
    const toBreak = [];
    const toPlace = [];

    const landingBlock = this.landingBlock(node, { x: 0, z: 0 });
    if (!landingBlock) return;

    cost += this.destroyCost(block0, toBreak);
    if (cost > 100) return;

    if (this.retrieveBlock(node, 0, 0, 0).liquid) return; // dont go underwater

    neighbors.push(new Move(landingBlock.position.x, landingBlock.position.y, landingBlock.position.z, node.remainingBlocks - toPlace.length, cost, toBreak, toPlace));
  }

  moveUp (node, neighbors) {
    const blockBelow = this.retrieveBlock(node, 0, 0, 0);
    if (blockBelow.liquid) return;
    const blockAbove = this.retrieveBlock(node, 0, 2, 0);

    let cost = 1; 
    const toBreak = [];
    const toPlace = [];
    cost += this.destroyCost(blockAbove, toBreak);
    if (!blockBelow.replaceable) {
      if (!this.safeToBreak(blockBelow)) return;
      toBreak.push(blockBelow.position);
    }
    toPlace.push({ x: node.x, y: node.y - 1, z: node.z, dx: 0, dy: 1, dz: 0, jump: true });
    cost += this.putCost;

    neighbors.push(new Move(node.x, node.y + 1, node.z, node.remainingBlocks - toPlace.length, cost, toBreak, toPlace));
  }

  fetchNeighbors (node) {
    const neighbors = [];

    for (const i in directions) {
      const dir = directions[i];
      this.moveForward(node, dir, neighbors);
      this.moveJumpUp(node, dir, neighbors);
      this.moveDropDown(node, dir, neighbors);
    }
    this.moveDown(node, neighbors);
    this.moveUp(node, neighbors);
    return neighbors;
  }
}
module.exports = Moves;