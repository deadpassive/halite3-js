const hlt = require('./hlt');
const { Direction } = require('./hlt/positionals');
const logging = require('./hlt/logging');

const game = new hlt.Game();

function findBestMove(gameMap, currentPosition) {
    const directions = Direction.getAllCardinals();
    let bestDestination;
    let bestScore = 0;
    directions.forEach(direction => {
        const position = currentPosition.directionalOffset(direction);
        if (gameMap.get(position).isOccupied) {
            logging.info(`Direction ${direction} from ${currentPosition} to ${position} is blocked, skipping`);
            return;
        }
        score = getHaliteForNeighbours(gameMap, position);
        logging.info(`Direction ${direction} from ${currentPosition} to ${position} produced ${score}`);
        if (score > bestScore) {
            bestScore = score;
            bestDestination = position;
        }
    });
    logging.info(`Selected destination ${bestDestination} with score ${bestScore}`);
    return bestDestination;
}

function getHaliteForNeighbours(gameMap, position) {
    const directions = Direction.getAllCardinals();
    let sum = 0;
    directions.forEach(direction => {
        sum += getHaliteForNeighbour(gameMap, position, direction);
    });
    return sum;
}

function getHaliteForNeighbour(gameMap, position, direction) {
    const neighbourPosition = position.directionalOffset(direction);
    return gameMap.get(neighbourPosition).haliteAmount;
}

game.initialize().then(async () => {
    // At this point "game" variable is populated with initial map data.
    // This is a good place to do computationally expensive start-up pre-processing.
    // As soon as you call "ready" function below, the 2 second per turn timer will start.
    await game.ready('MyJavaScriptBot');

    logging.info(`My Player ID is ${game.myId}.`);

    while (true) {
        await game.updateFrame();

        const { gameMap, me } = game;

        const commandQueue = [];

        for (const ship of me.getShips()) {
            if (ship.haliteAmount > hlt.constants.MAX_HALITE / 2) {
                const destination = me.shipyard.position;
                const safeMove = gameMap.naiveNavigate(ship, destination);
                commandQueue.push(ship.move(safeMove));
            }
            else if (gameMap.get(ship.position).haliteAmount < hlt.constants.MAX_HALITE / 10) {
                const destination = findBestMove(gameMap, ship.position);
                const direction = Direction.getAllCardinals()[Math.floor(4 * Math.random())];
                // const destination = ship.position.directionalOffset(direction);
                const safeMove = gameMap.naiveNavigate(ship, destination);
                commandQueue.push(ship.move(safeMove));
            }
        }

        if (game.turnNumber < 0.75 * hlt.constants.MAX_TURNS &&
            me.haliteAmount >= hlt.constants.SHIP_COST &&
            !gameMap.get(me.shipyard).isOccupied) {
            commandQueue.push(me.shipyard.spawn());
        }

        await game.endTurn(commandQueue);
    }
});

