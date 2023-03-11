const path = require("path");
const express = require("express");
const cors = require("cors");
const { init: initDB } = require("./db");

const logger = require("morgan")("tiny");

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

app.all("/", async (req, res) => {
  console.log("消息推送", req.body);
  // 从 header 中取appid，如果 from-appid 不存在，则不是资源复用场景，可以直接传空字符串，使用环境所属账号发起云调用
  const appid = req.headers["x-wx-from-appid"] || "";
  const { ToUserName, FromUserName, MsgType, Content, CreateTime } = req.body;
  console.log("推送接收的账号", ToUserName, "创建时间", CreateTime);
  if (MsgType === "text") {
    const pattern = /^(\d{4}-\d{2}-\d{2})_(\w+)$/;
    const match = Content.match(pattern);
    if (match) {
      const birthDate = match[1];
      const userName = match[2];
      const params = {
        Bucket: "file-storage-1312367695",
        Region: "ap-nanjing",
        Key: `${birthDate}_${userName}_051633_Report.pdf`,
      };
      cos.headObject(params, async (err, data) => {
        if (err) {
          console.error(err);
          const result2 = await sendmess(appid, {
            touser: FromUserName,
            msgtype: "text",
            text: {
              content: "Sorry, the file you requested could not be found.",
            },
          });
        } else {
          const result2 = await sendmess(appid, {
            touser: FromUserName,
            msgtype: "text",
            text: {
              content: data.Url,
            },
          });
        }
      });
    } else if (Content === "我的报告") {
      // 小程序、公众号可用
      await sendmess(appid, {
        touser: FromUserName,
        msgtype: "text",
        text: {
          content:
            "https://file-storage-1312367695.cos.ap-nanjing.myqcloud.com/example.pdf",
        },
      });
    }
    res.send("success");
  } else {
    res.send("success");
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
    const request = require("request");
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
