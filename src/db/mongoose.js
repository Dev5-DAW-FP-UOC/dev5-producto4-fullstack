import mongoose from "mongoose";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB ?? "volunet";

export async function connectMongoose() {
  try {
    await mongoose.connect(uri, { dbName });
    console.log(`[Mongoose] Conectado a ${uri}, DB "${dbName}"`);
  } catch (error) {
    console.error("[Mongoose] Error de conexión:", error);
    process.exit(1);
  }
}


process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("[Mongoose] Conexión cerrada");
  process.exit(0);
});