const easyvk = require('easyvk');
const Bot = require('./bot');

class VkBot extends Bot {
	async showKeyboard(peer_id, message, options) {
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

		await this.customCommand('messages.send', {
			peer_id,
			message,
			keyboard
		});
	}

	async sendMessage(peer_id, message, attachment){
	if(attachment instanceof Array)
		attachment = attachment.map(el => el.toString()).join(',');
		this.customCommand('messages.send', {
			peer_id,
			message,
			attachment
		});
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

		this.customCommand = async (command, params) => (await vk.call(command, params)).vkr[0];

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
