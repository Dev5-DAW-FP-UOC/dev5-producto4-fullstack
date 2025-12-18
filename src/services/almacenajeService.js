// src//services/almacenajeService.js

import { CATEGORIAS, USUARIOS_INICIALES, VOLUNTARIADOS_INICIALES } from "../data/datos.js";
import { Usuario } from "../models/Usuario.js";
import { Voluntariado } from "../models/Voluntariado.js";
import { Categoria } from "../models/Categoria.js";
import { Seleccionado } from "../models/Seleccionado.js";

/**
 * @typedef {Object} Usuario
 * @property {number} id            - Identificador numérico del usuario.
 * @property {string} nombre        - Nombre del usuario.
 * @property {string} email         - Email único del usuario.
 * @property {string} password      - Contraseña en texto plano (solo para práctica).
 * @property {string} rol           - Rol del usuario (ej. "admin", "user").
 */

/**
 * @typedef {Object} Voluntariado
 * @property {number} id            - Identificador numérico del voluntariado.
 * @property {string} type          - Tipo de voluntariado (ej. "oferta", "demanda").
 * @property {string} titulo        - Título del voluntariado.
 * @property {number} id_usuario    - Id del usuario creador.
 * @property {string} modalidad     - Modalidad (ej. "presencial", "online").
 * @property {string} categoria     - Categoría del voluntariado.
 * @property {string} resumen       - Descripción corta.
 * @property {string} fecha         - Fecha en formato de texto.
 */

/**
 * @typedef {Object} CategoriaDoc
 * @property {number} id            - Identificador de la categoría.
 * @property {string} nombre        - Nombre de la categoría.
 */

/**
 * @typedef {Object} Seleccionado
 * @property {number} id            - Identificador de la selección.
 * @property {number} id_usuario    - Id del usuario que selecciona.
 * @property {number} id_voluntariado - Id del voluntariado seleccionado.
 */

/* ========================================================================== */
/*  Helpers de inicialización                                                 */
/* ========================================================================== */

/**
 * Devuelve el siguiente id numérico disponible para un modelo Mongoose.
 * Busca el documento con el mayor valor del campo `field` y suma 1.
 *
 * Nota: en concurrencia alta puede colisionar (dos altas simultáneas).
 *
 * @param {import("mongoose").Model} Model - Modelo Mongoose (Usuario, Voluntariado, etc.)
 * @param {string} field - Nombre del campo numérico (por defecto "id")
 * @returns {Promise<number>} siguiente id
 */
export async function getSiguienteNumeroId(Model, field = "id") {
  const last = await Model.findOne({}, { [field]: 1 })
    .sort({ [field]: -1 })
    .lean();
  const currentMax = last?.[field] ?? 0;
  return currentMax + 1;
}

/**
 * Inicializa la base de datos con los datos de `datos.js` si las colecciones
 * se encuentran vacías. Esta función se ejecuta una sola vez al arrancar
 * el servidor.
 *
 * @async
 * @returns {Promise<void>}
 */
export async function initMongoData() {
  if ((await Usuario.countDocuments()) === 0) {
    await Usuario.insertMany(USUARIOS_INICIALES);
    console.log("[Mong/Mongoose] Usuarios iniciales insertados");
  }

  if ((await Voluntariado.countDocuments()) === 0) {
    await Voluntariado.insertMany(VOLUNTARIADOS_INICIALES);
    console.log("[Mongo/Mongoose] Voluntariados iniciales insertados");
  }

  if ((await Categoria.countDocuments()) === 0) {
    await Categoria.insertMany(CATEGORIAS.map((nombre, index) => ({ id: index, nombre })));
    console.log("[Mongo/Mongoose] Categorías iniciales insertadas");
  }
}

/* ========================================================================== */
/*  USUARIOS - CRUD + LOGIN                                                   */
/* ========================================================================== */

/* ------ CRUD - USUARIOS ------ */

/**
 * Crea un nuevo usuario.
 * Lanza un error si ya existe otro usuario con el mismo email.
 *
 * @async
 * @param {Omit<Usuario, "id">} nuevoUsuario - Datos del usuario sin el id.
 * @returns {Promise<Usuario>} Usuario creado con id asignado.
 * @throws {Error} Si ya existe un usuario con el mismo email.
 */
