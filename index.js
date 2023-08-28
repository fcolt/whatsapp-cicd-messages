const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");

const groupName = process.env.GROUP_NAME;

const client = new Client({
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
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
