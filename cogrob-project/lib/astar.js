const { performance } = require("perf_hooks");

const PriorityQueue = require("./priorityQueue.js");

class PathfindingNode {
  constructor() {
    this.position = null;
    this.costFromStart = 0;
    this.costToGoal = 0;
    this.totalCost = 0;
    this.parent = null;
  }

  set(position, costFromStart, costToGoal, parent = null) {
    this.position = position;
    this.costFromStart = costFromStart;
    this.costToGoal = costToGoal;
    this.totalCost = costFromStart + costToGoal;
    this.parent = parent;
    return this;
  }
}

function reconstructPath(node) {
  const path = [];
  while (node.parent) {
    path.push(node.position);
    node = node.parent;
  }
  return path.reverse();
}

class AStarPathfinder {
  constructor(start, movements, goal, timeout, tickTimeout = 40, searchRadius = -1) {
    this.startTime = performance.now();

    this.movements = movements;
    this.goal = goal;
    this.timeout = timeout;
    this.tickTimeout = tickTimeout;

    this.closedSet = new Set();
    this.openPriorityQueue = new PriorityQueue();
    this.openMap = new Map();

    const startNode = new PathfindingNode().set(start, 0, goal.goalDistance(start));
    this.openPriorityQueue.push(startNode);
    this.openMap.set(startNode.position.hash, startNode);
    this.bestNode = startNode;

    this.maxCost = searchRadius < 0 ? -1 : startNode.costToGoal + searchRadius;
    this.visitedChunks = new Set();
  }

  createResult(status, node) {
    return {
      status,
      cost: node.costFromStart,
      time: performance.now() - this.startTime,
      visitedNodes: this.closedSet.size,
      generatedNodes: this.closedSet.size + this.openPriorityQueue.size(),
      path: reconstructPath(node),
      context: this
    };
  }

  findPath() {
    const computeStartTime = performance.now();
    while (!this.openPriorityQueue.isEmpty()) {
      if (performance.now() - computeStartTime > this.tickTimeout) {
        return this.createResult("partial", this.bestNode);
      }
      if (performance.now() - this.startTime > this.timeout) {
        return this.createResult("timeout", this.bestNode);
      }

      const currentNode = this.openPriorityQueue.pop();
      if (this.goal.isEnd(currentNode.position)) {
        return this.createResult("success", currentNode);
      }

      this.openMap.delete(currentNode.position.hash);
      this.closedSet.add(currentNode.position.hash);
      this.visitedChunks.add(`${currentNode.position.x >> 4},${currentNode.position.z >> 4}`);

      const neighbors = this.movements.getNeighbors(currentNode.position);
      for (const neighborPosition of neighbors) {
        if (this.closedSet.has(neighborPosition.hash)) {
          continue;
        }

        const costFromCurrentNode = currentNode.costFromStart + neighborPosition.cost;
        let neighborNode = this.openMap.get(neighborPosition.hash);
        let update = false;

        const goalDistance = this.goal.goalDistance(neighborPosition);
        if (this.maxCost > 0 && costFromCurrentNode + goalDistance > this.maxCost) continue;

        if (neighborNode === undefined) {
          neighborNode = new PathfindingNode();
          this.openMap.set(neighborPosition.hash, neighborNode);
        } else {
          if (neighborNode.costFromStart < costFromCurrentNode) {
            continue;
          }
          update = true;
        }

        neighborNode.set(neighborPosition, costFromCurrentNode, goalDistance, currentNode);
        if (neighborNode.costToGoal < this.bestNode.costToGoal) this.bestNode = neighborNode;
        if (update) {
          this.openPriorityQueue.update(neighborNode);
        } else {
          this.openPriorityQueue.push(neighborNode);
        }
      }
    }

    return this.createResult("noPath", this.bestNode);
  }
}

module.exports = AStarPathfinder;