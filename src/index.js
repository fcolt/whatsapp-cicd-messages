const qrcode = require("qrcode");
const { Client } = require("whatsapp-web.js");
const app = require("express")();
require("dotenv").config();

const GROUP_NAME = process.env.GROUP_NAME;
const PORT = process.env.PORT;

const client = new Client({
  restartOnAuthFail: true,
  puppeteer: {
    headless: true,
    args: ["--no-sandbox"],
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
  setInterval(() => client.pupPage.click("#pane-side"), 60 * 1000); //"click" window in one minute intervals so that the session doesn't close
  setInterval(() => client.sendMessage(process.env.FROM_ID, '.'), 1000 * 60 * 60 * 24 - 2000 * 60); //send a message to the whatsapp bot every day to receive its messages
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