const { Worker } = require("bullmq");

const worker = new Worker(
  "query-execution",
  async (job) => {
    console.log("Processing Job:", job.id);
    console.log("Job Data:", job.data);

    try {
      console.log("Calling Go service...");

      const response = await fetch("http://go-service:8081/execute", {
        method: "POST",
      });

      const text = await response.text();

      console.log("Go Response:", text);

      return {
        status: "executed",
      };
    } catch (err) {
      console.error("Worker Error:", err);

      throw err;
    }
  },
  {
    connection: {
      host: "redis",
      port: 6379,
    },
  },
);

console.log("Worker listening...");
