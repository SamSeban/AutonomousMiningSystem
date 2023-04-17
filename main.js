const mineflayer = require('mineflayer');
const mcData = require('minecraft-data');
const { pathfinder, Movements, goals: { YGoal, BlockGoal } } = require('cogrob-project');
const { Vec3 } = require('vec3');

const bot = mineflayer.createBot({
  host: 'localhost',
  username: 'CogRoby',
});

bot.loadPlugin(pathfinder);

bot.once('spawn', () => {
  console.log('Bot spawned.');

  const mcDataVersion = mcData(bot.version);
  const defaultMove = new Movements(bot, mcDataVersion);

  // Set bot's movement options
  bot.pathfinder.setMovements(defaultMove);
});

bot.on('chat', async (username, message) => {
  if (username === bot.username) return;

  if (message === 'status') {
    const currentPosition = bot.entity.position;
    bot.chat(`Current position: ${currentPosition.toString()}`);
  }

  if (message === 'Diamonds') {
    // Move to the desired Y-level
    const desiredYLevel = 13;
    const goal = new YGoal(desiredYLevel);

    bot.pathfinder.goto(goal).then(async () => {
      console.log('Reached Y level. Moving in a random direction.');

      // Choose a random direction (either positive or negative X or Z axis)
      const randomDirection = Math.random() < 0.5 ? 'x' : 'z';
      const randomSign = Math.random() < 0.5 ? -1 : 1;
      // Keep moving in the chosen direction until a diamond ore is found
      async function moveInRandomDirection() {
        const currentPosition = bot.entity.position;
        const newPosition = currentPosition.clone();

        newPosition[randomDirection] += randomSign * 5;

        const blockGoal = new BlockGoal(newPosition.x, newPosition.y, newPosition.z);
        console.log(blockGoal)
        bot.pathfinder.goto(blockGoal).then(() => {
            const diamondOreBlock = bot.findBlock({
                matching: ['diamond_ore'].map(blockName => bot.registry.blocksByName[blockName].id),
                maxDistance: 16,
                point: bot.entity.position,
            });
            console.log("Looking for Diamond")
            if (diamondOreBlock) {
                console.log('Found diamond ore. Mining...');
                console.log(diamondOreBlock.position)
                // Mine the diamond ore
                bot.dig(diamondOreBlock, (err) => {
                  if (err) {
                    console.log('Error mining diamond ore:', err);
                  } else {
                    console.log('Finished mining diamond ore.');
                  }
                });
            } else {
                console.log("Didn't find diamond ore")
                moveInRandomDirection();
            }
        }).catch((err) => {
          console.log('Error moving in the random direction:', err);
        });
      }
      moveInRandomDirection();
    }).catch((err) => {
      console.log('Error reaching Y level:', err);
    });
  }
});
