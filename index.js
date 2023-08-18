import { WechatyBuilder } from "wechaty";
import axios from "axios";
import schedule from 'node-schedule';
import ultraman from "./src/ultraman.js";
import { OpenAIStream } from "./src/openAIStream.js";
import { guessit, runing } from './src/guessit.js'
import { FileBox } from 'file-box';

/* ----------------  配置  ---------------- */

// openAI key
const apiKey = "";
// gpt 模型, gpt3: gpt-3.5-turbo, gpt4: gpt-4-0613
const model = "gpt-4-0613";
// 接口请求地址
const openAiUrl = 'https://api.openai.com/v1/chat/completions'
// 保留对话上下文的消息数量，群消息问题是共享的，A提问，与B提问是在一个上下文中
const maxMsgLength = 3;


// 是否发送早报
const isSendMorningPaper = true;
// 发送早报的时间
const sendMorningPaperTime = "0 9 * * *"
// 要发送早报的群聊
const sendMorningPaperToptics = ['回宁远种田', '前后端开发交流群', '前后端开发交流群1群', '开发交流群2群', '马飞测试', '又是被摩擦的一天']

// 查询 gpt 失败时回复的消息
const queryErrMsg = '出错了，再问我一次吧'

// 自动回复的群名，true 表示所有群都回复
const replyRoomTopic = sendMorningPaperToptics
// const replyRoomTopic = true

// 每次看图猜奥特曼出题数量
const ultramanNum = 5

/* ----------------  配置 END  ---------------- */

const wechaty = WechatyBuilder.build();

axios.interceptors.response.use((res) => res.data);

// 对话上下文
const msgContext = {}

// 奥特曼上下文
const ultramanContext = {}


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

      await guessit({
        name: '看图猜奥特曼',
        list: ultraman,
        total: ultramanNum,
        id,
        message,
        wechaty
      })
      
    },
    async default(){
      let messages = msgContext[id] || []
      if(maxMsgLength) {
        messages.push({ role: "user", content: msg })
        messages.length > maxMsgLength && messages.shift()
      }
      const prompt = [
        {
          role: "system",
          content: `用中文回答,回答的精简一些,当前时间${Date.now()}`
        },
        ...messages
      ]

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
      const stream = await OpenAIStream(openAiUrl, prompt, apiKey, model)

      const reader = stream.getReader();
      let content = ''
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += value
      }
      messages.push({ role: 'assistant', content })
      
      messages.length > maxMsgLength && messages.shift()
      msgContext[id] = messages

      text = content;
      /* 数据流 --- end */
    }
  }

  const baseStrTrigger = {
    async '画图'(){
      const query = msg.replace(/^画图/,'')
      const { data } = await axios.post("https://www.ai-yuxin.space/fastapi/api/translate", {
        query,
        from_lang: "auto",
        to_lang: "en",
      });

      const d = await axios.post(
        "https://www.ai-yuxin.space/fastapi/api/painting/stable_diffusion",
        {
          user_id: "163487",
          token: "72EjYpmr7Hd02b5d",
          prompt: data,
          negative_prompt: "",
          width: 512,
          height: 512,
          number: 1,
          cfg: 7,
          mode: "toonyou_beta6",
          method: "Euler a",
          steps: 25,
          seed: -1,
          facial_restoration: false,
          image: "0",
          denoising_strength: 0,
        }
      );
      
      const url = `https://www.ai-yuxin.space/${d.data[0]}`
      const imageFileBox = FileBox.fromUrl(url);
      await message.say(imageFileBox)

    }
  }

  const triggerFun = baseStrTrigger[Object.keys(baseStrTrigger).find(i => new RegExp(`^${i}`).test(msg))]
  
  await (switchFun[msg] || triggerFun || switchFun.default)()

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

    schedule.scheduleJob(sendMorningPaperTime, async () => {
      if(isSendMorningPaper){
        console.log("定时任务触发");
        const rooms = await wechaty.Room.findAll({ topic: new RegExp(`^${sendMorningPaperToptics.join('|')}$`) });

        if (rooms.length) {
          const data = await axios.get(
            "https://hub.onmicrosoft.cn/public/news?index=0&origin=zhihu"
          );

          await rooms.forEach(room => room.say(data.all_data.join("\n")));
        }
      }
    });
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
        if(runing[id]) return
        console.log(`[${topic}] ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} ${contact.name()}:${msg}` )
        const text = await getMsg(msg, id, message);
        console.log( `[${topic}]@${contact.name()} ${text.replaceAll("\n","")}` );
        text && room.say(`@${contact.name()} ${text}`);
      } catch (e) {
        console.log("报错: ", e.message);
        room.say(`@${contact.name()} ${queryErrMsg}`);
      }

    } else if (message.text()) {
      // 文字消息
      const msg = message.text();
     
      const id = message.talker().id

      if(runing[id]) return

      const text = await getMsg(msg, id, message);
      text && await message.say(text);
    }
  })
  .on("error", (error) => {
    console.error("error", error);
  })
  .start();
