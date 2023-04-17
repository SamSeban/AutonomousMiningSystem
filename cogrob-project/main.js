const { Vec3 } = require('vec3')
const EventEmitter = require('events').EventEmitter
const Astar = require('cogrob-project/lib/astar')

function inject(cogroby, options) {
  options = options || {}
  cogroby.pathfinder = new EventEmitter()
  cogroby.pathfinder.getPathTo = (movements, goal) => {
    const astarInstance = new Astar(movements)
    return astarInstance.calculatePath(cogroby.entity.position.floored(), goal, false)
  }

  let stateMoves = null
  let stateGoal = null
  let astartTimedout = false
  let dynamicGoal = false
  let returningPos = null
  let pathUpdated = false
  let path = []
  let digging = false
  let placing = false
  let placingBlock = null
  let stopPathing = false
  let astarContext = null

  cogroby.on('physicTick', monitorMovement)

  cogroby.pathfinder.setGoal = (goal, dynamic = false) => {
    stateGoal = goal
    dynamicGoal = dynamic
    resetPath('goal_changed', false)
  }

  cogroby.pathfinder.setMoves = (movements) => {
    stateMoves = movements
    resetPath('movements_changed', false)
  }

  cogroby.pathfinder.goal = () => stateGoal
  cogroby.pathfinder.movements = () => stateMoves
  cogroby.pathfinder.stop = () => stopPathing = true

  cogroby.pathfinder.LOSWhenPlacingBlocks = options.LOSWhenPlacingBlocks || false

  function resetPath(reason, forceStop) {
    if (forceStop) {
      stop()
    }
    pathUpdated = false
    path = []
    if (astarContext) {
      astarContext.abort()
      astarContext = null
    }
    cogroby.emit('path_reset', reason)
  }

  function postProcessPath(inputPath) {
    const refinedPath = []
    let currentPoint = inputPath[0]
    for (let i = 1; i < inputPath.length; i++) {
      const nextPoint = inputPath[i]
      while (true) {
        currentPoint = currentPoint.plus(nextPoint.minus(currentPoint).normalize())
        refinedPath.push(currentPoint)
        if (currentPoint.distanceTo(nextPoint) < 1) {
          break
        }
      }
      currentPoint.x = Math.floor(currentPoint.x) + 0.5
      currentPoint.y = currentPoint.y - 1
      currentPoint.z = Math.floor(currentPoint.z) + 0.5
    }
    const finalPath = []
    let lastNode = cogroby.entity.position
    for (let i = 1; i < refinedPath.length; i++) {
      const node = refinedPath[i]
      if (node.toPlace.length > 0 || node.toBreak.length > 0 || Math.abs(lastNode.y - node.y) > 0.5) {
        finalPath.push(refinedPath[i - 1])
        lastNode = refinedPath[i - 1]
      }
    }
    finalPath.push(refinedPath[refinedPath.length - 1])
    return finalPath
  }

  function pathFromPlayer(inputPath) {
    if (inputPath.length === 0) {
      return
    }
    inputPath.shift()
    const startPoint = cogroby.entity.position.floored()
    if (!startPoint.equals(inputPath[0])) {
      inputPath.unshift(startPoint)
    }
  }

  function stop() {
    cogroby.clearControlStates()
    returningPos = null
    digging = false
    placing = false
  }

  function fullStop() {
    stop()
    path = []
  }

  function moveToBlock(targetPosition) {
    if (targetPosition.distanceSquared(cogroby.entity.position) > stateGoal.rangeSq) {
      cogroby.setControlState('forward', true)
    } else {
      cogroby.clearControlStates()
    }
    return
  }

  function monitorMovement() {
    if (stopPathing) {
      stop()
      return
    }

    if (dynamicGoal) {
      if (!stateGoal.isValid()) {
        stop()
      } else if (stateGoal.hasChanged()) {
        resetPath('goal_moved', false)
      }
    }

    if (astartTimedout && astarContext) {
      const results = astarContext.compute()
      results.path = postProcessPath(results.path)
      pathFromPlayer(results.path)
      cogroby.emit('path_update', results)
      path = results.path
      astartTimedout = results.status === 'partial'
    }

    if (cogroby.pathfinder.LOSWhenPlacingBlocks && returningPos) {
      if (!moveToBlock(returningPos)) return
      returningPos = null
    }

    if (path.length === 0) {
      if (stateMoves && stateGoal) {
        if (stateGoal.isEnd(cogroby.entity.position.floored())) {
          if (!dynamicGoal) {
            cogroby.emit('goal_reached', stateGoal)
            stateGoal = null
            fullStop()
          }
        } else if (!pathUpdated) {
          const results = cogroby.pathfinder.getPathTo(stateMoves, stateGoal)
          cogroby.emit('path_update', results)
          path = results.path
          astartTimedout = results.status === 'partial'
          pathUpdated = true
        }
      }
    }

    if (path.length === 0) {
      return
    }

    let nextPoint = path[0]
    const currentPosition = cogroby.entity.position

    if (nextPoint.toBreak.length > 0 || digging) {
      if (cogroby.entity.onGround && !digging) {
        digging = true
        const targetBlock = nextPoint.toBreak.shift()
        const block = cogroby.blockAt(new Vec3(targetBlock.x, targetBlock.y, targetBlock.z), false)
        const optimalTool = cogroby.pathfinder.bestTool(block)
        fullStop()

        const dig = () => {
          cogroby.dig(block, true)
            .catch(_ignoreError => {
              resetPath('dig_error')
            })
            .then(() => {
              digging = false
            })
        }

        if (!optimalTool) {
          dig()
        } else {
          cogroby.equip(optimalTool, 'hand')
            .catch(_ignoreError => {})
            .then(() => dig())
        }
      }
      return
    }

    if (nextPoint.toPlace.length > 0 || placing) {
      if (!placing) {
        placing = true
        placingBlock = nextPoint.toPlace.shift()
        fullStop()
      }

      const blockToPlace = stateMoves.getScaffoldingItem()

      if (placingBlock.jump) {
        cogroby.setControlState('jump', true)
      }
      cogroby.equip(blockToPlace, 'hand')
        .then(() => {
          const refBlock = cogroby.blockAt(new Vec3(placingBlock.x, placingBlock.y, placingBlock.z), false)
          cogroby.placeBlock(refBlock, new Vec3(placingBlock.dx, placingBlock.dy, placingBlock.dz))
            .then(() => {
              cogroby.setControlState('sneak', false)
              if (cogroby.pathfinder.LOSWhenPlacingBlocks && placingBlock.returnPos) {
                returningPos = placingBlock.returnPos.clone()
              }
            })
            .catch(_ignoreError => {
              resetPath('place_error')
            })
            .then(() => {
              placing = false
            })
        })
        .catch(_ignoreError => {})
      return
    }

    let dx = nextPoint.x - currentPosition.x
    const dy = nextPoint.y - currentPosition.y
    let dz = nextPoint.z - currentPosition.z
    if (Math.abs(dx) <= 0.35 && Math.abs(dy) < 1 && Math.abs(dz) <= 0.35) {
      if (stopPathing) {
        stop()
        return
      }
      path.shift()
      if (path.length === 0) {
        if ((stateGoal.isEnd(currentPosition.floored()) || stateGoal.isEnd(currentPosition.floored().offset(0, 1, 0))) && !dynamicGoal && stateGoal) {
          cogroby.emit('goal_reached', stateGoal)
          stateGoal = null
        }
        fullStop()
        return
      }
      nextPoint = path[0]
      if (nextPoint.toPlace.length > 0 || nextPoint.toBreak.length > 0) {
        fullStop()
        return
      }
      dx = nextPoint.x - currentPosition.x
      dz = nextPoint.z - currentPosition.z
    }

    cogroby.look(Math.atan2(-dx, -dz), 0)
    cogroby.setControlState('forward', true)
    cogroby.setControlState('jump', false)

    cogroby.setControlState('forward', false)
    cogroby.setControlState('sprint', false)
  }
}

module.exports = {
  pathfinder: inject,
  Moves: require('cogrob-project/lib/moves'),
  goals: require('cogrob-project/lib/goal')
}