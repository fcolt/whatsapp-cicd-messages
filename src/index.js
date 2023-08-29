const qrcode = require("qrcode");
const chromium = require("@sparticuz/chromium-min");
const { Client, LocalAuth } = require("whatsapp-web.js");
const app = require("express")();
require('dotenv').config();

const groupName = process.env.GROUP_NAME;

const getClient = async () =>
  new Client({
    authStrategy: new LocalAuth({
      dataPath: '/tmp/.wwebjs_auth'
    }),
    puppeteer: {
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(
        "https://github.com/stefanjudis/tiny-helpers/raw/primary/static/chromium/chromium-pack.tar"
      ),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    },
  });

app.get("/", async (req, res) => {
  const client = await getClient();

  client.on("qr", async (qr) => {
    try {
      const qrImageBuffer = await qrcode.toBuffer(qr);
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': qrImageBuffer.length,
      });
      res.end(qrImageBuffer);
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  client.on("ready", () => {
    console.log("Initialized");
  });

  client.on("message", (message) => {
    if (!message.from === process.env.FROM_ID) {
      return;
    }

    client.getChats().then((chats) => {
      const myGroup = chats.find((chat) => chat.name === groupName);
      client.sendMessage(myGroup.id._serialized, message.body);
    });
  });

  client.initialize();
});

app.listen(3000, () => {
  console.log("Server started");
});

module.exports = app;