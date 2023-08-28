const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");

const groupName = 'Test bot';

const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Initialized");
});

client.on("message", (message) => {
  if(!message.from === '15551010841@c.us') {
    return;
  }

  client.getChats().then((chats) => {
    const myGroup = chats.find((chat) => chat.name === groupName);
    client.sendMessage(myGroup.id._serialized, message.body);
  });
});

client.initialize();
