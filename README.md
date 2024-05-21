# Bot Bilby v4
A recode of bot bilby so it doesn't crash every 5 seconds.

## Setting Up
### **Dependencies**
To install and run the bot, make sure that you have the following things set up/installed:
- MongoDB (https://www.mongodb.com/docs/manual/administration/install-community/)
- NodeJS (https://nodejs.org/en)
- A Discord Bot (instruction for how to setup one can be found at [MAKE_A_BOT_BILLY.md](MAKE_A_BOT_BILLY.md))
### **Install**
1. Clone the repo into your favorite directory (or if you don't have git, you can [download the repo as a ZIP instead](https://github.com/The-Heeler-House/bot-bilby/archive/refs/heads/main.zip))
```bash
git clone https://github.com/The-Heeler-House/bot-bilby
```
2. Change directory into the `bot-billy` folder, and install the required package using npm:
```bash
npm i
```
3. Create a new file in the root of the directory called `.env` (**note the dot at the end of the file**). This will be where you'll store your secret data.
4. Inside the `.env` file, fill in the following information (replace the dot between the quotation mark with actual value):
```env
TOKEN="..." # the bot token
DEVELOPMENT_GUILD="..." # guild to register guild commands in. if this is omitted, global commands will be registered instead.
PREFIX="..." # text command prefix, can be any length.
MONGO_URL="" # connection URL for MongoDB database (should be in the form of: "mongodb://...")
```
### **Run the bot**
Once everything have seen set up, compile and run the bot using:
```
npm run bot-unix # for people using MacOS/Linux
```
or
```
npm run bot-windows # for people using Windows
```

## Credit & License
Contributors: @jalenluorion, @sudoker0, and @CloudburstSys (leah).

License: MIT