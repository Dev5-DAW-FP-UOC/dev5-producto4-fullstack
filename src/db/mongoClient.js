// src/db/mongoClient.js
import mongoose from "mongoose";

/**
 * URI de conexión a Mongo DB.
 * Se obtiene de la variable de entorno `MONGODB_URI`
 * y, si no existe, se usa una instancia local por defecto.
 * @type {string}
 */
const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";

/**
 * Nombre de la base de datos a utilizar
 * Se obtiene de `MONGODB_DB` o por defecto `volunet_prod4`.
 * @type {string}
 */
const dbName = process.env.MONGODB_DB ?? "volunet_prod4";

/**
 * Conexión a MongoDB a través de Mongoose.
 * @type {import("mongoose").Mongoose}
 */
let client;

/**
 * Devuelve la instancia de conexión Mongoose.
 * Implementa un patrón singleton: reutiliza la misma conexión
 * durante el ciclo de vida del proceso.
 *
 * @async
 * @returns {Promise<import("mongoose").Mongoose>} Conexión Mongoose activa
 */
export async function getDb() {
  if (client && mongoose.connection.readyState === 1) return client;

  try {
    client = await mongoose.connect(`${uri}/${dbName}`);
    console.log(`[Mongo] Conectado a ${uri}, DB "${dbName}"`);
    return client;
  } catch (err) {
    console.error("[Mongo] Error de conexión:", err);
    process.exit(1);
  }
}

/**
 * Maneja el cierre elegante de la aplicación.
 * Cuando el usuario pulsa Ctrl + C (SIGINT),
 * se cierra la conexión a MongoDB antes de terminar el proceso.
 */
process.on("SIGINT", async () => {
  // Comentado para desarrollo, para evitar cerrar conexión en restarts
  // if (client) {
  //   await mongoose.disconnect();
  //   console.log("[Mongo] Conexión Mongo cerrada");
  // }
  process.exit(0);
});
