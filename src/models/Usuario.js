import mongoose from "mongoose";

const UsuarioSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    nombre: { type: String, required: true, trim: true, minlength: 2 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, minlength: 4 },
    rol: { type: String, required: true, enum: ["admin", "user"], default: "user" },
  },
  { timestamps: true }
);

export const Usuario = mongoose.models.Usuario || mongoose.model("Usuario", UsuarioSchema, "usuarios");