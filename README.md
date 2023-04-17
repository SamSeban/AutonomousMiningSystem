
# CogRob Project - Autonomous Mining System

Our project consists of a mining robot in the video game Minecraft that gathers the required resources in the most efficient way possible. In this video-game, we will create a character that will be entirely controlled by code, to perform actions such as moving in a 3D environment, avoiding obstacles such as walls and holes in the ground, and mining to collect ores.

## Our file structure
The A* algorithm is stored in **astar.js** and **priorityQueue.js**, the latter of which adds a priority queue, which is a data structure that keeps its elements sorted by priority, it is a core component of the A* pathfinding algorithm and ensures the solution is optimal.

We had to define every possible move that our robot could make along with the corresponding costs. The actions were: go up by jumping and sprinting, fall down, move forward etc. We put these actions in the **moves.js** file.

The **goals.js** file adds two goals: YGoal and BlockGoal. The first of these two, YGoal, is a class that helps our robot know where to go (along the y/vertical axis) before starting to look for diamonds. The BlockGoal is then used to tell the player to move a given distance away from his current position.

The **run.js** file creates a robot using mineflayer, joins a local Minecraft server and uses the A* algorithm to reach the Y goal, before using the algorithm again to mine in a random direction until it sees a diamond ore, at which point it will start going towards the diamond ore to collect it.

## The A* algorithm
In the **astar.js** file, you can find the main class **AStarPathfinder** which contains the main functions used in our algorithm. The **PathfindingNode** class is the class used to create nodes that start from the robot's position and goes towards his goal. At each node we compute the cost of moving there, and push the node to the priority queue found in **priorityQueue.js**.

## Moves.js
In the **moves.js** file, we describe the possible actions the robot can make, a long with the cost of each move. We also check if the move is "doable", by checking if there is lava in the way, if the player needs to break a block or if it's already an empty space. We also compute the time it will take the player to break the blocks on its way and add it to the cost of each move (in the **destroyCost** function).

If the player needs to place blocks on the way to the goal, it uses the **findBuildingItem** function to find items in its inventory to place, and places it at the given coordinates.

## Main.js
This is the main code that runs when you activate the robot. It connects the bot to a local Minecraft server, and waits for the word "Diamonds" to be written in the chat.
Once it reads "Diamonds", it starts pursuing the GoalY goal with the given Y-level 13. Once it reaches it, it picks a random direction to start mining, and will continue to mine using the recursive function **moveInRandomDirection** until it finds diamonds, at which point it will start heading towards it.

## Youtube video:
Here is the link to our youtube video showing the robot working:
https://youtu.be/HoLJxH5CT8s
