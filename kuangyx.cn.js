import express from "express";
import "express-async-errors";
import { createProxyMiddleware } from "http-proxy-middleware";
import morgan from "morgan";
import {
  openAiUrl,
  morningPaper,
  cloudmusicComment,
  sentence,
  rainbow,
  tiangou,
  hitokoto,
  poison,
} from "./src/api/index.js";
import ultraman from "./src/ultraman.js";
import jsQuestion from "./src/jsQuestion.js";
import lol from "../lol-voice-skin/data.json" assert { type: "json" };
import { resolve } from "path";

const port = 3000;

const app = express();
const route = express.Router();

const pathRewrite = (path, req) => path.replace(req.path, "");

route.use(express.json());

app.use(async (req, res, next) => {
  const referer = req.get('Referer');
  if (referer.includes('/pages/chatGPT.html')) {
    res.header("Access-Control-Allow-Origin", req.headers.origin);

    res.header("Access-Control-Allow-Headers", "X-Requested-With,Content-Type");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
  } else {
    res.send("你在淦神魔");
  }
});

morgan.token("body", (req) => JSON.stringify(req.body));
morgan.token("query", (req) => JSON.stringify(req.query));

app.use(
  morgan(`
---------------------------- start -------------------------------\n 
:remote-addr - [:date[clf]] :method :url :status \n
:body \n
:query \n
:response-time ms :referrer \n
:user-agent
----------------------------  end  -------------------------------\n 
  `)
);

/* gpt 代理 */
route.post(
  "/gpt",
  createProxyMiddleware({
    target: openAiUrl,
    changeOrigin: true,
    pathRewrite,
    selfHandleResponse: true,
    onProxyReq: (proxyReq, req, res) => {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader("Content-Type", "application/json");
      proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    },
    onProxyRes(proxyRes, req, res) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      proxyRes.pipe(res);
    },
  })
);

/* 早报 */
route.get("/morningPaper", async (req, res) => {
  const data = await morningPaper();
  res.send(data);
});

/* 网易云热评 */
route.get("/cloudmusicComment", async (req, res) => {
  const data = await cloudmusicComment();
  res.send(data);
});

/* 一句 */
route.get("/sentence", async (req, res) => {
  const data = await sentence();
  res.send(data);
});

/* 彩虹屁 */
route.get("/rainbow", async (req, res) => {
  const data = await rainbow();
  res.send(data);
});

/* 舔狗日记 */
route.get("/tiangou", async (req, res) => {
  const data = await tiangou();
  res.send(data);
});

/* 毒鸡汤 */
route.get("/poison", async (req, res) => {
  const data = await poison();
  res.send(data);
});

/* 一言 */
route.get("/hitokoto", async (req, res) => {
  const data = await hitokoto();
  res.send(data);
});

/* 静态托管 */
app.use("/ultraman", express.static(resolve("./src/ultraman")));
app.use("/jsQuestion", express.static(resolve("./src/jsQuestion")));
app.use("/lol-voice-skin", express.static(resolve("../lol-voice-skin")));

/* 获取猜一猜列表 */
route.post("/getGuessit", async (req, res) => {
  const data = {
    ultraman,
    jsQuestion,
    lol,
  };

  res.send(data[req.body.type] || []);
});

app.use("/api", route);

function add405ResponseToRouter(router) {
  const routes = router.stack.map((layer) => layer.route).filter((i) => i);

  for (const route of routes) {
    const { path, methods } = route;

    router.route(path).all((req, res, next) => {
      if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
      }
      res.set(
        "Allow",
        Object.keys(methods)
          .filter((method) => method !== "_all")
          .map((method) => method.toUpperCase())
          .join(", ")
      );
      res.status(405).send("请求方法不允许");
    });
  }

  return router;
}

add405ResponseToRouter(route);

// 自定义错误处理中间件
route.use((err, req, res, next) => {
  console.log("500 err ===========> ", err.message);
  res.status(500).send(err.message);
});

// 404处理中间件
app.use((req, res, next) => {
  console.log("404 err ===========> ", req.path);
  res.status(404).send("404 未找到");
});

app.listen(port, () => console.log(`${port} 端口，已启动`)); // 监听端口
