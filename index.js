const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { init: initDB, Counter } = require("./db");
const bodyParser = require("body-parser"); // added 10-03-22
const request = require("request");
const FTPClient = require("ftp");

const logger = morgan("tiny");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

//////////////////////// added 10-03-22

app.use(bodyParser.raw());
app.use(bodyParser.json({}));
app.use(bodyParser.urlencoded({ extended: true }));

app.all("/", async (req, res) => {
  console.log("消息推送", req.body);
  // 从 header 中取appid，如果 from-appid 不存在，则不是资源复用场景，可以直接传空字符串，使用环境所属账号发起云调用
  const appid = req.headers["x-wx-from-appid"] || "";
  const { ToUserName, FromUserName, MsgType, Content, CreateTime } = req.body;
  console.log("推送接收的账号", ToUserName, "创建时间", CreateTime);
  if (MsgType === "text") {
    if (Content === "回复文字") {
      // 小程序、公众号可用
      const synUrl = await getSynologyDownloadLink();
      await sendmess(appid, {
        touser: FromUserName,
        msgtype: "link",
        link: {
          url: synUrl,
        },
      });
    }
    res.send("success");
  } else {
    res.send("success");
  }
});

// 小程序调用，获取微信 Open ID
app.get("/api/wx_openid", async (req, res) => {
  if (req.headers["x-wx-source"]) {
    res.send(req.headers["x-wx-openid"]);
  }
});

const port = process.env.PORT || 80;

async function bootstrap() {
  await initDB();
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}

bootstrap();

function sendmess(appid, mess) {
  return new Promise((resolve, reject) => {
    request(
      {
        method: "POST",
        url: `http://api.weixin.qq.com/cgi-bin/message/custom/send?from_appid=${appid}`,
        body: JSON.stringify(mess),
      },
      function (error, response) {
        if (error) {
          console.log("接口返回错误", error);
          reject(error.toString());
        } else {
          console.log("接口返回内容", response.body);
          resolve(response.body);
        }
      }
    );
  });
}

function getSynologyDownloadLink() {
  const ftp = new FTPClient();
  return new Promise((resolve, reject) => {
    ftp.on("ready", function () {
      ftp.cwd("/api", function (err) {
        if (err) {
          reject(err);
          return;
        }
        ftp.get("picture.jpg", function (err, stream) {
          if (err) {
            reject(err);
            return;
          }
          let data = "";
          stream.on("data", function (chunk) {
            data += chunk.toString();
          });
          stream.on("end", function () {
            ftp.end();
            const synUrl = data.trim();
            resolve(synUrl);
          });
          stream.on("error", function (err) {
            ftp.end();
            reject(err);
          });
        });
      });
    });
    ftp.on("error", function (err) {
      reject(err);
    });
    ftp.connect({
      host: "100.64.21.169",
      port: 21,
      user: "api_user",
      password: "Ranon123",
    });
  });
}
