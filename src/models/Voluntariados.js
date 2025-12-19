import mongoose from "mongoose";

const voluntariadoSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  type: String,
  titulo: String,
  resumen: String,
  modalidad: String,
  categoria: String,
  fecha: String,
  id_usuario: Number // <-- CAMBIO: en vez de "autor"
});

export default mongoose.model("Voluntariado", voluntariadoSchema);
