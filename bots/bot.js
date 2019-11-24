class Bot {
  constructor({ resolveUndefined } = {}) {
    this.waiting = {};
    this.reset = {};
    this.commands = {};
    this.resolveUndefined = resolveUndefined;
  }

  //Прекратить ожидать ответ от uid.
  stopWaitAnswer(uid) {
    this.waiting[uid] = undefined;
    this.reset[uid] = undefined;
  }

  //Войти в режим оиждания ответа от uid.
  waitAnswer(uid) {
    if (!this.resolveUndefined && this.waiting[uid])
      throw new Error("We already wait for answer");

    return new Promise((resolve, reject) => {
      this.waiting[uid] = msg => {
        this.stopWaitAnswer(uid);
        resolve(msg);
      };
      this.reset[uid] = code => {
        this.stopWaitAnswer(uid);
        this.resolveUndefined
          ? resolve(undefined)
          : reject(code || new Error("Reject code not specified"));
      };
    });
  }

  //Принять ответ от uid.
  resolveAnswer(uid, msg) {
    if (!this.waiting[uid]) return false;

    this.waiting[uid](msg);
    return true;
  }

  //Сгенерировать исключение в обработчике ожидания.
  rejectAnswer(uid, code) {
    if (!this.reset[uid]) return false;

    this.reset[uid](code);
    return true;
  }

  //Установить обработчик команды
  command(command, handler) {
    this.commands[command] = handler;
  }

  //Установить обработчик текста не-команд.
  default(defaultHandler) {
    this.defaultHandler = defaultHandler;
  }

  setBotPrefix(prefix) {
    this.botPrefix = prefix;
  }

  handleText(uid, text, conversation, mentioned) {
    if (conversation && !mentioned)
      if (text.toLowerCase().startsWith(this.botPrefix))
        text = text.substring(this.botPrefix.length, text.length).trim();
      else return;

    const command = this.commands[text];

    if (!command && this.resolveAnswer(uid, text)) return;

    const dialog = this.makeDialog(uid, conversation, mentioned);

    if (command) command(dialog);
    else if (this.defaultHandler) this.defaultHandler(dialog, text);
  }

  makeDialog(uid, conversation, mentioned) {
    const bot = this;

    return {
      async input(text) {
        if (text) await this.output(text);
        return await bot.waitAnswer(uid);
      },
      async askOption(message, options) {
        await bot.showKeyboard(uid, message, options);
        return await bot.waitAnswer(uid);
      },
      async output(message, attachment) {
        await bot.sendMessage(uid, message, attachment);
      },

      reject(code) {
        return bot.rejectAnswer(uid, code);
      },
      async uploadFile(filePath) {
        return await bot.uploadFile(uid, filePath);
      },

      async custom(method, params) {
        return bot.customCommand(method, params);
      },

      getId() {
        return uid;
      },
      conversation,
      mentioned
    };
  }

  cleanCommands() {
    this.commands = {};
  }
}

module.exports = {
  Bot
};
