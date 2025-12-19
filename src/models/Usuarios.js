import mongoose from "mongoose";

const usuarioSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  nombre: String,
  email: { type: String, unique: true },
  password: String,
  rol: { type: String, enum: ["admin", "user"] }
});

export default mongoose.model("Usuario", usuarioSchema);
