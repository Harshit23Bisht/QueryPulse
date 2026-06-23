const fastify = require("fastify")({
  logger: true,
});

const queryQueue = require("./queue");
const db = require("./db");
const bcrypt = require("bcrypt");

fastify.decorate("authenticate", async function (request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

fastify.get("/health", async (request, reply) => {
  return {
    status: "ok",
  };
});

fastify.get(
  "/profile",
  {
    preHandler: [fastify.authenticate],
  },
  async (request, reply) => {
    return {
      user: request.user,
    };
  },
);

fastify.post("/auth/register", async (request, reply) => {
  const { email, password } = request.body;

  const passwordHash = await bcrypt.hash(password, 10);

  await db.query(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)`,
    [email, passwordHash],
  );

  return {
    message: "User registered",
  };
});

fastify.post("/auth/login", async (request, reply) => {
  const { email, password } = request.body;

  const result = await db.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);

  const user = result.rows[0];

  if (!user) {
    return reply.code(401).send({
      message: "Invalid credentials",
    });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    return reply.code(401).send({
      message: "Invalid credentials",
    });
  }

  const token = fastify.jwt.sign({
    user_id: user.user_id,
    email: user.email,
  });

  return {
    token,
  };
});

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

const start = async () => {
  const result = await db.query("SELECT NOW()");
  console.log(result.rows);

  await fastify.register(require("@fastify/jwt"), {
    secret: "super-secret-key",
  });

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
