import { WechatyBuilder } from "wechaty";
import schedule from "node-schedule";
import ultraman from "./src/ultraman.js";
import jsQuestion from "./src/jsQuestion.js";
import movie from "./src/movie.js";
import { OpenAIStream } from "./src/openAIStream.js";
import { guessit, runing } from "./src/guessit.js";
import twoDimension from "./src/twoDimension.js";
import { FileBox } from "file-box";
import lol from "../lol-voice-skin/data.json" assert { type: "json" };
import { musicList, getFileBox, init } from "./src/cloudMusic.js";
import {
  openAiUrl,
  morningPaper,
  cloudmusicComment,
  hitokoto,
  rainbow,
  sentence,
  tiangou,
  poison,
  translate,
  draw,
} from "./src/api/index.js";
import dayjs from "dayjs";
/* ----------------  配置  ---------------- */

// openAI key
const apiKey = "";
// gpt 模型, gpt3: gpt-3.5-turbo, gpt4: gpt-4-0613
const model = "gpt-3.5-turbo";

// 保留对话上下文的消息数量，群消息问题是共享的，A提问，与B提问是在一个上下文中
const maxMsgLength = 3;

// 是否发送早报
const isSendMorningPaper = true;
// 发送早报的时间
const sendMorningPaperTime = "0 9 * * *";
// 要发送早报的群聊
const sendMorningPaperToptics = ["回宁远种田", "开发交流群"];

// 查询 gpt 失败时回复的消息
const queryErrMsg = "出错了，再问我一次吧";

// 自动回复的群名，true 表示所有群都回复
const replyRoomTopic = [
  "开发交流群",
  "回宁远种田",
  "马飞测试",
  "又是被摩擦的一天",
];
// const replyRoomTopic = true

// 每次看图猜奥特曼出题数量
const ultramanNum = 5;

// 每人每天私聊的次数
const privateChatNum = 4;
// 私聊次数限制统计
const privateChatStatic = {};

/* ----------------  配置 END  ---------------- */

const Functions = [
  "早报",
  "一句",
  "一言",
  "彩虹屁",
  "毒鸡汤",
  "入群测验",
  "舔狗日记",
  "网易云热评",
  "猜奥特曼",
  "猜电影",
  "猜歌名/猜歌曲/猜音乐",
  "猜LOL/猜英雄联盟",
  "二次元浓度测试",
  "画图 + 空格 + 内容",
  "翻译 + 空格 + 文字",
];

const wechaty = WechatyBuilder.build();

// 对话上下文
const msgContext = {};

let isCloudMusicInit = false;

