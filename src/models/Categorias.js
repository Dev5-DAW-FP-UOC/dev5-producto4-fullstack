// src/models/Categorias.js
import mongoose from "mongoose";

const categoriaSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  nombre: {
    type: String,
    required: true,
    unique: true,
  },
});

const Categoria = mongoose.model("Categoria", categoriaSchema);

export default Categoria;
