import mongoose from "mongoose";

const SeleccionadoSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      trim: true,
      unique: true,
    },
    id_usuario: {
      type: Number,
      required: true,
      trim: true,
    },
    id_voluntariado: {
      type: Number,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

SeleccionadoSchema.index({ id_usuario: 1, id_voluntariado: 1 }, { unique: true });

export const Seleccionado = mongoose.models.Seleccionado || mongoose.model("Seleccionado", SeleccionadoSchema, "seleccionados");
