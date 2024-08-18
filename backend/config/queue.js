const amqp = require('amqplib');

let channel;

const connectQueue = async () => {
  const connection = await amqp.connect('amqp://localhost');
  channel = await connection.createChannel();
  await channel.assertQueue('notifications');
};

const sendToQueue = async (message) => {
  channel.sendToQueue('notifications', Buffer.from(JSON.stringify(message)));
};

const receiveFromQueue = async (callback) => {
  channel.consume('notifications', (msg) => {
    const content = JSON.parse(msg.content.toString());
    callback(content);
    channel.ack(msg);
  });
};

module.exports = { connectQueue, sendToQueue, receiveFromQueue };
