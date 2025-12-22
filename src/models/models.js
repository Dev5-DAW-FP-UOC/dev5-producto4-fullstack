import mongoose from "mongoose";

// Esquema de Usuario
const UsuarioSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rol: { type: String, default: "user" }
});

// Esquema de Voluntariado
const VoluntariadoSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  type: String,
  titulo: String,
  id_usuario: Number,
  nombre_usuario: String,
  modalidad: String,
  categoria: String,
  resumen: String,
  fecha: String
});

// Esquema de Categoría
const CategoriaSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  nombre: String
});

// Esquema de Seleccionados
const SeleccionadoSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  id_usuario: Number,
  id_voluntariado: Number
});

export const Usuario = mongoose.model("Usuario", UsuarioSchema);
export const Voluntariado = mongoose.model("Voluntariado", VoluntariadoSchema);
export const Categoria = mongoose.model("Categoria", CategoriaSchema);
export const Seleccionado = mongoose.model("Seleccionado", SeleccionadoSchema);