// src/services/almacenajeService.js
import { CATEGORIAS, USUARIOS_INICIALES, VOLUNTARIADOS_INICIALES } from "../data/datos.js";

import { Usuario } from "../models/Usuario.js";
import { Voluntariado } from "../models/Voluntariado.js";
import { Categoria } from "../models/Categoria.js";
import { Seleccionado } from "../models/Seleccionado.js";

/**
 * Helpers
 */

// Devuelve el siguiente id numérico (incremental) basado en el máximo "id" existente
async function getSiguienteNumeroId(Model) {
  const last = await Model.findOne({}, { id: 1 }).sort({ id: -1 }).lean();
  return (last?.id ?? 0) + 1;
}

/**
 * Seed / Inicialización
 * Inserta datos iniciales solo si las colecciones están vacías.
 */
export async function initMongoData() {
  if ((await Usuario.countDocuments()) === 0) {
    await Usuario.insertMany(USUARIOS_INICIALES);
    console.log("[Mongoose] Usuarios iniciales insertados");
  }

  if ((await Voluntariado.countDocuments()) === 0) {
    await Voluntariado.insertMany(VOLUNTARIADOS_INICIALES);
    console.log("[Mongoose] Voluntariados iniciales insertados");
  }

  if ((await Categoria.countDocuments()) === 0) {
    // Guardamos sin "Todas" porque es filtro de UI, no categoría real
    const cats = CATEGORIAS.filter((c) => c !== "Todas").map((nombre, idx) => ({
      id: idx + 1,
      nombre,
    }));
    await Categoria.insertMany(cats);
    console.log("[Mongoose] Categorías iniciales insertadas");
  }
}

/* ========================================================================== */
/*  USUARIOS - CRUD + LOGIN                                                   */
/* ========================================================================== */

export async function altaUsuario(nuevoUsuario) {
  const existe = await Usuario.findOne({ email: nuevoUsuario.email }).lean();
  if (existe) throw new Error("Ya existe este usuario con este email.");

  const id = await getSiguienteNumeroId(Usuario);
  const doc = await Usuario.create({ ...nuevoUsuario, id });
  return doc.toObject();
}

export async function listarUsuarios() {
  return Usuario.find().lean();
}

export async function buscarUsuarioPorEmail(email) {
  return Usuario.findOne({ email }).lean();
}

export async function buscarUsuarioPorId(id) {
  return Usuario.findOne({ id }).lean();
}

export async function modificarUsuario(emailOriginal, usuarioActualizado) {
  // Si cambia el email, comprobar que no esté usado
  if (usuarioActualizado.email && usuarioActualizado.email !== emailOriginal) {
    const existe = await Usuario.findOne({ email: usuarioActualizado.email }).lean();
    if (existe) return false;
  }

  const res = await Usuario.updateOne({ email: emailOriginal }, { $set: usuarioActualizado });
  return res.matchedCount === 1;
}

export async function borrarUsuario(email) {
  const res = await Usuario.deleteOne({ email });
  return res.deletedCount === 1;
}

export async function loginUsuario(email, password) {
  return Usuario.findOne({ email, password }).lean();
}

/* ========================================================================== */
/*  VOLUNTARIADOS - CRUD + CONSULTAS                                          */
/* ========================================================================== */

export async function altaVoluntariado(nuevoVoluntariado) {
  const id = await getSiguienteNumeroId(Voluntariado);
  const doc = await Voluntariado.create({ ...nuevoVoluntariado, id });
  return doc.toObject();
}

export async function modificarVoluntariado(id, voluntariadoActualizado) {
  const res = await Voluntariado.updateOne({ id }, { $set: voluntariadoActualizado });
  return res.matchedCount === 1;
}

export async function listarVoluntariados() {
  const vols = await Voluntariado.find().lean();
  return attachNombreUsuario(vols);
}
export async function borrarVoluntariado(id) {
  const res = await Voluntariado.deleteOne({ id });
  return res.deletedCount === 1;
}

export async function voluntariadosPorUsuario(id_usuario) {
  const vols = await Voluntariado.find({ id_usuario }).lean();
  return attachNombreUsuario(vols);
}


/* ========================================================================== */
/*  CATEGORÍAS                                                                */
/* ========================================================================== */

export async function getCategorias() {
  const docs = await Categoria.find().sort({ id: 1 }).lean();
  return docs.map((c) => c.nombre);
}

/* ========================================================================== */
/*  SELECCIONADOS (relación usuario-voluntariado)                             */
/* ========================================================================== */

export async function guardarSeleccionado(id_usuario, id_voluntariado) {
  const usuarioExiste = await Usuario.findOne({ id: id_usuario }).lean();
  if (!usuarioExiste) throw new Error("Usuario no encontrado para id_usuario=" + id_usuario);

  const voluntariadoExiste = await Voluntariado.findOne({ id: id_voluntariado }).lean();
  if (!voluntariadoExiste) throw new Error("Voluntariado no encontrado para id_voluntariado=" + id_voluntariado);

  const yaExiste = await Seleccionado.findOne({ id_usuario, id_voluntariado }).lean();
  if (yaExiste) throw new Error("Este voluntariado ya está seleccionado por este usuario.");

  const id = await getSiguienteNumeroId(Seleccionado);
  const doc = await Seleccionado.create({ id, id_usuario, id_voluntariado });
  return doc.toObject();
}

// Enriquecer voluntariados con el nombre del usuario
async function attachNombreUsuario(vols) {
  if (!Array.isArray(vols) || vols.length === 0) return [];

  const users = await Usuario.find({}, { id: 1, nombre: 1 }).lean();
  const map = new Map(users.map(u => [u.id, u.nombre]));

  return vols.map(v => ({
    ...v,
    nombre_usuario: map.get(v.id_usuario) || "Desconocido",
  }));
}


export async function listarSeleccionados() {
  return Seleccionado.find().lean();
}

export async function seleccionadosPorUsuario(id_usuario) {
  return Seleccionado.find({ id_usuario }).lean();
}

export async function borrarSeleccionado(id) {
  const res = await Seleccionado.deleteOne({ id });
  return res.deletedCount === 1;
}