const getMsg = async (msg, id, message) => {
  let text = "";
  const guessitLOL = async () => {
    text = "";
    await guessit({
      name: "看图、听音猜LOL英雄",
      list: lol,
      total: ultramanNum,
      id,
      message,
      wechaty,
      link: "https://kuangyx.cn/docs/%E5%9C%A8%E7%BA%BF%E5%BA%94%E7%94%A8/%E5%B0%8F%E6%B8%B8%E6%88%8F/%E7%8C%9C%E8%8B%B1%E9%9B%84%E8%81%94%E7%9B%9F.html",
    });
  };

  const guessitMusic = async () => {
    text = "";
    if (!isCloudMusicInit) {
      await init();
      isCloudMusicInit = true;
    }
    await guessit({
      name: "听音猜歌名",
      list: musicList,
      total: ultramanNum,
      id,
      message,
      wechaty,
      caseSensitive: false,
      getFileBox,
      formatAnswer: ({ answer, singer }) => `《${answer}》 -- ${singer}`,
      link: "https://kuangyx.cn/docs/%E5%9C%A8%E7%BA%BF%E5%BA%94%E7%94%A8/%E5%B0%8F%E6%B8%B8%E6%88%8F/%E7%8C%9C%E9%9F%B3%E4%B9%90.html",
    });
  };
  const switchFun = {
    async 网易云热评() {
      const data = await cloudmusicComment();
      text = data;
    },
    async 一句() {
      const data = await sentence();
      text = data;
    },
    async 早报() {
      const data = await morningPaper(true);
      text = data;
    },
    async 彩虹屁() {
      const data = await rainbow();
      text = data;
    },
    async 毒鸡汤() {
      const data = await poison();
      text = data;
    },
    async 舔狗日记() {
      const data = await tiangou();
      text = data;
    },
    async 一言() {
      const data = await hitokoto();
      text = data;
    },
    async 猜奥特曼() {
      text = "";

      await guessit({
        name: "看图猜奥特曼",
        list: ultraman,
        total: ultramanNum,
        id,
        message,
        wechaty,
        link: "https://kuangyx.cn/docs/%E5%9C%A8%E7%BA%BF%E5%BA%94%E7%94%A8/%E5%B0%8F%E6%B8%B8%E6%88%8F/%E7%8C%9C%E5%A5%A5%E7%89%B9%E6%9B%BC.html",
      });
    },
    猜英雄联盟: guessitLOL,
    猜LOL: guessitLOL,
    猜lol: guessitLOL,
    猜歌名: guessitMusic,
    猜音乐: guessitMusic,
    猜歌曲: guessitMusic,
    async 猜电影() {
      text = "";
      await guessit({
        name: "看图猜电影",
        list: movie,
        total: ultramanNum,
        id,
        message,
        wechaty,
        link: "https://kuangyx.cn/docs/%E5%9C%A8%E7%BA%BF%E5%BA%94%E7%94%A8/%E5%B0%8F%E6%B8%B8%E6%88%8F/%E7%8C%9C%E7%94%B5%E5%BD%B1.html",
      });
    },
    async 二次元浓度测试() {
      text = "";
      await guessit({
        name: "二次元浓度测试",
        list: twoDimension,
        total: ultramanNum,
        id,
        message,
        wechaty,
        isPrompt: false,
        caseSensitive: false,
        link: "https://kuangyx.cn/docs/%E5%9C%A8%E7%BA%BF%E5%BA%94%E7%94%A8/%E5%B0%8F%E6%B8%B8%E6%88%8F/%E4%BA%8C%E6%AC%A1%E5%85%83%E6%B5%93%E5%BA%A6%E6%B5%8B%E8%AF%95.html",
      });
    },
    async 入群测验() {
      text = "";
      await guessit({
        name: "入群测验",
        list: jsQuestion,
        total: ultramanNum,
        id,
        message,
        wechaty,
        caseSensitive: false,
        isPrompt: false,
        link: "https://kuangyx.cn/docs/%E5%9C%A8%E7%BA%BF%E5%BA%94%E7%94%A8/%E5%B0%8F%E6%B8%B8%E6%88%8F/js%E9%97%AE%E9%A2%98%E6%B5%8B%E9%AA%8C.html",
      });
    },
    async 功能() {
      text = Functions.join("\n");
    },
    async default() {
      let messages = msgContext[id] || [];
      if (maxMsgLength) {
        messages.push({ role: "user", content: msg });
        messages.length > maxMsgLength && messages.shift();
      }
      const prompt = [
        {
          role: "system",
          content: `用中文回答,回答的精简一些,当前时间${dayjs().format(
            "YYYY-MM-DD HH:mm:ss"
          )}`,
        },
        ...messages,
      ];

      /* 全量 */
      // const data = await axios({
      //   method: "post",
      //   url: openAiUrl,
      //   headers: {
      //     Authorization: "Bearer " + apiKey,
      //     "Content-Type": "application/json",
      //   },
      //   data: JSON.stringify({
      //     model,
      //     messages: prompt
      //   }),
      //   timeout: 0,
      // });

      // messages.push(data.choices[0].message)
      // messages.length > maxMsgLength && messages.shift()
      // msgContext[id] = messages

      // text = data.choices[0].message.content;

      /* 全量 --- end */

      /* 数据流 */
      const stream = await OpenAIStream(openAiUrl, prompt, apiKey, model);

      const reader = stream.getReader();
      let content = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += value;
      }
      messages.push({ role: "assistant", content });

      messages.length > maxMsgLength && messages.shift();
      msgContext[id] = messages;

      text = content;
      /* 数据流 --- end */
    },
  };

  const baseStrTrigger = {
    async 画图() {
      text = "";
      const query = msg.replace(/^画图/, "");
      const url = await draw(query);
      const imageFileBox = FileBox.fromUrl(url);
      await message.say(imageFileBox);
    },
    async 猜() {
      const temp = Object.keys(switchFun);
      if (!temp.includes(msg)) {
        text = `没有找到${msg}，你可以@我+下列关键词：\n${Functions.join(
          "\n"
        )}`;
      }
    },
    async 翻译() {
      text = "";
      const query = msg.replace(/^翻译/, "");
      const { data } = await translate(query);
      text = data;
    },
  };

  const triggerFun =
    baseStrTrigger[
      Object.keys(baseStrTrigger).find((i) => new RegExp(`^${i}`).test(msg))
    ];

  await (switchFun[msg] || triggerFun || switchFun.default)();

  return text;
};

