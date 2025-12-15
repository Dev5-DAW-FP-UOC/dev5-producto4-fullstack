import mongoose from "mongoose";

const VoluntariadoSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    type: { type: String, required: true, enum: ["oferta", "peticion"] },
    titulo: { type: String, required: true, trim: true, minlength: 4 },
    id_usuario: { type: Number, required: true, index: true },
    modalidad: { type: String, required: true, enum: ["Online", "Presencial"] },
    categoria: { type: String, required: true, trim: true },
    resumen: { type: String, required: true, trim: true, minlength: 10 },
    fecha: { type: String, required: true },
  },
  { timestamps: true }
);

// índice útil para listar por usuario + ordenar por fecha
VoluntariadoSchema.index({ id_usuario: 1, fecha: -1 });

export const Voluntariado =
  mongoose.models.Voluntariado || mongoose.model("Voluntariado", VoluntariadoSchema, "voluntariados");
