const fastify = require("fastify")({
  logger: true,
});

const queryQueue = require("./queue");

fastify.get("/health", async (request, reply) => {
  return {
    status: "ok",
  };
});

const start = async () => {
  try {
    await fastify.listen({
      port: 3000,
      host: "0.0.0.0",
    });

    console.log("Server running on port 3000");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

fastify.post("/submit", async (request, reply) => {
  const { sql, problem_id } = request.body;

  const job = await queryQueue.add("execute-sql", {
    sql,
    problem_id,
  });

  return {
    jobId: job.id,
    status: "queued",
  };
});
