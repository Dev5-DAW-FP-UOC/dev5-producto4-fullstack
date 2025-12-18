import mongoose from "mongoose";

const CategoriaSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  { timestamps: true }
);

export const Categoria = mongoose.models.Categoria || mongoose.model("Categoria", CategoriaSchema, "categorias");
