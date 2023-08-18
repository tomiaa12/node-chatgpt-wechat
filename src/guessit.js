import { FileBox } from 'file-box';

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

  
  const oldIndex = []
  const random = () => {
    console.log(list,'list')
    const temp = randomInteger(0, list.length - 1)
    if(oldIndex.includes(temp)) return random()

    oldIndex.push(temp)
    return temp
  }

  let timer1 = null, timer2 = null;
  
  const sendFileBox = async () => {
    temp.step++
    if(temp.step > total) {
      const room = await message.room()
      if(!temp.answerPersons.length) {
        await message.say(room ? `😜游戏结束，没人猜对！` : '😜游戏结束，一题都没有猜对！')
      }else{
        room ? await message.say(`游戏结束，现在公布成绩：\n${temp.answerPersons.sort((a,b) => b.n - a.n).map((item,i) => `🏅第${i+1}名：@${item.name}（猜对${item.n}个）`).join('\n')}`) : await message.say(`游戏结束，猜对${temp.answerPersons[0].n}个`)
      }
      delete context[id]
      delete runing[id]
      return
    }
    temp.index = random()
    await message.say(`第${temp.step}题，每题限时一分钟`)
    const data = list[temp.index]
    const path = data.path;
    const imageFileBox = FileBox.fromFile(path);
    await message.say(imageFileBox)
    timer1 = setTimeout(() => {
      const i = randomInteger(0, data.answer.length - 1)
      message.say(`⏳还剩 30 秒！\n提示：${data.answer.split('').map((str, index) => i === index ? str : '◼').join('')}`)
      timer2 = setTimeout(async () => {
        await message.say(`😜时间到！没人猜对。答案是「${ data.answer }」。`)
        await sendFileBox()
      }, 30000)
    },30000)

  }
  
  await message.say(`开始${name}！一共${total}题！`)
  await sendFileBox()
  let disabled = false;

  const onMessage = async (message) => {

    if(disabled) return; // 等待上一次message的异步结束

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

    if(msg === list[temp.index].answer) {
      disabled = true;
      clearTimeout(timer1)
      clearTimeout(timer2)
      await message.say(`${baseStr || ''}🎉恭喜猜对了！答案是「${list[temp.index].answer}」。`);
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

}