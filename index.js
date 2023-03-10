const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { init: initDB, Counter } = require("./db");
const bodyParser = require("body-parser");
const request = require("request");
const ftp = require("ftp");
const fs = require("fs");

const logger = morgan("tiny");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

app.use(bodyParser.raw());
app.use(bodyParser.json({}));
app.use(bodyParser.urlencoded({ extended: true }));

app.all("/", async (req, res) => {
  console.log("消息推送", req.body);
  const appid = req.headers["x-wx-from-appid"] || "";
  const { ToUserName, FromUserName, MsgType, Content, CreateTime } = req.body;
  console.log("推送接收的账号", ToUserName, "创建时间", CreateTime);
  if (MsgType === "text") {
    if (Content === "回复文字") {
      const ftpClient = new ftp();

      const config = {
        host: "100.64.21.169",
        port: 21,
        user: "api_user",
        password: "Ranon123",
      };

      ftpClient.connect(config);

      ftpClient.on("ready", () => {
        const fileName = "picture.jpg"; // Replace with the filename you want to download
        ftpClient.get(`/api/${fileName}`, (err, stream) => {
          if (err) {
            console.error(err);
            ftpClient.end();
            return;
          }
          const chunks = [];
          stream.on("data", (chunk) => {
            chunks.push(chunk);
          });
          stream.on("end", () => {
            const fileBuffer = Buffer.concat(chunks);
            res.setHeader(
              "Content-disposition",
              `attachment; filename=${fileName}`
            );
            res.setHeader("Content-type", "image/jpeg"); // Replace with the appropriate MIME type for your file
            res.send(fileBuffer);
            console.log(
              `${fileName} downloaded successfully and sent as response!`
            );
            ftpClient.end();
          });
        });
      });

      ftpClient.on("error", (err) => {
        console.error(err);
      });
    } else {
      res.send("success");
    }
  } else {
    res.send("success");
  }
});

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