wechaty
  .on("scan", async (qrcode, status) =>
    console.log(
      `二维码${status}: https://wechaty.js.org/qrcode/${encodeURIComponent(
        qrcode
      )}`
    )
  )
  .on("login", async (user) => {
    console.log(`账号:${user.name() || ""} 登录成功`);

    schedule.scheduleJob(sendMorningPaperTime, async () => {
      if (isSendMorningPaper) {
        console.log("定时任务触发");
        const rooms = await wechaty.Room.findAll({
          topic: new RegExp(`^${sendMorningPaperToptics.join("|")}$`),
        });

        if (rooms.length) {
          const text = await morningPaper();
          text && (await rooms.forEach((room) => room.say(text)));
        }
      }
    });
  })
  .on("message", async (message) => {
    const sendQr = async () => {
      const imageFileBox = FileBox.fromUrl("https://kuangyx.cn/img/wxq1.png");
      await message.say(imageFileBox);
      if (message.room()) {
        const contact = message.talker();
        await message.say(`@${contact.name()} 进群回复`);
      } else if (message.text()) {
        await message.say(`群内回复`);
      }
    };

    // 如果是群聊消息
    if (message.room()) {
      const msg = await message.mentionText();
      const room = await message.room();
      const isMentioned = await message.mentionSelf();
      const contact = message.talker();
      const topic = await room.topic();
      if (!(replyRoomTopic === true || replyRoomTopic.includes(topic))) {
        if (isMentioned) {
          await sendQr();
        }
        return;
      }

      if (!isMentioned) {
        return;
      }

      try {
        const id = room.id;
        if (runing[id]) return;
        console.log(
          `[${topic}] ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} ${contact.name()}:${msg}`
        );
        const text = await getMsg(msg, id, message);
        console.log(
          `[${topic}]@${contact.name()} ${text.replaceAll("\n", "")}`
        );
        text && room.say(`@${contact.name()} ${text}`);
      } catch (e) {
        console.log("报错: ", e.message);
        room.say(`@${contact.name()} ${queryErrMsg}`);
      }
    } else if (message.text() && message.type() === wechaty.Message.Type.Text) {
      const contact = message.from()
      console.log(
        `[${contact.name()}]: ${message.text()}`
      );
      await sendQr();
    }

    //  else if (message.text()) {
    //   const id = message.talker().id;
    //   privateChatStatic[id] ??= 0;
    //   if (privateChatStatic[id] > privateChatNum) {
    //     message.say("私聊次数超限，仅支持群内提问或等待第二天9点刷新");
    //     return;
    //   }

    //   // 文字消息
    //   const msg = message.text();

    //   if (runing[id]) return;

    //   const text = await getMsg(msg, id, message);
    //   text && (await message.say(text));
    // }
  })
  .on("error", (error) => {
    console.error("error", error);
  })
  .start();
