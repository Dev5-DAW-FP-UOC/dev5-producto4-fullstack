// src//services/almacenajeService.js
import { getDb } from "../db/mongoClient.js";
import { CATEGORIAS, USUARIOS_INICIALES, VOLUNTARIADOS_INICIALES } from "../data/datos.js";
import { SingleFieldSubscriptionsRule } from "graphql";

/**
 * Helper para obtener el siguiente id numérico de una colección.
 * Busca el doc con mayor "id" y suma 1.
 */
async function getSiguienteNumeroId(db, collectionName) {
  const col = db.collection(collectionName);
  const last = await col.find().sort({ id: -1 }).limit(1).toArray();
  const currentMax = last.length && last[0].id ? last[0].id : 0;
  return currentMax + 1;
}

/**
 * Inicializa la base de datos con los datos de datos.js si está vacía.
 */
export async function initMongoData() {
  const db = await getDb();
  const usuariosCol = db.collection("usuarios");
  const voluntariadosCol = db.collection("voluntariados");
  const categoriasCol = db.collection("categorias");

  if ((await usuariosCol.countDocuments()) === 0) {
    await usuariosCol.insertMany(USUARIOS_INICIALES);
    console.log("[Mongo] Usuarios iniciales insertados");
  }

  if ((await voluntariadosCol.countDocuments()) === 0) {
    await voluntariadosCol.insertMany(VOLUNTARIADOS_INICIALES);
    console.log("[Mongo] Voluntariados iniciales insertados");
  }

  if ((await categoriasCol.countDocuments()) === 0) {
    await categoriasCol.insertMany(CATEGORIAS.map((nombre, index) => ({ id: index, nombre })));
    console.log("[Mongo] Categorías iniciales insertadas");
  }
}

// =============================
//   USUARIOS
// =============================

// ------ CRUD - USUARIOS ------

export async function altaUsuario(nuevoUsuario) {
  const db = await getDb();
  const coleccionUsuarios = db.collection("usuarios");

  const existe = await coleccionUsuarios.findOne({ email: nuevoUsuario.email });
  if (existe) {
    throw new Error("Ya existe este usuario con este email.");
  }

  const siguienteId = await getSiguienteNumeroId(db, "usuarios");
  const documento = { ...nuevoUsuario, id: siguienteId };

  await coleccionUsuarios.insertOne(documento);
  return documento;
}

export async function listarUsuarios() {
  const db = await getDb();
  return db.collection("usuarios").find().toArray();
}

export async function buscarUsuarioPorEmail(email) {
  const db = await getDb();
  return db.collection("usuarios").findOne({ email });
}

export async function buscarUsuarioPorId(id) {
  const db = await getDb();
  return db.collection("usuarios").findOne({ id });
}

export async function modificarUsuario(emailOriginal, usuarioActualizado) {
  const db = await getDb();
  const coleccionUsuarios = db.collection("usuarios");

  // Si se cambia el email, se comprueba que no esté usado por otro usuario
  if (usuarioActualizado.email && usuarioActualizado.email !== emailOriginal) {
    const emailUsuarioExiste = await coleccionUsuarios.findOne({ email: usuarioActualizado.email });
    if (emailUsuarioExiste && emailUsuarioExiste !== emailOriginal) {
      return false;
    }
  }
  //
  const resultado = await col.updateOne({ email: emailOriginal }, { $set: usuarioActualizado });
  //
  return resultado.matchedCount === 1;
}

export async function borrarUsuario(email) {
  const db = await getDb();
  const resultado = await db.collection("usuarios").deleteOne({ email });
  return resultado.matchedCount === 1;
}

// ------ LOGIN simple ------
/**
 * Verifica email/password y devuelve el usuario o null.
 */
export async function loginUsuario(email, password) {
  const db = await getDb();
  const usuario = await db.collection("usuarios").findOne({ email, password });
  return usuario || null;
}

// ==================================
//   VOLUNTARIADOS
// ==================================

// ------ CRUD - VOLUNTARIADOS ------

export async function altaVoluntariado(nuevoVoluntariado) {
  const db = await getDb();
  const coleccionVoluntariados = db.collection("voluntariados");

  const siguientId = await getSiguienteNumeroId(db, "voluntariados");
  const docuemento = { ...nuevoVoluntariado, id: siguientId };

  await coleccionVoluntariados.insertOne(docuemento);
  return docuemento;
}

export async function listarVoluntariados() {
  const db = await getDb();
  return db.collection("voluntariados").find().toArray();
}

export async function modificarVoluntariado(id, voluntariadoActualizado) {
  const db = await getDb();
  const coleccionVoluntariados = db.collection("voluntariados");

  const resultado = await coleccionVoluntariados.updateOne({ id }, { $set: voluntariadoActualizado });
  return resultado.matchedCount === 1;
}

export async function borrarVoluntariado(id) {
  const db = await getDb();
  const resultado = await db.collection("voluntariados").deleteOne({ id });
  return resultado.matchedCount === 1;
}

// Voluntariados de un usuario concreto
export async function voluntariadosPorUsuario(id_usuario) {
  const db = await getDb();
  return db.collection("voluntariados").find({ id_usuario: id_usuario }).toArray();
}

export async function getCategorias() {
  const db = await getDb();
  const docs = await db.collection("categorias").find().sort({ id: 1 }).toArray();
  return docs.map((c) => c.nombre);
}

/* =====================================
 *  SELECCIONADOS - RELACIÓN USUARIO/VOLUNTARIADO
 * ===================================== */

/**
 * Guarda un voluntariado como seleccionado por un usuario.
 * Comprueba que existan el usuario y el voluntariado.
 * @param {number} id_usuario
 * @param {number} id_voluntariado
 * @returns {Object} seleccionado creado { id, id_usuario, id_voluntariado }
 */
export async function guardarSeleccionado(id_usuario, id_voluntariado) {
  const db = await getDb();
  const coleccionSeleccionados = db.collection("seleccionados");
  const coleccionUsuarios = db.collection("usuarios");
  const coleccionVoluntariados = db.collection("voluntariados");

  const usuarioExiste = await coleccionUsuarios.findOne({ id: id_usuario });
  if (!usuarioExiste) {
    throw new Error("Usuario no encontrado para id_usuario=" + id_usuario);
  }

  const voluntariadoExiste = await coleccionVoluntariados.findOne({ id: id_voluntariado });
  if (!voluntariadoExiste) {
    throw new Error("Voluntariado no encontrado para id_voluntariado=" + id_voluntariado);
  }

  const yaExiste = await coleccionSeleccionados.findOne({ id_usuario, id_voluntariado });
  if (yaExiste) {
    throw new Error("Este voluntariado ya está seleccionado por este usuario.");
  }

  const siguienteId = await getSiguienteNumeroId(db, "seleccionados");
  const documento = { id: siguienteId, id_usuario, id_voluntariado };

  await coleccionSeleccionados.insertOne(documento);
  return documento;
}

export async function listarSeleccionados() {
  const db = await getDb();
  return db.collection("seleccionados").find().toArray();
}

export async function seleccionadosPorUsuario(id_usuario) {
  const db = await getDb();
  return db.collection("seleccionados").findOne({ id_usuario }).toArray();
}

export async function borrarSeleccionado(id) {
  const db = await getDb();
  const resultado = await db.collection("seleccionados").deleteOne({ id });
  return resultado.matchedCount === 1;
}
