// src/db/mongoClient.js
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB ?? "volunet";

let client;
let db;

/**
 * Devuelve la instancia de base de datos MongoDB (singleton).
 */
export async function getDb() {
  if (db) return db;

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  console.log(`[Mongo] Conectado a ${uri}, DB "${dbName}"`);
  return db;
}

// Cierre elegante al hacer Ctrl+C
process.on("SIGINT", async () => {
  if (client) {
    await client.close();
    console.log("[Mongo] Conexión Mongo cerrada");
  }
  process.exit(0);
});
