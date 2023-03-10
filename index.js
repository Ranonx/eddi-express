const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { init: initDB, Counter } = require("./db");
const bodyParser = require("body-parser"); // added 10-03-22
const request = require("request");

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
  const { ToUserName, FromUserName, MsgType, Content, CreateTime } = req.body;
  if (MsgType === "text") {
    if (Content === "回复文字") {
      res.send({
        ToUserName: FromUserName,
        FromUserName: ToUserName,
        CreateTime: CreateTime,
        MsgType: "text",
        Content: "这是回复的消息",
      });
    }
  } else {
    res.send("success");
  }
});

// app.listen(PORT, function () {
//   console.log(`运行成功，端口：${PORT}`)
// })
////////////////////////

// 首页
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 更新计数
app.post("/api/count", async (req, res) => {
  const { action } = req.body;
  if (action === "inc") {
    await Counter.create();
  } else if (action === "clear") {
    await Counter.destroy({
      truncate: true,
    });
  }
  res.send({
    code: 0,
    data: await Counter.count(),
  });
});

// 获取计数
app.get("/api/count", async (req, res) => {
  const result = await Counter.count();
  res.send({
    code: 0,
    data: result,
  });
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
