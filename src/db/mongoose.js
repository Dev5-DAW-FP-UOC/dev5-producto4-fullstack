import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/FP066_Producto4';

export async function connect() {
  if (mongoose.connection.readyState === 1) return mongoose;
  // Mongoose v6+ enables modern parser/topology by default; don't pass
  // deprecated options like useNewUrlParser/useUnifiedTopology.
  await mongoose.connect(MONGO_URI);
  console.log('[mongoose] connected to', MONGO_URI);
  return mongoose;
}

export { mongoose };
