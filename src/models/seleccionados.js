import mongoose from 'mongoose';

const seleccionadoSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  voluntariado: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Voluntariado',
    required: true
  },
  fechaSeleccion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Evitar que un usuario seleccione el mismo voluntariado dos veces
seleccionadoSchema.index({ usuario: 1, voluntariado: 1 }, { unique: true });

export const Seleccionado = mongoose.model('Seleccionado', seleccionadoSchema);