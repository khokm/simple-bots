const VkApi = require('node-vk-bot-api');
const Markup = require('node-vk-bot-api/lib/markup');
const {sendVkFile} = require('./send_vk_file');
const {formatMsg} = require('../helpers');

class VkBot {
	constructor(token) {
		this.waiting = {};
		this.reset = {};
		this.token = token;

		this.bot = new VkApi(token);
	}

	//Прекратить ожидать ответ от uid.
	stopWaitAnswer(uid) {
		this.waiting[uid] = undefined;
		this.reset[uid] = undefined;
	}

	//Войти в режим оиждания ответа от uid.
	waitAnswer (uid) {
		return new Promise((resolve, reject) => {
			this.waiting[uid] = (msg) => { this.stopWaitAnswer(uid); resolve(msg); };
			this.reset[uid] = (code) => {this.stopWaitAnswer(uid); reject(code || 'reset')};
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
		this.bot.command(command, (ctx) => {
 			handler(this.makeDialog(ctx));
		});
	}

	//Установить обработчик текста не-команд.
	default(defaultHandler) {
		this.bot.on(ctx => {
			const uid = ctx.message.user_id;
			const msg = ctx.message.body;

			//Если мы не в режиме ожидания ответа, то передаем текст обработчику по-умолчанию.
			if(!this.resolveAnswer(uid, msg))
				defaultHandler(this.makeDialog(ctx), msg);
		});
	}

	makeDialog(ctx) {
		const parent = this;
		const uid = ctx.message.user_id;

		return {
			 async input (text) {
				if(text)
					ctx.reply("Введи: " + text);
				return await parent.waitAnswer(uid);
			},
			async askOption(text, options) {
				ctx.reply('Выбери: ' + text, null,
					Markup.keyboard(options).oneTime());
				return await parent.waitAnswer(uid);
			},
			output(text, doc) {
				ctx.reply(text, doc);
			},
			message(code, args) {
				ctx.reply(formatMsg(parent.messages, code, args));
			},

			reject(code) {
				return parent.rejectAnswer(uid, code);
			},
			async sendFile(text, filePath) {
				return await sendVkFile(ctx, text, filePath, parent.token);
			},
			getId() {
				return uid;
			},
			_token() {
				return parent.token;
			}
		};
	}

	setMessages(messages) {
		this.messages = messages;
	}

	cleanCommands() {
		this.bot.middlewares = [];
	}

	run() {
		this.bot.startPolling();
	}
}

module.exports = VkBot;