import axios from "axios";

axios.interceptors.response.use((res) => res.data);

// const openAiUrl = 'https://api.openai.com/v1/chat/completions'
export const openAiUrl = "https://www.ai-yuxin.space/fastapi/api/chat";

// export const morningPaper = async (sendErr) => {
//   const data = await axios.get(
//     "https://hub.onmicrosoft.cn/public/news?index=0&origin=zhihu"
//   );
//   if (new Set(data.all_data).size > 1) return data.all_data.join("\n");
//   else return sendErr ? '出错啦' : "";
// };
export const morningPaper = async (sendErr) => {
  const { data } = await axios.get("https://api.52vmy.cn/api/wl/60s?type=json");
  if (data.length)
    return data.map((item, i) => `${i + 1}、${item}`).join("\n");
  else return sendErr ? "出错啦" : "";
};

export const cloudmusicComment = async () => {
  const data = await axios.get(
    "https://v.api.aa1.cn/api/api-wenan-wangyiyunreping/index.php?aa1=text"
  );
  return data.replace(/<[^>]+>/g, "").replace("\n", "");
};

export const sentence = async () =>
  await axios.get("https://cloud.qqshabi.cn/api/hitokoto/hitokoto.php");

export const rainbow = async () => {
  const data = await axios.get("https://cloud.qqshabi.cn/api/rainbow/api.php");
  return data.data;
};

export const hitokoto = async () => {
  const data = await axios.get("https://v1.hitokoto.cn?encode=json");
  return `${data.hitokoto}\n—— ${data.from_who || ""}「${data.from || ""}」`;
};

export const tiangou = async () =>
  await axios.get("https://cloud.qqshabi.cn/api/tiangou/api.php");

export const poison = async () => {
  const data = await axios.get("https://cloud.qqshabi.cn/api/poison/api.php");
  return data.data;
};

export const translate = async (query, to_lang) => {
  if (!to_lang) {
    to_lang = /[\u4e00-\u9fa5]/g.test(query) ? "en" : "zh";
  }
  return axios.post("https://www.ai-yuxin.space/fastapi/api/translate", {
    query,
    from_lang: "auto",
    to_lang,
  });
};

/* 画图 */
// 画图 token
let drawToken = "",
  drawUserId = "";

export const draw = async (query) => {
  const { data } = await translate(query, "en");

  // 刷新 token
  const getToken = async () => {
    console.log("画图getoken");
    const { data } = await axios.post(
      "https://www.ai-yuxin.space/fastapi/api/user/login",
      {
        account: "tomiaa",
        password: "5d86ed1730a40de164175de5c01b85dc",
      }
    );
    console.log("画图 token 更新 =>", data);
    drawToken = data.token;
    drawUserId = data.user_id;
  };

  const draw = async () => {
    const d = await axios.post(
      "https://www.ai-yuxin.space/fastapi/api/painting/stable_diffusion",
      {
        user_id: drawUserId,
        token: drawToken,
        prompt: data,
        negative_prompt: "",
        width: 512,
        height: 712,
        number: 1,
        cfg: 7,
        // mode: "realisticVisionV51_v51VAE", // 写实
        mode: "toonyou_beta6", // 卡通
        method: "Euler a",
        steps: 25,
        seed: -1,
        facial_restoration: false,
        image: "0",
        denoising_strength: 0,
      }
    );

    const url = `https://www.ai-yuxin.space/${d.data[0]}`;
    return Promise.resolve(url);
  };

  try {
    if (!drawToken) await getToken();
    return await draw();
  } catch {
    await getToken();
    return await draw();
  }
};

/* 人生倒计时 */
export const rsdjs = async () =>
  await axios.get("https://v.api.aa1.cn/api/rsdjs");

/* 全球IP信息 */
export const ipInfo = async (ip) =>
  await axios.get("https://api.lucksss.com/api/ip?ip=" + ip);

/* steam喜加一 */
export const steamplusone = async () =>
  await axios.get("https://api.pearktrue.cn/api/steamplusone/");

export const history2Day = async () =>
  await axios.get("https://v2.api-m.com/api/history");

export const lovely = async () =>
  await axios.get("https://api.lucksss.com/api/dmbz?type=pc", {
    responseType: "arraybuffer",
  });
