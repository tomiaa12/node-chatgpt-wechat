import axios from 'axios';
import { FileBox } from 'file-box';
import sharp from "sharp";

// 运行中的群或私聊
export const runing = {}
// 上下文
const contextAll = {}

const randomInteger = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

export const guessit = async ({
  name, // 游戏名称，唯一值
  list, // 文件 + 答案
  total, // 每次出题数量
  id, // 房间/用户 id
  message, // 消息对象
  wechaty, // 微信
  caseSensitive = true, // 大小写区分
  isPrompt = true, // 开启提示
}) => {

  // 是否运行中
  if (runing[id]) return

  // 初始化
  const context = contextAll[name] ??= {}
  runing[id] = true
  const temp = context[id] = {
    index: -1,
    step: 0, // 当前步骤
    answerPersons: [], // 答对用户名列表
  };

  // oldIndex 随机过的不在加入随机位
  // const oldIndex = []
  const random = (n = 0) => {
    const temp = randomInteger(0, list.length - 1)
    // if(n < 5 && oldIndex.includes(temp)) return random(n++)

    // oldIndex.push(temp)
    return temp
  }

  let timer1 = null, timer2 = null;
  
  const sendFileBox = async () => {
    temp.step++
    let errNum = 0
    const send = async () => {
      if(temp.step > total) {
        const room = await message.room()
        if(!temp.answerPersons.length) {
          await message.say(room ? `😜游戏结束，没人猜对！` : '😜游戏结束，一题都没有猜对！')
        }else{
          room ? await message.say(`游戏结束，现在公布成绩：\n${temp.answerPersons.sort((a,b) => b.n - a.n).map((item,i) => `🏅第${i+1}名：@${item.name}（猜对${item.n}个）`).join('\n')}`) : await message.say(`游戏结束，猜对${temp.answerPersons[0].n}个`)
        }
        queue = []
        delete context[id]
        delete runing[id]
        wechaty.off('message', onMessage)
        return
      }
      temp.index = random()
      
      const data = list[temp.index]
  
      const path = Array.isArray(data.path) ? data.path[randomInteger(0, data.path.length)] : data.path;
      
      try{
        if(path){
          let imageFileBox
          if( /^http/.test(path)) {
            if(/\.webp$/.test(path)) {
              const data = await axios({
                url: path,
                responseType: "arraybuffer",
              });

              const buffer = await sharp(data).toFormat('png').toBuffer()
              
              imageFileBox = FileBox.fromBuffer(buffer,'1.png')
            }else{
              imageFileBox = FileBox.fromUrl(path)
            }
          }else{
            imageFileBox = FileBox.fromFile(path);
          }
          await message.say(imageFileBox)
          await message.say(`第${temp.step}题 ${data.topic || ''}`)
        }else{
          await message.say(`第${temp.step}题 ${data.topic || ''}`)
          await message.say(data.desc)
        }
      }catch{
        if(++errNum < 5){
          await send()
        }else{
          delete context[id]
          delete runing[id]
        }
        return
      }

      timer1 = setTimeout(() => {
        const i = randomInteger(0, data.answer.length - 1)
        isPrompt && message.say(`⏳还剩 30 秒！\n提示：${data.answer.split('').map((str, index) => i === index ? str : '◼').join('')}`)
        timer2 = setTimeout(async () => {
          queue = []
          await message.say(`😜时间到！没人猜对。答案是「${ data.answer }」。`)
          await sendFileBox()
        }, 30000)
      },30000)
    }

    await send()
  }
  
  await message.say(`开始${name}！一共${total}题！每题限时一分钟。`)
  await sendFileBox()

  let queue = []
  const onMessage = async (message) => {
    queue.push(
      new Promise(
        async (res) => {
          try{
            const continueRun = await queue[queue.length - 1]
            // 后续的异步队列是否继续判断
            if(continueRun === false) return res(false)
  
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
            let answer = list[temp.index].answer
        
            if(!caseSensitive) {
              msg = msg.toLowerCase()
              answer = answer.toLowerCase()
            }
            if(msg === answer) {
              clearTimeout(timer1)
              clearTimeout(timer2)
              await message.say(`${baseStr || ''}🎉恭喜猜对了！答案是「${list[temp.index].answer}」。`);
              const origin = temp.answerPersons.find(i => i.name === name)
        
              if(origin) origin.n++
              else temp.answerPersons.push({ name, n: 1 })
              
              queue = []
              res(false) // 已经有正确答案，队列中的判断全部取消
              await sendFileBox()
            }else res(true)
          }catch(e) {
            res(true)
          }
        }
      ) 
    )
  }

  wechaty.on('message', onMessage)
}