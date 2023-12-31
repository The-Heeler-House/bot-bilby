const logger = {
  log: function (message, level) {
    let logLevel = level ? level.toUpperCase() : 'MESSAGE';
    let color = '32';
    switch (logLevel) {
      case 'ERROR':
        color = '31';
        break;
      case 'WARNING':
        color = '33';
        break;
      case 'COMMAND':
        color = '34';
        break;
      case 'BILBY':
        color = '90';
        break;
    }
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    console.log(`\x1b[36m[${timestamp}]\x1b[0m \x1b[${color}m[${logLevel}]\x1b[0m: ${message}`);
  },
  message: function (message) {
    this.log(message, 'MESSAGE');
  },
  error: function (message) {
    this.log(message, 'ERROR');
    this.log(message.stack, 'ERROR');
    devChannel.send(`\`\`\`${message}\`\`\``);
    devChannel.send(`\`\`\`${message.stack}\`\`\``);
    devChannel.send(`JALEN PING SILENCED BY JALEN`);
  },
  warning: function (message) {
    this.log(message, 'WARNING');
  },
  command: function (message) {
    this.log(message, 'COMMAND');
  },
  bilby: function (message) {
    this.log(message, 'BILBY');
  }
};

module.exports = logger;
