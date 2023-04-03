const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, MessageActionRow, MessageSelectMenu, MessageButton } = require('discord.js');
var dayjs = require('dayjs-with-plugins')
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
module.exports = {
  data: new SlashCommandBuilder()
    .setName('character')
    .setDescription('Find info about a character!')
    .addStringOption(option =>
      option.setName('character')
        .setDescription('The name of the character.')
        .setRequired(true)),
  async execute(interaction) {
    var chara = await interaction.options.getString('character');
    // Loading the dependencies. We don't need pretty
    // because we shall not log html to the terminal
    chara.replace(" ", "_");

    // URL of the page we want to scrape
    const url = "https://blueypedia.fandom.com/wiki/" + chara;
    console.log(url);
    const countries = [];
    try {
      // Fetch HTML of the page we want to scrape
      const { data } = await axios.get(url);
      // Load HTML we fetched in the previous line
      const $ = cheerio.load(data);
      // Select all the list items in plainlist class
      const unneeded = $(".portable-infobox.pi-background.pi-border-color.pi-theme-wikia.pi-layout-default");
      
      var breed1 = $(".pi-item.pi-data.pi-item-spacing.pi-border-color[data-source='breed'] > .pi-data-value.pi-font");
      var gender1 = $(".pi-item.pi-data.pi-item-spacing.pi-border-color[data-source='gender'] > .pi-data-value.pi-font");
      var age1 = $(".pi-item.pi-data.pi-item-spacing.pi-border-color[data-source='age'] > .pi-data-value.pi-font")
var regex = /<br\s*[\/]?>/gi;
      var breed = $(".pi-item.pi-data.pi-item-spacing.pi-border-color[data-source='breed'] > .pi-data-value.pi-font");
      var gender = $(".pi-item.pi-data.pi-item-spacing.pi-border-color[data-source='gender'] > .pi-data-value.pi-font");
      var age = $(".pi-item.pi-data.pi-item-spacing.pi-border-color[data-source='age'] > .pi-data-value.pi-font")
      if (!(age1.text() === "")){
        age = age1.html(age1.html().replace(regex, "\n"));
      }
      if (!(gender1.text() === "")){
        gender = gender1.html(gender1.html().replace(regex, "\n"));
      }
      if (!(breed1.text() === "")){
        breed = breed1.html(breed1.html().replace(regex, "\n"));
      }

      var lolol = $(".pi-item.pi-image a").attr('href');
      const unneeded1 = $("blockquote");
      const unneeded2 = $("br");
      unneeded1.remove();
      unneeded2.remove();
      unneeded.remove();
      const listItems = $(".mw-parser-output p");
      // Stores data for all countries
      // Use .each method to loop through the li we selected
      listItems.each((idx, el) => {
        // Object holding data for each country/jurisdiction
        // Select the text content of a and span elements
        // Store the textcontent in the above object
        var lol = $(el).text();
        console.log(lol);
        lol = lol.replace(/\n/g, '');
        if (lol != "\n" && lol != "" && lol.length != 0) {

          countries.push(lol);
        }
        // Populate countries array with country data
      });
      // Logs countries array to the console
      console.dir(countries);
      // Write countries array in countries.json file
      fs.writeFile("coutries.json", JSON.stringify(countries, null, 2), (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Successfully written data to file");
        
      });
      var time = dayjs().toISOString();
      const final = new EmbedBuilder()
        .setColor('#8EC2F2')
        .setTitle($(".page-header__title").text())
        .setURL(url)
        .setImage(lolol)
        .setTimestamp()
        .setFooter({ text: 'Fetched from Blueypedia' });

      if ($(".mw-parser-output").html().toString().toLowerCase().includes("bluey.tv")){
        final.setDescription(countries[1].substring(1, countries[1].length - 1));
      } else {
        final.setDescription(countries[0]);
      }
      
      if (!(breed.text() === "")) {
        final.addFields({name:'Breed', value: breed.text(), inline: true
                        })
      }
      if (!(gender.text() === "") && gender.text().substring(0, 1) == "F") {
        final.addFields({name: 'Gender', value: "Female", inline: true
                        })
      }
            if (!(gender.text() === "") && gender.text().substring(0, 1) == "M") {
        final.addFields({name: 'Gender', value: "Male", inline: true
                        })
      }
      if (!(age.text() === "")) {
        final.addFields({name: 'Age', value: age.text(), inline: true
                        })
      }
      interaction.reply({ embeds: [final] });
    } catch (err) {
      console.error(err);
      interaction.reply({ content: "404" });
    }

  }
}
/*






*/
