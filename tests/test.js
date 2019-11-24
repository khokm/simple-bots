const { VkBot } = require("..");
const { readFileSync } = require("fs");

(async function() {
  const { group_id, token } = JSON.parse(readFileSync("tests/data.json"));
  const v_api = 5.8; //Версия Long-Poll API.

  const bot = new VkBot();

  bot.default(async (dialog, text) => {
    const answer = await dialog.input("Введите что нибудь");
    dialog.output(`Вы написали ${text}, а ответили ${answer}`);
  });

  await bot.vk_long_poll(group_id, token, v_api);
  console.log(`Бот запущен в ${new Date()}`);
})();
