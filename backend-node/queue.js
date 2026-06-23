const { Queue } = require("bullmq");

const queryQueue = new Queue("query-execution", {
  connection: {
    host: "redis",
    port: 6379,
  },
});

module.exports = queryQueue;
