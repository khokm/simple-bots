class Bot {
	constructor() {
		this.waiting = {};
		this.reset = {};
		this.commands = {};
	}

	//Прекратить ожидать ответ от uid.
	stopWaitAnswer(uid) {
		this.waiting[uid] = undefined;
		this.reset[uid] = undefined;
	}

	//Войти в режим оиждания ответа от uid.
	waitAnswer (uid) {
		if(this.waiting[uid])
			this.rejectAnswer(uid, new Error('We already wait for answer'));
		return new Promise((resolve, reject) => {
			this.waiting[uid] = (msg) => { this.stopWaitAnswer(uid); resolve(msg); };
			this.reset[uid] = (code) => {this.stopWaitAnswer(uid); reject(code)};
		});
	}

	//Принять ответ от uid.
	resolveAnswer(uid, msg) {
		if(!this.waiting[uid])
			return false;

		this.waiting[uid](msg);
		return true;
	}

	//Сгенерировать исключение в обработчике ожидания.
	rejectAnswer(uid, code) {
		if(!this.reset[uid])
			return false;

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

	makeDialog(uid) {

		const bot = this;

		return {
		 	async input (text) {
				if(text)
					await this.output(text);
				return await bot.waitAnswer(uid);
			},
			async askOption(message, options) {
				await bot.showKeyboard(uid, message, options);
				return await bot.waitAnswer(uid);
			},
			async output(message, attachment) {
				bot.sendMessage(uid, message, attachment)
			},

			reject(code) {
				return bot.rejectAnswer(uid, code);
			},
			async uploadFile (filePath){
				return await bot.uploadFile(uid, filePath);
			},

			async custom(method, params) {
				return bot.customCommand(method, params);
			},

			getId() {
				return uid;
			}
		};
	}

	cleanCommands() {
		this.commands = {};
	}
}

module.exports = Bot;
