# node.js 调用 openai 实现微信自动回复 chatgpt 回答

## 前提条件

1. 启动服务之前需要修改你的 apiKey
```js
// 设置你的 open ai key
const apiKey = "";

```

2. 是否需要猜英雄联盟
```js
// index.js
// 不需要要注释此行代码才能启动
import lol from "../lol-voice-skin/data.json" assert { type: "json" };

// 需要这个功能要 clone ==> https://github.com/tomiaa12/lol-voice-skin 这个仓库
// 放置在当前项目平级目录
// lol-voice-skin 与 node-chatgpt-wechat 平级

```

3. 配置允许回答消息的群聊
```js
const replyRoomTopic = ["群名1","群名2"]
// 或者
const replyRoomTopic = true //所有群都回答
```

4. 其他配置看`index.js`

## 启动

```sh
npm run start
# 或
node index.js
```

启动后微信扫码登录，登陆后手机端微信不能退出（因为模拟的电脑登录微信，手机端退出会导致电脑端同时退出微信）
