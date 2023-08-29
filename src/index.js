const qrcode = require("qrcode");
const chromium = require("@sparticuz/chromium-min");
const { Client, RemoteAuth } = require("whatsapp-web.js");
const app = require("express")();
require("dotenv").config();
const { MongoStore } = require("wwebjs-mongo");
const mongoose = require("mongoose");

const groupName = process.env.GROUP_NAME;

const getClient = async () => {
  const chromiumExecutablePath = await chromium.executablePath(
    "https://github.com/stefanjudis/tiny-helpers/raw/primary/static/chromium/chromium-pack.tar"
  );
  await mongoose.connect(process.env.MONGODB_URI);
  const store = new MongoStore({ mongoose: mongoose });
  const client = new Client({
    authStrategy: new RemoteAuth({
      store: store,
      backupSyncIntervalMs: 300000,
    }),
    puppeteer: {
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: chromiumExecutablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    },
  });

  return client;
};

app.get("/", async (req, res) => {
  const client = await getClient();

  client.on("qr", async (qr) => {
    try {
      const qrImageBuffer = await qrcode.toBuffer(qr);
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": qrImageBuffer.length,
      });
      res.end(qrImageBuffer);
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  client.on('remote_session_saved', () => {
    console.log('Remote session saved');
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
