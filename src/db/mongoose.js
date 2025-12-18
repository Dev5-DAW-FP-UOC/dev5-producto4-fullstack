import mongoose from "mongoose";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB ?? "volunet";

export async function connectMongoose() {
  const conn = await mongoose.connect(uri, { dbName });

  console.log(`[Mongoose] Conectado a ${uri}, DB ${dbName}`);

  return conn;
}
