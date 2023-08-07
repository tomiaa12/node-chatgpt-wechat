import { WechatyBuilder } from "wechaty";
import http from "http";
import axios from "axios";
import schedule from 'node-schedule';
import { FileBox } from 'file-box';
import ultraman from "./ultraman.js";

/* ----------------  配置  ---------------- */

// openAI key
const apiKey = "";
// gpt 模型
const model = "gpt-3.5-turbo";
// 保留对话上下文的消息数量，群消息问题是共享的，A提问，与B提问是在一个上下文中
const maxMsgLength = 6;


// 是否发送早报
const isSendMorningPaper = true;
// 发送早报的时间
const sendMorningPaperTime = "0 9 * * *"
// 要发送早报的群聊
const sendMorningPaperToptics = ['回宁远种田', '前后端开发交流群', /* '前后端开发交流群1群', '开发交流群2群' */, '马飞测试']

// 查询 gpt 失败时回复的消息
const queryErrMsg = '出错了，再问我一次吧'

// 自动回复的群名，true 表示所有群都回复
// const replyRoomTopic = ['前后端开发交流群']
const replyRoomTopic = true

// 每次看图猜奥特曼出题数量
const ultramanNum = 3

/* ----------------  配置 END  ---------------- */

const wechaty = WechatyBuilder.build();

// const server = http.createServer();
// server.listen(8888);

axios.interceptors.response.use((res) => res.data);

// 对话上下文
const msgContext = {}

// 奥特曼上下文
const ultramanContext = {}

const randomInteger = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const getMsg = async (msg, id, message) => {
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
    async '猜奥特曼'(){
      text = ''

      if (ultramanContext[id]?.runing) return

      // 初始化
      const temp = ultramanContext[id] = {
        runing: true,
        index: -1,
        step: 0,
        answerPersons: [],
      };

      
      const oldIndex = []
      const random = () => {
        const temp = randomInteger(0, ultraman.length - 1)
        if(oldIndex.includes(temp)) return random()

        oldIndex.push(temp)
        return temp
      }

      let timer1 = null, timer2 = null;
      
      const sendFileBox = async () => {
        temp.step++
        if(temp.step > ultramanNum) {
          const room = await message.room()
          if(!temp.answerPersons.length) {
            await message.say(room ? `😜游戏结束，没人猜对！` : '😜游戏结束，一题都没有猜对！')
          }else{
            room ? await message.say(`游戏结束，现在公布成绩：\n${temp.answerPersons.sort((a,b) => b.n - a.n).map((item,i) => `🏅第${i+1}名：@${item.name}（猜对${item.n}个）`).join('\n')}`) : await message.say(`游戏结束，猜对${temp.answerPersons[0].n}个`)
          }
          delete ultramanContext[id]
          wechaty.off('message', onMessage)
          return
        }
        temp.index = random()
        await message.say(`第${temp.step}题，每题限时一分钟`)
        const data = ultraman[temp.index]
        const path = data.path;
        const imageFileBox = FileBox.fromFile(path);
        await message.say(imageFileBox)
        timer1 = setTimeout(() => {
          const i = randomInteger(0, data.name.length - 1)
          message.say(`⏳还剩 30 秒！\n提示：${data.name.split('').map((str, index) => i === index ? str : '◼').join('')}`)
          timer2 = setTimeout(async () => {
            await message.say(`😜时间到！没人猜对。答案是「${ data.name }」。`)
            await sendFileBox()
          }, 30000)
        },30000)

      }
      
      await message.say(`开始看图猜奥特曼！一共${ultramanNum}题！`)
      await sendFileBox()
      let disabled = false;

      const onMessage = async (message) => {
        if(disabled) return;
        let _id, msg, baseStr, name = message.talker().name();
        const room = await message.room();

        if (room) {
          _id = room.id
          baseStr = `@${name} `
        } else if (message.text()) {
          _id = message.talker().id
        }

        if(_id !== id) return;
        
        msg = message.text();

        if(msg === ultraman[temp.index].name) {
          disabled = true;
          clearTimeout(timer1)
          clearTimeout(timer2)
          await message.say(`${baseStr || ''}🎉恭喜猜对了！答案是「${ultraman[temp.index].name}」。`);
          const origin = temp.answerPersons.find(i => i.name === name)
          if(origin){
            origin.n++
          }else{
            temp.answerPersons.push({ name, n: 1 })
          }
          disabled = false;
          await sendFileBox()
        }
      }

      wechaty.on('message', onMessage)

    },
    async default(){
      let messages = msgContext[id] || []
      if(maxMsgLength) {
        messages.push({ role: "user", content: msg })
        messages.length > maxMsgLength && messages.shift()
      }

      const data = await axios({
        method: "post",
        // url: "https://api.openai.com/v1/chat/completions",
        url: "https://api.openai-sb.com/v1/chat/completions",
        headers: {
          Authorization: "Bearer " + apiKey,
          "Content-Type": "application/json",
        },
        data: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "请用中文回答，尽可能回答的精简一些"
            },
            ...messages
          ]
        }),
        timeout: 0,
      });

      messages.push(data.choices[0].message)
      messages.length > maxMsgLength && messages.shift()
      msgContext[id] = messages

      text = data.choices[0].message.content;
    }
  }
  
  await (switchFun[msg] || switchFun.default)()

  return text;
};

wechaty
  .on("scan",async (qrcode, status) => 
    console.log(
      `二维码${status}: https://wechaty.js.org/qrcode/${encodeURIComponent(
        qrcode
      )}`
    )
  )
  .on("login", async(user) => {
    console.log(`账号:${(user.name() || "")} 登录成功`);

    if(isSendMorningPaper){
      schedule.scheduleJob(sendMorningPaperTime, async () => {
        console.log("定时任务触发");
        const rooms = await wechaty.Room.findAll({ topic: new RegExp(`^${sendMorningPaperToptics.join('|')}$`) });
  
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
      const msg = await message.mentionText()
      const room = await message.room();
      const isMentioned = await message.mentionSelf();
      const contact = message.talker();
      const topic = await room.topic();
      if(!(replyRoomTopic === true || replyRoomTopic.includes(topic))) return;
      
      if (!isMentioned) return
      
      try {
        const id = room.id
        if(ultramanContext[id]?.runing) return
        console.log( "群号:" + topic, 'id', id )
        const text = await getMsg(msg, id, message);
        console.log( "群号:" + topic + "用户名:" + contact.name() + "消息:" + msg + ",回答:" + text.replaceAll("\n","") );
        text && room.say(`@${contact.name()} ${text}`);
      } catch (e) {
        console.log("报错: ", e.message);
        room.say(`@${contact.name()} ${queryErrMsg}`);
      }

    } else if (message.text()) {
      // 文字消息
      const msg = message.text();
     
      const id = message.talker().id

      if(ultramanContext[id]?.runing) return

      const text = await getMsg(msg, id, message);
      text && await message.say(text);
    }
  })
  .on("error", (error) => {
    console.error("error", error);
  })
  .start();
