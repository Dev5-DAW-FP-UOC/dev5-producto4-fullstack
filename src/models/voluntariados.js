import mongoose from 'mongoose';

const voluntariadoSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
    trim: true
  },
  tipo: {
    type: String,
    enum: ['oferta', 'peticion'],
    required: true
  },
  categoria: {
    type: String,
    required: true
  },
  descripcion: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  fecha: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export const Voluntariado = mongoose.model('Voluntariado', voluntariadoSchema);