import axios from "axios";
import { FileBox } from "file-box";

axios.interceptors.response.use((res) => res.data);

const data = [];

const init = async () => {
  console.log("lol 资源获取初始化");
  const a = 'https://voice-cdn.buguoguo.cn/zh_CN/VO/characters/Annie/skin0/88087685.wem'

  const res = await axios({
    url: a,
    responseType: "arraybuffer",
  });
  const outputFileBox = FileBox.fromBuffer(
    Buffer.from(res),
    "music.mp3"
  );
  outputFileBox.toFile('./1.mp3')
  


  // const { hero } = await axios.get(
  //   "https://game.gtimg.cn/images/lol/act/img/js/heroList/hero_list.js"
  // );
  // hero.forEach(async (i) => {
  //   data.push({
  //     // 选择/禁用 语音
  //     path: [i.selectAudio, i.banAudio],
  //     answer: i.title,
  //     topic: "语音中的英雄名称是？",
  //   });

  //   const heroData = await axios.get(
  //     `https://game.gtimg.cn/images/lol/act/img/js/hero/${i.heroId}.js`
  //   );
  //   /* 皮肤 */
  //   data.push({
  //     answer: i.title,
  //     path: heroData.skins.map((i) => i.mainImg || i.chromaImg),
  //     topic: "图片中的英雄名称是？",
  //   });
  //   /* 技能 */
  //   heroData.spells.forEach((i) => {
  //     data.push({
  //       answer: i.name,
  //       path: i.abilityIconPath,
  //       topic: "图片中的技能名称是？",
  //     });

  //     data.push({
  //       answer: i.name,
  //       desc: i.description,
  //       topic: `描述的是${title}的技能名称是？`,
  //     });
  //   });
  // });

  // /* 语音 */
  // const d = await axios.get("https://voice.buguoguo.cn/api/config/heroTag");

  // d.data.forEach(async (i) => {
  //   const res = await axios({
  //     url: "https://voice.buguoguo.cn/api/files/getConfig",
  //     params: {
  //       fileName: `${i.heroId}_${i.name}_${i.alias}`,
  //       skinId: Number(i.heroId + "000"),
  //       version: 0,
  //     },
  //     maxBodyLength: Infinity,
  //   });
  //   const voicesData = Object.values(res.data.skin_voice).flat();

  //   let path = voicesData.map(
  //     (j) =>
  //       `https://voice-cdn.buguoguo.cn/zh_CN/VO/characters/${i.alias}/skin0/${j.voice_code}.wem`
  //   );
  //   path.length &&
  //     data.push({
  //       path,
  //       answer: i.title,
  //       topic: "语音中是哪个英雄的声音？",
  //     });
  // });
};

await init()

console.log(data)
