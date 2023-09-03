const qrcode = require("qrcode");
const { Client, LocalAuth } = require("whatsapp-web.js");
const app = require("express")();
require("dotenv").config();

const GROUP_NAME = process.env.GROUP_NAME;
const PORT = process.env.PORT;
let qrCode;

const client = new Client({
  authStrategy: new LocalAuth(),
});

app.get("/", async (req, res) => {
  if (!qrCode) {
    return res.status(204).json({
      status: "success",
      data: [],
      message: 'No qr code yet generated',
    });
  }
  try {
    const qrImageBuffer = await qrcode.toBuffer(qrCode);
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

client.on("qr", async (qr) => {
  qrCode = qr;
});

client.on("ready", () => {
  console.log("Initialized");
});

client.on("message", (message) => {
  if (!message.from === process.env.FROM_ID) {
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
