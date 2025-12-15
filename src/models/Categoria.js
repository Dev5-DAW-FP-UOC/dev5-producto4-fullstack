import mongoose from "mongoose";

const CategoriaSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    nombre: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

export const Categoria =
  mongoose.models.Categoria || mongoose.model("Categoria", CategoriaSchema, "categorias");