export async function altaUsuario(nuevoUsuario) {
  const email = nuevoUsuario.email?.toLowerCase().trim();

  const existe = await Usuario.findOne({ email }).lean();
  if (existe) {
    throw new Error("Ya existe este usuario con este email.");
  }

  const siguienteId = await getSiguienteNumeroId(Usuario);
  const documento = await Usuario.create({
    ...nuevoUsuario,
    id: siguienteId,
    email,
    rol: nuevoUsuario.rol ?? "user",
  });

  return documento.toObject();
}

/**
 * Devuelve todos los usuarios registrados.
 *
 * @async
 * @returns {Promise<Usuario[]>}
 */
export async function listarUsuarios() {
  return Usuario.find().lean();
}

/**
 * Busca un usuario por su email.
 *
 * @async
 * @param {string} email - Email del usuario.
 * @returns {Promise<Usuario|null>} Usuario encontrado o null.
 */
export async function buscarUsuarioPorEmail(email) {
  return Usuario.findOne({ email: email.toLowerCase().trim() }).lean();
}

/**
 * Busca un usuario por su id.
 *
 * @async
 * @param {number} id - Identificador del usuario.
 * @returns {Promise<Usuario|null>} Usuario encontrado o null.
 */
export async function buscarUsuarioPorId(id) {
  return Usuario.findOne({ id: Number(id) }).lean();
}

/**
 * Modifica los datos de un usuario localizando por su email original.
 * Si se actualiza el email, se comprueba que no esté ya utilizado por otro usuario.
 *
 * @async
 * @param {string} emailOriginal - Email actual del usuario.
 * @param {Partial<Omit<Usuario, "id">>} usuarioActualizado - Campos a actualizar.
 * @returns {Promise<boolean>} `true` si se ha modificado, `false` si no se ha encontrado
 *                              o el email nuevo ya estaba en uso.
 */
export async function modificarUsuario(emailOriginal, usuarioActualizado) {
  const emailOrig = emailOriginal.toLowerCase().trim();

  if (usuarioActualizado.email) {
    usuarioActualizado.email = usuarioActualizado.email.toLowerCase().trim();

    if (usuarioActualizado.email !== emailOrig) {
      const existe = await Usuario.findOne({ email: usuarioActualizado.email }).lean();
      if (existe) return false;
    }
  }

  const res = await Usuario.updateOne({ email: emailOrig }, { $set: usuarioActualizado });
  return res.matchedCount === 1;
}

/**
 * Borra un usuario por su email.
 *
 * @async
 * @param {string} email - Email del usuario a eliminar.
 * @returns {Promise<boolean>} `true` si se ha borrado, `false` si no existía.
 */
export async function borrarUsuario(email) {
  const resultado = await Usuario.deleteOne({ email: email.toLowerCase().trim() });
  return resultado.deletedCount === 1;
}

/* ------ LOGIN - USUARIOS ------ */

/**
 * Login sencillo: verifica el par email/password.
 *
 * @async
 * @param {string} email - Email del usuario.
 * @param {string} password - Contraseña en texto plano.
 * @returns {Promise<Usuario|null>} Usuario autenticado o null si credenciales incorrectas.
 */
export async function loginUsuario(email, password) {
  const e = email.toLowerCase().trim();
  const usuario = await Usuario.findOne({ email: e, password }).lean();
  return usuario || null;
}

/* ========================================================================== */
/*  VOLUNTARIADOS - CRUD + CONSULTAS                                          */
/* ========================================================================== */

/* ------ CRUD - VOLUNTARIADOS ------ */

/**
 * Crea un nuevo voluntariado con id incremental.
 *
 * @async
 * @param {Omit<Voluntariado, "id">} nuevoVoluntariado - Datos del voluntariado sin id.
 * @returns {Promise<Voluntariado>} Voluntariado creado.
 */
export async function altaVoluntariado(nuevoVoluntariado) {
  const siguienteId = await getSiguienteNumeroId(Voluntariado);

  const docuemento = await Voluntariado.create({
    ...nuevoVoluntariado,
    id: siguienteId,
  });

  return docuemento.toObject();
}

/**
 * Devuelve todos los voluntariados.
 *
 * @async
 * @returns {Promise<Voluntariado[]>}
 */
export async function listarVoluntariados() {
  return Voluntariado.find().lean();
}

