import mongoose from 'mongoose';

/**
 * URI de conexión. Usa la variable de entorno o local por defecto.
 * Mongoose incluye el nombre de la DB en la propia URI.
 */
const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/volunet";

/**
 * Inicia la conexión a MongoDB usando Mongoose.
 * Mongoose gestiona su propio pool de conexiones internamente.
 */
export async function connectDB() {
  try {
    // La conexión de Mongoose es persistente
    await mongoose.connect(uri);
    console.log(`[Mongoose] ✅ Conectado exitosamente a: ${uri}`);
    
    return mongoose.connection;
  } catch (error) {
    console.error("[Mongoose] ❌ Error crítico conectando a la base de datos:", error);
    process.exit(1); // Detenemos la app si no hay base de datos
  }
}

/**
 * Cierre limpio de la conexión al parar la app (Ctrl+C)
 */
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("\n[Mongoose] Conexión cerrada por terminación del proceso.");
  process.exit(0);
});