// number.js
const fs = require('fs');
const path = require('path');
const { createAudioResource, StreamType } = require('@discordjs/voice');

let currentIndex = 0;

function setIndex(newNumber) {
    currentIndex = newNumber;
}
function getIndex() {
    return currentIndex;
}

let resources = [];
const directoryPath = path.join(__dirname, './Album');
const files = fs.readdirSync(directoryPath);

function createResources() {
    resources = [];

    // create an array of audio resources
    for (const file of files) {
        resources.push(createAudioResource(`/opt/render/project/src/Album/${file}`, {
            inputType: StreamType.Arbitrary,
        }));
    }
}
function getResources() {
    return resources;
}

module.exports = {
    files,
    getIndex,
    setIndex,
    createResources,
    getResources,
};
