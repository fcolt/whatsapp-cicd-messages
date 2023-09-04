const qrcode = require("qrcode");
const { Client, LocalAuth } = require("whatsapp-web.js");
const app = require("express")();
const puppeteer = require('puppeteer');
require("dotenv").config();

const GROUP_NAME = process.env.GROUP_NAME;
const PORT = process.env.PORT;

class MyLocalAuth extends LocalAuth {
  constructor(opts) {
    super(opts);
  }
  async afterBrowserInitialized() {
    super.afterBrowserInitialized();
    this.client.pupBrowser.on("disconnected", () =>
      this.client.emit("pup_disconnected")
    );
  }
}

const client = new Client({
  authStrategy: new MyLocalAuth(),
  restartOnAuthFail: true,
  puppeteer: {
    headless: true,
    args: [
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-setuid-sandbox",
      "--no-first-run",
      "--no-sandbox",
      "--no-zygote",
      "--deterministic-fetch",
      "--disable-features=IsolateOrigins",
      "--disable-site-isolation-trials",
    ],
  },
});

app.get("/", async (req, res) => {
  client.on("disconnected", (reason) => {
    // Destroy and reinitialize the client when disconnected
    client.destroy();
    client.initialize();
  });
  let qr = await new Promise((resolve, reject) => {
    client.once("qr", (qr) => resolve(qr));
  });
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

client.on("ready", () => {
  console.log("Initialized");
  setInterval(
    () => client.sendMessage(process.env.FROM_ID, "."),
    1000 * 60 * 60 * 24 - 10000 * 60
  ); //send a message to the whatsapp bot every day to receive its messages
});

const launchBrowser = async () => {
  client.pupBrowser = await puppeteer.launch();
  let page = await client.pupBrowser.newPage();
  await page.goto('https://whatsapp.com/');
  console.log('Browser reconnected.');
}

client.on("pup_disconnected", () => {
  console.log('Browser disconnected, attempting to reconnect');
  (async () => {
    await launchBrowser();
  })();
});

client.on("message", (message) => {
  if (!(message.from === process.env.FROM_ID)) {
    return;
  }

  client.getChats().then((chats) => {
    const myGroup = chats.find((chat) => chat.name === GROUP_NAME);
    client.sendMessage(myGroup.id._serialized, message.body);
  });
});

client.initialize();

app.listen(PORT, () => {
  console.log("Server started");
});

module.exports = app;
