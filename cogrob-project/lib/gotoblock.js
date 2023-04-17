function throwErr(errorName, errorMessage) {
  const customError = new Error(errorMessage);
  customError.name = errorName;
  return customError;
}

function goto(agentInstance, destination) {
  return new Promise((resolveAction, rejectAction) => {
    function targetReached() {
      performCleanup();
    }

    function noAvailablePath(results) {
      if (results.path.length === 0) {
        performCleanup();
      } else if (results.status === "noPath") {
        performCleanup(throwErr("NoPath", "Unable to find a path to the destination!"));
      } else if (results.status === "timeout") {
        performCleanup(throwErr("Timeout", "Pathfinding to destination took too long!"));
      }
    }

    function target_change(newDestination) {
      if (newDestination !== destination) {
        performCleanup(throwErr("DestinationAltered", "Destination changed before completion!"));
      }
    }

    function pathDisruption() {
      performCleanup(throwErr("PathDisruption", "Path was disrupted before completion, destination not reached."));
    }

    function performCleanup(errorInstance) {
      agentInstance.removeListener("target_reached", targetReached);
      agentInstance.removeListener("path_update", noAvailablePath);
      agentInstance.removeListener("target_change", target_change);
      agentInstance.removeListener("path_disruption", pathDisruption);

      setTimeout(() => {
        if (errorInstance) {
          rejectAction(errorInstance);
        } else {
          resolveAction();
        }
      }, 0);
    }

    agentInstance.on("path_disruption", pathDisruption);
    agentInstance.on("target_reached", targetReached);
    agentInstance.on("path_update", noAvailablePath);
    agentInstance.on("target_change", target_change);
    agentInstance.pathfinder.assignGoal(destination);
  });
}

module.exports = goto;
