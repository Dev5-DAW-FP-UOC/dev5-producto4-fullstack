import mongoose from "mongoose";

const VoluntarioadoSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["oferta", "peticion"],
    },
    titulo: {
      type: String,
      required: true,
      trim: true,
      minlength: 4,
    },
    id_usuario: {
      type: Number,
      required: true,
      trim: true,
      index: true,
    },
    modalidad: {
      type: String,
      required: true,
      enum: ["Online", "Presencial"],
    },
    categoria: {
      type: String,
      required: true,
      trim: true,
    },
    resumen: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
    },
    fecha: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Voluntariado = mongoose.models.Voluntariado || mongoose.model("Voluntariado", VoluntarioadoSchema, "voluntariados");
