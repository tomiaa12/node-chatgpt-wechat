import axios from "axios";
import { FileBox } from "file-box";
import sharp from "sharp";

// 运行中的群或私聊
export const runing = {};
// 上下文
const contextAll = {};

export const randomInteger = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const numberToLetter = (num) => String.fromCharCode("A".charCodeAt(0) + num);

const medal = ["🥇", "🥈", "🥉", "🏅", "🏅", "🏅", "🏅", "🏅", "🏅", "🏅"];

export const guessit = async ({
  name, // 游戏名称，唯一值
  list, // 文件 + 答案
  total, // 每次出题数量
  id, // 房间/用户 id
  message, // 消息对象
  wechaty, // 微信
  caseSensitive = true, // 大小写区分
  isPrompt = true, // 开启提示
  getFileBox, // 获取文件
  formatAnswer, // 答案公布格式化
  link, // 在线游玩
}) => {
  // 是否运行中
  if (runing[id]) return;

  // 初始化
  const context = (contextAll[name] ??= {});
  runing[id] = true;
  const temp = (context[id] = {
    index: -1,
    step: 0, // 当前步骤
    answerPersons: [], // 答对用户名列表
  });

  let timer1 = null,
    timer2 = null;
  let data
  const sendFileBox = async () => {
    let errNum = 0;
    const send = async (isErr) => {
      data = list[randomInteger(0, list.length - 1)];
      temp.answer = data.answer;
      if(!isErr) ++temp.step
      if (temp.step > total) {
        const room = message.room();
        if (!temp.answerPersons.length) {
          await message.say("😜游戏结束，一题都没有猜对！");
        } else {
          await message.say(
            room
              ? `游戏结束，现在公布成绩：\n${temp.answerPersons
                  .sort((a, b) => b.n - a.n)
                  .map(
                    (item, i) =>
                      `${medal[i]}第${i + 1}名：@${item.name}（猜对${
                        item.n
                      }个）`
                  )
                  .join("\n")}`
              : `游戏结束，猜对${temp.answerPersons[0].n}个`
          );
        }
        if(link)
        await message.say(`在线游玩${link}`);

        delete context[id];
        delete runing[id];
        wechaty.off("message", onMessage);
        return;
      }

      const path = Array.isArray(data.path)
        ? data.path[randomInteger(0, data.path.length)]
        : data.path;

      try {
        if (path) {
          let imageFileBox;
          if (/^http/.test(path)) {
            if (/\.webp$/.test(path)) {
              const data = await axios({
                url: path,
                responseType: "arraybuffer",
              });

              const buffer = await sharp(data).toFormat("png").toBuffer();

              imageFileBox = FileBox.fromBuffer(buffer, "1.png");
            } else {
              imageFileBox = FileBox.fromUrl(path);
            }
          } else {
            imageFileBox = FileBox.fromFile(path);
          }
          await message.say(imageFileBox);
          await message.say(`第${temp.step}题 ${data.topic || ""}`);
        } else if(getFileBox){
          await message.say(await getFileBox(data));
          await message.say(`第${temp.step}题 ${data.topic || ""}`);

        } else {
          await message.say(`第${temp.step}题 ${data.topic || ""}`);
          if (data.options?.length) {
            const randomList = data.options.sort(() => Math.random() - 0.5);
            const addLetter = randomList.map(
              (item, i) => `${numberToLetter(i)}. ${item}`
            );
            temp.optionsAnswer = numberToLetter(
              randomList.findIndex((i) => i === data.answer)
            );
            await message.say(addLetter.join("\n"));
          } else await message.say(data.desc);
        }
      } catch (e) {
        console.log("sendFileBox 报错", path, data);
        if (++errNum < 5) {
          await send(true);
        } else {
          delete context[id];
          delete runing[id];
        }
        return;
      }

      timer1 = setTimeout(async() => {
        const i = randomInteger(0, data.answer.length - 1);
        isPrompt &&
          await message.say(
            `⏳还剩 30 秒！\n提示：${data.answer.length > 1 ? data.answer
              .split("")
              .map((str, index) => (i === index ? str : "◼"))
              .join("") : ''}`
          );
        timer2 = setTimeout(async () => {
          delete temp.answer
          await message.say(`😜时间到！没人猜对。答案是${formatAnswer ? formatAnswer(data) : '「' + data.answer + '」' }`);
          await sendFileBox();
        }, 30000);
      }, 30000);
    };

    return await send();
  };

  await message.say(`开始${name}！一共${total}题！每题限时一分钟。`);
  await sendFileBox();

  const onMessage = async (message) => {
    let _id,
      msg,
      baseStr,
      name = message.talker().name();
    const room = message.room();

    if (room) {
      _id = room.id;
      baseStr = `@${name} `;
    } else if (message.text()) {
      _id = message.talker().id;
    }

    if (_id !== id) return;

    msg = message.text();
    let answer = temp.answer,
      optionsAnswer = temp.optionsAnswer;

    if (!caseSensitive) {
      msg = msg.toLowerCase();
      answer = answer.toLowerCase();
      optionsAnswer = optionsAnswer?.toLowerCase();
    }
    console.log(
      msg,
      "msg",
      answer,
      "answer",
      msg === answer || msg === optionsAnswer,
    );
    if (msg === answer || msg === optionsAnswer) {
      delete temp.optionsAnswer
      delete temp.answer
      clearTimeout(timer1);
      clearTimeout(timer2);
      await message.say(
        `${baseStr || ""}🎉恭喜猜对了！答案是${formatAnswer ? formatAnswer(data) : '「' + data.answer + '」' }。`
      );
      const origin = temp.answerPersons.find((i) => i.name === name);

      if (origin) origin.n++;
      else temp.answerPersons.push({ name, n: 1 });

      await sendFileBox();
    }
  };

  wechaty.on("message", onMessage);
};
