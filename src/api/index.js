import axios from "axios";

axios.interceptors.response.use((res) => res.data);

// const openAiUrl = 'https://api.openai.com/v1/chat/completions'
export const openAiUrl =
  "https://www.ai-yuxin.space/fastapi/api/chat/chatgpt_free";

export const morningPaper = async () => {
  const data = await axios.get(
    "https://hub.onmicrosoft.cn/public/news?index=0&origin=zhihu"
  );
  if (new Set(data.all_data).size > 1) return data.all_data.join("\n");
  else return "";
};

export const cloudmusicComment = async () => {
  const data = await axios.get(
    "https://v.api.aa1.cn/api/api-wenan-wangyiyunreping/index.php?aa1=text"
  );
  return data.replace(/<[^>]+>/g, "").replace("\n", "");
};

export const sentence = async () =>
  await axios.get("https://cloud.qqshabi.cn/api/hitokoto/hitokoto.php");

export const rainbow = async () =>{
  const data = await axios.get("https://cloud.qqshabi.cn/api/rainbow/api.php");
  return data.data
}

export const hitokoto = async () =>{
  const data = await axios.get("https://v1.hitokoto.cn?encode=json");
  return `${data.hitokoto}\n—— ${data.from_who || ""}「${data.from || ""}」`
}

export const tiangou = async () => await axios.get("https://cloud.qqshabi.cn/api/tiangou/api.php");

export const poison = async () =>{
  const data = await axios.get("https://cloud.qqshabi.cn/api/poison/api.php");
  return data.data
}
