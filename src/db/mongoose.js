import mongoose from "mongoose";

export async function connectMongoose() {
  const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
  const dbName = process.env.MONGODB_DB ?? "volunet_prod4";

  // opcional: para fallar rápido si no conecta
  mongoose.set("bufferCommands", false);

  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 5000,
  });

  console.log(`[Mongoose] Conectado a ${uri}, DB "${dbName}"`);
}
