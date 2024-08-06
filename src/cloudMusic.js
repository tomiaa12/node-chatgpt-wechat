import pkg from "NeteaseCloudMusicApi";
import fs from "fs";
import ffmpeg from "ffmpeg.js/ffmpeg-mp4.js";
import { FileBox } from "file-box";
import axios from "axios";
import { randomInteger } from "./guessit.js";
import path from "path";
import { fileURLToPath } from "url";
import { email, password } from '../config.js'
const playlistId = "8757528656"; // 歌单ID
const realIP = "116.25.146.159";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cachePath = path.resolve(__dirname, "./cache");
const cookiePath = path.resolve(__dirname, ".cookie");

const {
  login: loginEmail,
  login_status,
  check_music,
  song_url_v1,
  playlist_detail,
  song_detail,
} = pkg;

let cookie;
export let musicList = []

export const init = async () => {
  const login = async () => {
    console.log("网易云登录");
    const result = await loginEmail({
      email,
      password,
      realIP,
    });

    fs.writeFileSync(cookiePath, result.body.cookie);

    console.log("网易云登录成功");
  };

  if (fs.existsSync(cookiePath)) {
    cookie = fs.readFileSync(cookiePath, "utf8");
    console.log("cookie已存在");
    const result = await login_status({
      cookie,
      realIP,
    });
    console.log("校验cookie完成");
    if (!result.body.data.profile) login();
  } else await login();

  const { body } = await playlist_detail({
    id: playlistId,
    cookie,
  });
  const data = await song_detail({
    ids: body.playlist.trackIds.map((i) => i.id).join(","),
    cookie,
    realIP,
  });

  musicList = data.body.songs.map((i) => ({
    answer: i.name.replace(/\（.*?\）/g,'').replace(/\(.*?\)/g,'').trim(),
    id: i.id,
    singer: i.ar.map((i) => i.name).join("/"),
    time: i.dt,
  }));

  console.log(`歌单列表获取完成，共${musicList.length}首`);
  // console.log(JSON.stringify(musicList));
};

export const getFileBox = async ({ id, time }) => {
  let mp3Data;

  const mp3Path = path.resolve(__dirname, `./cache/${id}.mp3`);
  if (fs.existsSync(mp3Path)) {
    console.log("音乐已存在", id);
    mp3Data = fs.readFileSync(mp3Path);
  } else {
    const { body } = await check_music({ id, cookie, realIP });
    if (!body.success) throw new Error(body);
    console.log("校验完成");

    const data = await song_url_v1({
      id,
      cookie,
      level: "standard",
      realIP,
    });
    const inputUrl = data.body.data[0].url;

    const response = await axios.get(inputUrl, { responseType: "arraybuffer" });
    mp3Data = Buffer.from(response?.data || response);

    if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath, { recursive: true });

    // 创建本地文件并写入 ArrayBuffer 数据
    fs.writeFileSync(mp3Path, mp3Data);
  }

  const startTime = randomInteger(0, time - 15000);
  const endTime = startTime + 15000;

  const result = ffmpeg({
    arguments: [
      "-i",
      "input.mp3",
      "-ss",
      startTime / 1000 + "",
      "-to",
      endTime / 1000 + "",
      "output.mp3",
    ],
    MEMFS: [{ name: "input.mp3", data: mp3Data }],
  });

  const outputData = result.MEMFS[0].data.buffer; // 将 outputData 转换为 ArrayBuffer

  const outputFileBox = FileBox.fromBuffer(
    Buffer.from(outputData),
    "music.mp3"
  );

  // const outputFilePath = "./1.mp3";

  // outputFileBox.toFile(outputFilePath); // 将 outputData 包装为文件并保存

  // console.log("音频截取完成，输出文件路径:", outputFilePath);
  return Promise.resolve(outputFileBox);
};
// init()
// getFileBox(musicList[0]);
