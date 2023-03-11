const path = require("path");
const express = require("express");
const cors = require("cors");
const { init: initDB } = require("./db");

const logger = require("morgan")("tiny");

const app = express();

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

// Function to download file from cloud storage service
function downloadFile(birthDate, userName) {
  const fileId = `cloud://prod-8gj9vt8j4e3adc47.7072-prod-8gj9vt8j4e3adc47-1317188113/${birthDate}_${userName}.pdf`;

  return cloud
    .downloadFile({ fileID: fileId })
    .then((res) => {
      console.log(`File downloaded successfully: ${res.tempFilePath}`);
      return res.tempFilePath;
    })
    .catch((err) => {
      console.error(`Error downloading file: ${err.message}`);
      throw err;
    });
}

// Route to handle incoming messages
app.all("/", async (req, res) => {
  console.log("消息推送", req.body);
  // 从 header 中取appid，如果 from-appid 不存在，则不是资源复用场景，可以直接传空字符串，使用环境所属账号发起云调用
  const appid = req.headers["x-wx-from-appid"] || "";
  const { ToUserName, FromUserName, MsgType, Content, CreateTime } = req.body;
  console.log("推送接收的账号", ToUserName, "创建时间", CreateTime);

  if (MsgType === "text") {
    // Extract birth date and username from message content
    const pattern = /^(\d{4}-\d{2}-\d{2})_(\w+)$/;
    const match = Content.match(pattern);

    if (match) {
      const birthDate = match[1];
      const userName = match[2];

      // Validate input
      if (!birthDate || !userName) {
        console.error("Invalid birth date or username");
        res.status(400).json({ message: "Invalid input" });
        return;
      }

      // Download file
      downloadFile(birthDate, userName)
        .then((tempFilePath) => {
          // Handle downloaded file
          res.status(200).json({ message: "File downloaded successfully" });
        })
        .catch((err) => {
          // Handle errors
          console.error("Error downloading file", err);
          res.status(500).json({ message: "Error downloading file" });
        });
    } else {
      // Invalid message content
      res.status(400).json({ message: "Invalid input" });
    }
  } else {
    // Unsupported message type
    res.status(400).json({ message: "Unsupported message type" });
  }
});

// Start server
const port = process.env.PORT || 80;

async function bootstrap() {
  await initDB();
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}

bootstrap();
