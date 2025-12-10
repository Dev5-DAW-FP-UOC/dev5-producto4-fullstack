// src/db/mongoClient.js
import { MongoClient } from "mongodb";

/**
 * URI de conexión a Mongo DB.
 * Se obtiene de la variable de entorno `MONGODB_URI`
 * y, si no existe, se usa una instancia local por defecto.
 * @type {string}
 * */
const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";

/**
 * Nombre de la base de datos a utilizar
 * Se obtiene de `MONGODB_DB` o por defecto `volunet`.
 * @type {string}
 */
const dbName = process.env.MONGODB_DB ?? "volunet";

/**
 * Cliente MongoDB compartido (singleton).
 * @type {MonogoClient | undefined}
 */
let client;

/**
 * Instancia de la base de datos MongoDB.
 * @type {import ("mongodb").Db | undefined }
 */
let db;

/**
 * Devuelve la instancia de base de datos MongoDB.
 * Implementa un patrón singleton: reutiliza la misma conexión
 * durante el ciclo de vida del proceso.
 *
 * @async
 * @returns {Promise<import("mongodb").Db>} Base de datos de MongoDB ya conectada.
 */
export async function getDb() {
  if (db) return db;

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  console.log(`[Mongo] Conectado a ${uri}, DB "${dbName}"`);
  return db;
}

/**
 * Maneja el cierre elegante de la aplicación.
 * Cuando el usuario pulsa Ctrl + C (SIGINT),
 * se cierra la conexión a MongoDB antes de terminar el proceso.
 */
process.on("SIGINT", async () => {
  if (client) {
    await client.close();
    console.log("[Mongo] Conexión Mongo cerrada");
  }
  process.exit(0);
});
