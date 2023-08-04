const logger = require('./logger.js');

let currentIndex = 0;

function setIndex(newNumber) {
    currentIndex = newNumber;
}
function getIndex() {
    return currentIndex;
}

let resources = [];

function createResources() {
    resources = [];

    // create an array of audio resources
    for (const file of files) {
        resources.push(createAudioResource(`${__dirname}/Album/${file}`, {
            inputType: StreamType.Arbitrary,
        }));
        logger.command(`Created audio resource for ${file}`);
    }
}
function getResources() {
    return resources;
}

module.exports = {
    getIndex,
    setIndex,
};
