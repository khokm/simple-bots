const easyvk = require('easyvk');

class VkBot {
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

	makeDialog(peer_id) {

		const parent = this;

		return {
		 	async input (text) {
				if(text)
					await this.output(text);
				return await parent.waitAnswer(peer_id);
			},
			async askOption(message, options) {

				if(options[0].constructor !== Array)
					options = [options];

				const buttons = options.map(opts =>
					opts.map(opt => { return {
						"action": {
				          "type": "text",
				          // "payload": "{\"button\": \"1\"}",
				          "label": opt.label || opt
				        },
				        "color": opt.color || "default"
					}})
				);

				const keyboard = JSON.stringify({"one_time": true, buttons});

				await parent.sendMessage({
					peer_id,
					message,
					keyboard
	  			});

				return await parent.waitAnswer(peer_id);
			},
			async output(message, attachment) {
				if(attachment instanceof Array)
					attachment = attachment.map(el => el.toString()).join(',');
				await parent.sendMessage({
					peer_id,
					message,
					attachment
	  			});
			},

			reject(code) {
				return parent.rejectAnswer(peer_id, code);
			},
			async uploadFile (filePath){
				return await parent.uploadFile(peer_id, filePath);
			},

			async custom(method, params) {
				const {vkr} = await parent.customCommand(method, params);
				return vkr[0];
			},

			getId() {
				return peer_id;
			}
		};
	}

	cleanCommands() {
		this.commands = {};
	}

	async long_poll(group_id, access_token, v_api = 5.80) {
		const vk = await easyvk({access_token});

		const {connection} = await vk.bots.longpoll.connect({
			forGetLongPollServer: {
				group_id
			},
			forLongPollServer: {
				wait: "15" 
			} 
		});

		this.sendMessage = (msg) => vk.post('messages.send', msg);
		this.customCommand = (command, params) => vk.call(command, params);

		this.uploadFile = async (peer_id, filePath) => {
			const {url} = await vk.uploader.getUploadURL('docs.getMessagesUploadServer',
				{peer_id}, false);
		  	const {vkr} = await vk.uploader.uploadFile(url, filePath, 'file', {});
	  		const fileData = await vk.call('docs.save', {file:vkr.response.file});
		  	const {id, owner_id} = fileData.vkr[0];
		  	return `doc${owner_id}_${id}`;
		};

		connection.on('message_new', (msg) => {

			let peer_id, text;

			if(v_api >= 5.80) {
				peer_id = msg.peer_id;
				text = msg.text;
			}
			else {
				peer_id = msg.user_id;
				text = msg.body;
			}

			const command = this.commands[text];

			if(!command && this.resolveAnswer(peer_id, text))
				return;

			const dialog = this.makeDialog(peer_id);

			if(command)
				command(dialog);
			else if(this.defaultHandler)
				this.defaultHandler(dialog, text);
		});

		// connection.debug(({type, data}) => {
		// 	console.log(type, data)
		// })
	}
}

module.exports = VkBot;
