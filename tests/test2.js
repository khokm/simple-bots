const { VkBot } = require("..");
const { readFileSync } = require("fs");

(async function() {
  console.log(VkBot);
  const { group_id, token } = JSON.parse(readFileSync("tests/data.json"));
  const v_api = 5.8; //Версия Long-Poll API.

  const bot = new VkBot({ resolveUndefined: true });

  //Объявляем команду
  bot.command("/reset", async dialog => {
    //Сбрасываем ожидание ответа от пользователя.
    if (!dialog.reject())
      dialog.output(`Используется только при ожидании ответа`);
  });

  bot.command("/hello", async dialog => {
    //Ожидаем ответа от пользователя.
    const answer = await dialog.input("Введите что нибудь");
    if (answer !== undefined) dialog.output("Вы ввели: " + answer);
  });

  //Если бот не определил команду, он использует обработчик по умолчанию.
  bot.default(async (dialog, text) => {
    await dialog.output(`Я не знаю, что такое ${text}`);

    //Кнопки будут в два ряда, т.е:
    //  Первая кнопка  | другая кнопка
    //           Третья кнопка
    //
    const btns = [
      [{ label: "Первая кнопка", color: "primary" }, "другая кнопка"],
      [{ label: "Третья кнопка", color: "positive" }]
    ];

    const answer = await dialog.askOption("Выбери кнопку", btns);

    if (answer === undefined) return;

    if (
      btns.some(rows =>
        rows.some(btn => btn === answer || btn.label === answer)
      )
    )
      dialog.output(`Спасибо, что выбрали ${answer}`);
    else dialog.output(`Нет варианта ${answer}`);
  });

  await bot.vk_long_poll(group_id, token, v_api);
  console.log(`Бот запущен в ${new Date()}`);
})();
