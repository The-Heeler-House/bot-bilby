// number.js
const fs = require('fs');
const path = require('path');
const { createAudioResource, StreamType } = require('@discordjs/voice');

const links = [
    'https://cdn.discordapp.com/attachments/1012812013795295233/1136576554105835550/01_-_Bluey_-_Bluey_Theme_Tune_Instrument_Parade.mp3',
    'https://cdn.discordapp.com/attachments/1012812013795295233/1136576554487521320/02_-_Bluey_-_Keepy_Uppy.mp3',
    'https://cdn.discordapp.com/attachments/1012812013795295233/1136576554848235634/03_-_Bluey_-_Here_Come_the_Grannies.mp3',
    'https://cdn.discordapp.com/attachments/1012812013795295233/1136576555154411590/04_-_Bluey_-_A_Message_From_the_Fairies_John_Ryans_Polka.mp3',
    'https://cdn.discordapp.com/attachments/1012812013795295233/1136576555473182730/05_-_Bluey_-_Taxi.mp3',
    'https://cdn.discordapp.com/attachments/1012812013795295233/1136576555796148295/06_-_Bluey_-_The_Claw_Pachelbels_Canon.mp3',
    'https://cdn.discordapp.com/attachments/1012812013795295233/1136576556165238814/07_-_Bluey_-_Pool.mp3',
    'https://cdn.discordapp.com/attachments/1012812013795295233/1136576556492398682/08_-_Bluey_-_Who_Likes_to_Dance.mp3',
    'https://cdn.discordapp.com/attachments/1012812013795295233/1136576556857307197/09_-_Bluey_-_Bluey_Theme_Tune_Extended.mp3',
    'https://cdn.discordapp.com/attachments/1012812013795295233/1136576557197037649/10_-_Bluey_-_The_Weekend.mp3',
    'https://cdn.discordapp.com/attachments/1012812013795295233/1136576582023122944/11_-_Bluey_-_Wagon_Ride.mp3',
    'https://cdn.discordapp.com/attachments/1012812013795295233/1136576582358671411/12_-_Bluey_-_Camping.mp3',
    'https://cdn.discordapp.com/attachments/1012812013795295233/1136576582698418268/13_-_Bluey_-_Fruit_Bat.mp3',
    'https://cdn.discordapp.com/attachments/1012812013795295233/1136576582979424316/14_-_Bluey_-_The_Creek_Intro.mp3',
    'https://cdn.discordapp.com/attachments/1012812013795295233/1136576583377887272/15_-_Bluey_-_Creek_is_Beautiful.mp3',
    'https://cdn.discordapp.com/attachments/1012812013795295233/1136576583700856922/16_-_Bluey_-_I_Know_a_Place_the_Creek_Song.mp3',
    'https://cdn.discordapp.com/attachments/1012812013795295233/1136576583960891392/17_-_Bluey_-_Bluey_Theme_Tune.mp3'
]

let currentIndex = 0;

function setIndex(newNumber) {
    currentIndex = newNumber;
}
function getIndex() {
    return currentIndex;
}

let resources = [];
let files = [];

function createResources() {
    resources = [];

    // create an array of audio resources
    for (let i = 0; i < links.length; i++) {
        const resource = createAudioResource(links[i], {
            inputType: StreamType.Arbitrary,
        });
        resources.push(resource);
        // push the titles to files array
        files.push(path.basename(links[i]));
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

