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

const COS = require("cos-nodejs-sdk-v5");
const cos = new COS({
  SecretId: "AKIDb3IK7g095nFUUGn6CLFtITP7brsd7NwF",
  SecretKey: "6xay6ybz7zdYEfqzCCyWrxrb9SYSt76q",
});

const birthDate = "19931020";
const userName = "CHOW";

const params = {
  Bucket: "file-storage-1312367695",
  Region: "ap-nanjing",
  Key: `${birthDate}_${userName}_051633_000736_Report.pdf`,
};

cos.getObjectUrl(params, (err, data) => {
  if (err) {
    console.error(err);
  } else {
    console.log("File URL:", data.Url);
  }
});

app.all("/", async (req, res) => {
  console.log("消息推送", req.body);
  // 从 header 中取appid，如果 from-appid 不存在，则不是资源复用场景，可以直接传空字符串，使用环境所属账号发起云调用
  const appid = req.headers["x-wx-from-appid"] || "";
  const { ToUserName, FromUserName, MsgType, Content, CreateTime } = req.body;
  console.log("推送接收的账号", ToUserName, "创建时间", CreateTime);
  if (MsgType === "text") {
    if (Content === `${birthDate}_${userName}`) {
      // 小程序、公众号可用
      try {
        const fileParams = {
          Bucket: "file-storage-1312367695",
          Region: "ap-nanjing",
          Key: `${birthDate}_${userName}_051633_000736_Report.pdf`,
        };
        cos.headObject(fileParams, (err, data) => {
          if (err) {
            console.error(err);
            res.send("no file exists");
          } else {
            console.log("File exists");
            res.send({
              downloadLink: `https://file-storage-1312367695.cos.ap-nanjing.myqcloud.com/${birthDate}_${userName}_051633_000736_Report.pdf`,
            });
          }
        });
      } catch (error) {
        console.log("获取文件失败", error);
        res.status(500).send("Failed to get file.");
      }
    } else {
      res.send("success");
    }
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
