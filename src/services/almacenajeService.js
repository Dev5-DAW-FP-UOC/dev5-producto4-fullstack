import { Usuario } from "../models/usuarios.js";
import { Voluntariado } from "../models/voluntariados.js";
import { Categoria } from "../models/categoria.js";
import { Seleccionado } from "../models/seleccionados.js";
import { CATEGORIAS, USUARIOS_INICIALES, VOLUNTARIADOS_INICIALES } from "../data/datos.js";

// --- Inicialización ---

export async function initMongoData() {
  try {
    const countUsuarios = await Usuario.countDocuments();
    if (countUsuarios === 0) {
      await Usuario.insertMany(USUARIOS_INICIALES);
      console.log("[Mongoose] Usuarios iniciales insertados");
    }

    const countVols = await Voluntariado.countDocuments();
    if (countVols === 0) {
      await Voluntariado.insertMany(VOLUNTARIADOS_INICIALES);
      console.log("[Mongoose] Voluntariados iniciales insertados");
    }

    const countCats = await Categoria.countDocuments();
    if (countCats === 0) {
      const categoriasDocs = CATEGORIAS.map(nombre => ({ nombre }));
      await Categoria.insertMany(categoriasDocs);
      console.log("[Mongoose] Categorías iniciales insertadas");
    }
  } catch (error) {
    console.error("[Mongoose] Error en la inicialización de datos:", error);
  }
}

// --- Usuarios ---

export async function altaUsuario(nuevoUsuario) {
  const usuario = await Usuario.create(nuevoUsuario);
  return usuario;
}

export async function listarUsuarios() {
  return await Usuario.find().lean();
}

export async function buscarUsuarioPorEmail(email) {
  return await Usuario.findOne({ email });
}

export async function buscarUsuarioPorId(id) {
  return await Usuario.findById(id);
}

export async function modificarUsuario(emailOriginal, datosActualizar) {
  const usuario = await Usuario.findOneAndUpdate(
    { email: emailOriginal },
    datosActualizar,
    { new: true, runValidators: true }
  );
  return !!usuario;
}

export async function borrarUsuario(email) {
  const resultado = await Usuario.deleteOne({ email });
  return resultado.deletedCount === 1;
}

export async function loginUsuario(email, password) {
  const usuario = await Usuario.findOne({ email, password });
  return usuario;
}

// --- Voluntariados ---

export async function altaVoluntariado(nuevoVoluntariado) {
  const voluntariado = await Voluntariado.create(nuevoVoluntariado);
  return voluntariado;
}

export async function listarVoluntariados() {
  return await Voluntariado.find().lean();
}

export async function modificarVoluntariado(id, datosActualizar) {
  const voluntariado = await Voluntariado.findByIdAndUpdate(
    id,
    datosActualizar,
    { new: true, runValidators: true }
  );
  return !!voluntariado;
}

export async function borrarVoluntariado(id) {
  const resultado = await Voluntariado.findByIdAndDelete(id);
  return !!resultado;
}

export async function voluntariadosPorUsuario(idUsuario) {
  const usuario = await Usuario.findById(idUsuario);
  if (!usuario) return [];
  return await Voluntariado.find({ email: usuario.email });
}

// --- Categorías ---

export async function getCategorias() {
  const categorias = await Categoria.find().sort({ nombre: 1 });
  return categorias.map(c => c.nombre);
}

// --- Seleccionados ---

export async function guardarSeleccionado(idUsuario, idVoluntariado) {
  const usuario = await Usuario.findById(idUsuario);
  if (!usuario) throw new Error("Usuario no encontrado");

  const voluntariado = await Voluntariado.findById(idVoluntariado);
  if (!voluntariado) throw new Error("Voluntariado no encontrado");

  const seleccion = await Seleccionado.create({
    usuario: idUsuario,
    voluntariado: idVoluntariado
  });
  
  return seleccion;
}

export async function seleccionadosPorUsuario(idUsuario) {
  const selecciones = await Seleccionado.find({ usuario: idUsuario })
    .populate('voluntariado');
  return selecciones;
}

export async function borrarSeleccionado(id) {
  const resultado = await Seleccionado.findByIdAndDelete(id);
  return !!resultado;
}