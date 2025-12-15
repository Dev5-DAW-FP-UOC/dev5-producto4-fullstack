import mongoose from "mongoose";

const SeleccionadoSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    id_usuario: { type: Number, required: true, index: true },
    id_voluntariado: { type: Number, required: true, index: true },
  },
  { timestamps: true }
);

// evitar duplicados por usuario+voluntariado
SeleccionadoSchema.index({ id_usuario: 1, id_voluntariado: 1 }, { unique: true });

export const Seleccionado =
  mongoose.models.Seleccionado || mongoose.model("Seleccionado", SeleccionadoSchema, "seleccionados");