/**
 * Modifica un voluntariado localizando por su id.
 *
 * @async
 * @param {number} id - Identificador del voluntariado.
 * @param {Partial<Omit<Voluntariado, "id">>} voluntariadoActualizado - Campos a actualizar.
 * @returns {Promise<boolean>} `true` si se ha modificado, `false` si no existía.
 */
export async function modificarVoluntariado(id, voluntariadoActualizado) {
  const resultado = await Voluntariado.updateOne({ id: Number(id) }, { $set: voluntariadoActualizado });
  return resultado.matchedCount === 1;
}

/**
 * Borra un voluntariado por su id.
 *
 * @async
 * @param {number} id - Id del voluntariado.
 * @returns {Promise<boolean>} `true` si se ha borrado, `false` si no existía.
 */
export async function borrarVoluntariado(id) {
  const resultado = await Voluntariado.deleteOne({ id: Number(id) });
  return resultado.deletedCount === 1;
}

/**
 * Devuelve los voluntariados creados por un usuario concreto.
 *
 * @async
 * @param {number} idUsuario - Id del usuario creador.
 * @returns {Promise<Voluntariado[]>}
 */
export async function voluntariadosPorUsuario(id_usuario) {
  return Voluntariado.find({ id_usuario: Number(id_usuario) }).lean();
}

/* ========================================================================== */
/*  CATEGORÍAS                                                                */
/* ========================================================================== */

/**
 * Devuelve la lista de nombres de categoría, en orden de id.
 *
 * @async
 * @returns {Promise<string[]>} Array de nombres de categoría.
 */
export async function getCategorias() {
  const docs = await Categoria.find({}, { nombre: 1, _id: 0 }).sort({ nombre: 1 }).lean();

  return docs.map((c) => c.nombre);
}

/* ========================================================================== */
/*  SELECCIONADOS (relación usuario-voluntariado)                             */
/* ========================================================================== */

/**
 * Guarda un voluntariado como seleccionado por un usuario.
 * Comprueba que existan el usuario y el voluntariado y evita duplicados.
 *
 * @async
 * @param {number} id_usuario      - Id del usuario.
 * @param {number} id_voluntariado - Id del voluntariado.
 * @returns {Promise<Seleccionado>} Documento de selección creado.
 * @throws {Error} Si el usuario o el voluntariado no existen
 *                 o si ya había una selección igual.
 */
export async function guardarSeleccionado(id_usuario, id_voluntariado) {
  const userId = Number(id_usuario);
  const volId = Number(id_voluntariado);

  const usuarioExiste = await Usuario.findOne({ id: userId }).lean();
  if (!usuarioExiste) {
    throw new Error("Usuario no encontrado para id_usuario=" + userId);
  }

  const voluntariadoExiste = await Voluntariado.findOne({ id: volId }).lean();
  if (!voluntariadoExiste) {
    throw new Error("Voluntariado no encontrado para id_voluntariado=" + volId);
  }

  // Duplicados
  const yaExiste = await Seleccionado.findOne({ id_usuario: userId, id_voluntariado: volId }).lean();
  if (yaExiste) {
    throw new Error("Este voluntariado ya está seleccionado por este usuario.");
  }

  const siguienteId = await getSiguienteNumeroId(Seleccionado, "id");

  const doc = await Seleccionado.create({
    id: siguienteId,
    id_usuario: userId,
    id_voluntariado: volId,
  });

  return doc.toObject();
}

/**
 * Lista todas las selecciones existentes.
 *
 * @async
 * @returns {Promise<Seleccionado[]>}
 */
export async function listarSeleccionados() {
  return await Seleccionado.find().lean();
}

/**
 * Lista las selecciones de un usuario concreto.
 *
 * @async
 * @param {number} id_usuario - Id del usuario.
 * @returns {Promise<Seleccionado[]>}
 */
export async function seleccionadosPorUsuario(id_usuario) {
  return await Seleccionado.find({ id_usuario: Number(id_usuario) }).lean();
}

/**
 * Borra una selección por su id.
 *
 * @async
 * @param {number} id - Id de la selección.
 * @returns {Promise<boolean>} `true` si se ha borrado, `false` si no existía.
 */
export async function borrarSeleccionado(id) {
  const res = await Seleccionado.deleteOne({ id: Number(id) });
  return res.deletedCount === 1;
}
