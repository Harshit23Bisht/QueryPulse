const { Pool } = require("pg");

const pool = new Pool({
  host: "postgres",
  port: 5432,
  user: "postgres",
  password: "pass",
  database: "querypulse",
});

module.exports = pool;
