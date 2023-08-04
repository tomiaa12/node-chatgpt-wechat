import { WechatyBuilder } from "wechaty";
import http from "http";
import axios from "axios";
import schedule from 'node-schedule';

axios.interceptors.response.use((res) => res.data);

// openAI key
const apiKey = "xxx";
// gpt 模型
const model = "gpt-3.5-turbo";

// 是否发送早报
const isSendMorningPaper = true;
// 发送早报的时间
const sendMorningPaperTime = "0 9 * * *"

// 查询 gpt 失败时回复的消息
const queryErrMsg = '出错了，再问我一次吧'

// 自动回复的群名，true 表示所有群都回复
// const replyRoomTopic = ['前后端开发交流群']
const replyRoomTopic = true

const wechaty = WechatyBuilder.build();

const server = http.createServer();
server.listen(8888);

const getMsg = async (msg, id, context) => {
  let text = "";
  
  const switchFun = {
    async '网易云热评'(){
      const  data  = await axios.get("https://v.api.aa1.cn/api/api-wenan-wangyiyunreping/index.php?aa1=text")
      text = data.replace(/<[^>]+>/g, '').replace('\n','')
    },
    async '一句'(){
      const  data  = await axios.get("https://cloud.qqshabi.cn/api/hitokoto/hitokoto.php")
      text = data
    },
    async '彩虹屁'(){
      const  data  = await axios.get("https://cloud.qqshabi.cn/api/rainbow/api.php")
      text = data.data
    },
    async '毒鸡汤'(){
      const  data  = await axios.get("https://cloud.qqshabi.cn/api/poison/api.php")
      text = data.data
    },
    async '舔狗日记'(){
      const  data  = await axios.get("https://v.api.aa1.cn/api/tiangou/")
      text = data.replace(/<[^>]+>/g, '').replace('\n','')
    },
    async '一言'(){
      const  data  = await axios.get("https://v1.hitokoto.cn?encode=json")
      text = `${data.hitokoto}\n—— ${data.from_who || ""}「${data.from || ""}」`
    },
    // '猜奥特曼'(){
      
    // },
    async default(){
      const data = await axios({
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
      text = data.choices[0].message.content;
    }
  }
  
  await (switchFun[msg] || switchFun.default)()

  return text;
};

let username = "";
wechaty
  .on("scan",async (qrcode, status) => 
    console.log(
      `二维码${status}: https://wechaty.js.org/qrcode/${encodeURIComponent(
        qrcode
      )}`
    )
  )
  .on("login", async(user) => {
    console.log(`用户名 ${(username = user.name() || "")} 登录成功`);

    if(isSendMorningPaper){
      schedule.scheduleJob(sendMorningPaperTime, async () => {
        console.log("定时任务触发");
        const rooms = await wechaty.Room.findAll({ topic: "前后端开发交流群" });
  
        if (rooms.length) {
          const data = await axios.get(
            "https://hub.onmicrosoft.cn/public/news?index=0&origin=zhihu"
          );
  
          await rooms.forEach(room => room.say(data.all_data.join("\n")));
        }
      });
    }
  })
  .on("message", async (message) => {
    // 如果是群聊消息
    if (message.room()) {
      const msg = message.text().replace(`@${username}`, "").trim();
      const room = await message.room();
      const isMentioned = await message.mentionSelf();
      const contact = message.talker();
      const topic = await room.topic();
      if(!(replyRoomTopic === true || replyRoomTopic.includes(topic))) return;
      
      if (!isMentioned) return
      
      try {
        const id = room.id
        const text = await getMsg(msg, id, room);
        console.log( "群号:" + topic + "用户名:" + contact.name() + "消息:" + msg + ",回答:" + text.replaceAll("\n","") );
        room.say(`@${contact.name()} ${text}`);
      } catch (e) {
        console.log("报错: ", e.message);
        room.say(`@${contact.name()} ${queryErrMsg}`);
      }

    } else if (message.text()) {
      // 文字消息
      const msg = message.text();
      const id = message.talker().id
      const text = await getMsg(msg, id, message);
      await message.say(text);
    }
  })
  .on("error", (error) => {
    console.error("error", error);
  })
  .start();
