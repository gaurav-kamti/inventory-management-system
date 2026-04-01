const { Sequelize } = require("sequelize");
require("dotenv").config();

let sequelize;

if (process.env.DATABASE_URL) {
  // Production: PostgreSQL (Supabase / Render / Neon)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Required for Supabase / Render
      }
    },
    logging: false, // Turn off logging in production for cleaner logs
  });
  console.log("Connected to PostgreSQL Database (Production)");
} else {
  // Local Development: SQLite
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: "./database.sqlite",
    logging: console.log,
  });
  console.log("Connected to SQLite Database (Development)");
}

module.exports = sequelize;
