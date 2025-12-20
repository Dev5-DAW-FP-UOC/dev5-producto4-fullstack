import mongoose from "mongoose";

const seleccionadoSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  id_usuario: { type: Number, required: true },
  id_voluntariado: { type: Number, required: true },
});

export default mongoose.model("Seleccionado", seleccionadoSchema);
