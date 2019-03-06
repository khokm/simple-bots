const Promise = require('bluebird');
const request = Promise.promisifyAll(require('request'));
const fs = require('fs');

module.exports = {
	async sendVkFile (ctx, text, filePath, token) {
		let user_id = ctx.message.user_id;

		//1) Get upload_url
		var {statusCode, body} = await request.postAsync(
			`https://api.vk.com/method/docs.getMessagesUploadServer?&peer_id=${user_id}&v=5.92&access_token=${token}`,
			{ json: { key: 'value' } });

		if(statusCode != 200)
			return false;

		let url = body.response.upload_url;

		//2) Upload file to server
		const file_data = await new Promise(resolve => {
			request.post(url, (err, response, body) => {
				if(err || response.statusCode != 200)
					resolve(undefined);
				else
					resolve(JSON.parse(body).file);

			}).form().append('file', fs.createReadStream(filePath));
		});

		if(!file_data)
			return false;

		//3) Save file
		var {statusCode, body} = await request.postAsync(
			`https://api.vk.com/method/docs.save?&file=${file_data}&v=5.92&access_token=${token}`,
			{ json: { key: 'value' } });

		if(statusCode != 200)
			return false;

		let {owner_id, id} = body.response.doc;

		//4) Send file
		ctx.reply(text, `doc${owner_id}_${id}`)
		return true;
	}
}