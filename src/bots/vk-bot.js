const { Bot } = require("./bot");
const easyvk = require("easyvk");
const fs = require("fs");
const path = require("path");

class VkBot extends Bot {
  async showKeyboard(peer_id, message, options) {
    if (options[0].constructor !== Array) options = [options];

    const buttons = options.map(opts =>
      opts.map(opt => ({
        action: {
          type: "text",
          // "payload": "{\"button\": \"1\"}",
          label: opt.label || opt
        },
        color: opt.color || "default"
      }))
    );

    const keyboard = JSON.stringify({ one_time: true, buttons });

    await this.customCommand("messages.send", {
      peer_id,
      message,
      keyboard,
      random_id: easyvk.randomId()
    });
  }

  async sendMessage(peer_id, message, attachment) {
    if (attachment instanceof Array)
      attachment = attachment.map(el => el.toString()).join(",");
    await this.customCommand("messages.send", {
      peer_id,
      message,
      attachment,
      random_id: easyvk.randomId()
    });
  }

  async vk_long_poll(group_id, access_token, v_api = 5.8) {
    const vk = await easyvk({
      access_token,
      authType: easyvk.GROUP_AUTH_TYPE
    });

    const connection = await vk.bots.longpoll.connect({
      forGetLongPollServer: {
        group_id
      },
      forLongPollServer: {
        wait: "15"
      }
    });

    this.customCommand = async (cmd, params) => await vk.post(cmd, params);

    this.uploadFile = async (peer_id, filePath) => {
      const realpath = path.resolve(filePath);
      if (!fs.existsSync(realpath))
        throw Error(`Файл ${realpath} не существует`);
      const url = await vk.uploader.getUploadURL(
        "docs.getMessagesUploadServer",
        { peer_id },
        false
      );
      const { file } = await vk.uploader.uploadFile(url, realpath, "file", {});
      const [{ id, owner_id }] = await this.customCommand("docs.save", {
        file
      });
      return `doc${owner_id}_${id}`;
    };

    connection.on("error", async () => {
      connection.close();
      await vk_this.long_poll(group_id, access_token, v_api);
      console.log("Реконнект в " + new Date());
    });
    connection.on("failure", err => console.error(err));
    connection.on("reconnectError", err => console.error(err));

    connection.on("message_new", msg => {
      let peer_id,
        text,
        conversation = false,
        mentioned = false;

      if (v_api >= 5.8) {
        peer_id = msg.peer_id;
        text = msg.text;
        conversation = peer_id != msg.from_id;
      } else {
        peer_id = msg.user_id;
        text = msg.body;
      }

      if (conversation) {
        mentioned = text.match(/\[.*\](.*)/);
        text = mentioned ? mentioned[1].trim() : text;
      }

      this.handleText(peer_id, text, conversation, mentioned ? true : false);
    });

    // connection.debug(({type, data}) => {
    // 	console.log(type, data)
    // })
  }
}

module.exports = {
  VkBot
};
