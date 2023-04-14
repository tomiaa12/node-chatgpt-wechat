import { WechatyBuilder } from "wechaty";
import http from "http";
import axios from "axios";

const apiKey = "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";
const model = "gpt-3.5-turbo";

const wechaty = WechatyBuilder.build();

const server = http.createServer();
server.listen(8888);

wechaty
  .on("scan", (qrcode, status) =>
    console.log(
      `二维码${status}: https://wechaty.js.org/qrcode/${encodeURIComponent(
        qrcode
      )}`
    )
  )
  .on("login", (user) => console.log(`用户名 ${user.name()} 登录成功`))
  .on("message", async (message) => {
    // 如果是群聊消息
    if (message.room()) {
      // const type = message.type();
      const msg = message.text().replace("@Tomiaa", "");
      const room = await message.room();
      const isMentioned = await message.mentionSelf();
      const contact = message.talker();
      const topic = await room.topic();
      // const includes = [""]

      if (isMentioned) {
        try {
          const res = await axios({
            method: "post",
            url: "https://api.openai.com/v1/chat/completions",
            headers: {
              Authorization: "Bearer " + apiKey,
              "Content-Type": "application/json",
            },
            data: JSON.stringify({
              model,
              messages: [{ role: "user", content: msg }],
            }),
            timeout: 0,
          });
          console.log(
            `群号: ${topic}, 用户名: ${contact.name()}, 消息: ${msg},回答: ${
              res.data.choices[0].message.content
            }`
          );
          room.say(`@${contact.name()} ${res.data.choices[0].message.content}`);
        } catch (e) {
          console.log("报错: ", e.message);
          room.say(`@${contact.name()} 报错了...`);
        }
      }
    }
  });
wechaty.start();
