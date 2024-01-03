const { SlashCommandBuilder } = require('@discordjs/builders');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bingo')
    .setDescription('Create a Bingo card to play while watching Bluey Episodes!'),
  async execute(interaction) {
    // use the bingo folder with singular square prompt images to make a 5 by 5 grid. include "Prompt: Bluey! (Free Space).png" as the center square

    const fs = require('fs');
    const path = require('path');
    const bingoDir = path.join(__dirname, '../bingo/');
    const bingoFiles = fs.readdirSync(bingoDir);
    var bingoSquares = [];

    for (const file of bingoFiles) {
      // push the file path to the array
      bingoSquares.push(path.join(bingoDir, file));
      if (file === 'Prompt: Bluey! (Free Space).png') {
        bingoSquares.pop();
      }
    }

    var bingoCard = [];

    for (var i = 0; i < 25; i++) {
      bingoCard.push(bingoSquares[Math.floor(Math.random() * bingoSquares.length)]);
      bingoSquares.splice(bingoSquares.indexOf(bingoCard[i]), 1);
    }

    const canvas = require('canvas');

    const canvasWidth = 500;
    const canvasHeight = 500;
    const canvasSquareWidth = (canvasWidth) / 5;
    const canvasSquareHeight = (canvasHeight) / 5;

    const canvasCard = canvas.createCanvas(canvasWidth, canvasHeight);
    const ctx = canvasCard.getContext('2d');

    for (var i = 0; i < 5; i++) {
      for (var j = 0; j < 5; j++) {
        if (i === 2 && j === 2) {
          continue;
        }

        var square = bingoCard[i * 5 + j];
        const squareImage = await canvas.loadImage(square);
        ctx.drawImage(squareImage, j * canvasSquareWidth, i * canvasSquareHeight, canvasSquareWidth, canvasSquareHeight);
      }
    }

    const freeSpace = await canvas.loadImage(path.join(bingoDir, 'Prompt: Bluey! (Free Space).png'));

    ctx.drawImage(freeSpace, 2 * canvasSquareWidth, 2 * canvasSquareHeight, canvasSquareWidth, canvasSquareHeight);

    const attachment = new AttachmentBuilder(canvasCard.toBuffer(), 'bingo.png');
    
    await interaction.editReply({ content: '<:Bluey:965545191270400000> Bluey, <:Bingo:965564211642105867> Bingo! A Bingo card to play along to while you watch episodes of Bluey!\nThis card is for <@' + interaction.user.id + '>.', files: [attachment] });
  }
};