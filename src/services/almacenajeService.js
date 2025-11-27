// src//services/almacenajeService.js
import { getDb } from "../db/mongoClient.js";
import { CATEGORIAS, USUARIOS_INICIALES, VOLUNTARIADOS_INICIALES } from "../data/datos.js";

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
 * Devuelve el siguiente id numérico para una colección.
 * Busca el documento con mayor `id` y suma 1.
 *
 * @async
 * @param {import("mongodb").Db} db - Instancia de base de datos.
 * @param {string} collectionName   - Nombre de la colección.
 * @returns {Promise<number>} Siguiente identificador numérico disponible.
 */
async function getSiguienteNumeroId(db, collectionName) {
  const col = db.collection(collectionName);
  const last = await col.find().sort({ id: -1 }).limit(1).toArray();
  const currentMax = last.length && last[0].id ? last[0].id : 0;
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

/**
 * Devuelve todos los usuarios registrados.
 *
 * @async
 * @returns {Promise<Usuario[]>}
 */
export async function listarUsuarios() {
  const db = await getDb();
  return db.collection("usuarios").find().toArray();
}

/**
 * Busca un usuario por su email.
 *
 * @async
 * @param {string} email - Email del usuario.
 * @returns {Promise<Usuario|null>} Usuario encontrado o null.
 */
export async function buscarUsuarioPorEmail(email) {
  const db = await getDb();
  return db.collection("usuarios").findOne({ email });
}

/**
 * Busca un usuario por su id.
 *
 * @async
 * @param {number} id - Identificador del usuario.
 * @returns {Promise<Usuario|null>} Usuario encontrado o null.
 */
export async function buscarUsuarioPorId(id) {
  const db = await getDb();
  return db.collection("usuarios").findOne({ id });
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

/**
 * Borra un usuario por su email.
 *
 * @async
 * @param {string} email - Email del usuario a eliminar.
 * @returns {Promise<boolean>} `true` si se ha borrado, `false` si no existía.
 */
export async function borrarUsuario(email) {
  const db = await getDb();
  const resultado = await db.collection("usuarios").deleteOne({ email });
  return resultado.matchedCount === 1;
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
  const db = await getDb();
  const usuario = await db.collection("usuarios").findOne({ email, password });
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
  const db = await getDb();
  const coleccionVoluntariados = db.collection("voluntariados");

  const siguientId = await getSiguienteNumeroId(db, "voluntariados");
  const docuemento = { ...nuevoVoluntariado, id: siguientId };

  await coleccionVoluntariados.insertOne(docuemento);
  return docuemento;
}

/**
 * Devuelve todos los voluntariados.
 *
 * @async
 * @returns {Promise<Voluntariado[]>}
 */
export async function listarVoluntariados() {
  const db = await getDb();
  return db.collection("voluntariados").find().toArray();
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
  const db = await getDb();
  const coleccionVoluntariados = db.collection("voluntariados");

  const resultado = await coleccionVoluntariados.updateOne({ id }, { $set: voluntariadoActualizado });
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
  const db = await getDb();
  const resultado = await db.collection("voluntariados").deleteOne({ id });
  return resultado.matchedCount === 1;
}

/**
 * Devuelve los voluntariados creados por un usuario concreto.
 *
 * @async
 * @param {number} idUsuario - Id del usuario creador.
 * @returns {Promise<Voluntariado[]>}
 */
export async function voluntariadosPorUsuario(id_usuario) {
  const db = await getDb();
  return db.collection("voluntariados").find({ id_usuario: id_usuario }).toArray();
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
  const db = await getDb();
  const docs = await db.collection("categorias").find().sort({ id: 1 }).toArray();
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

/**
 * Lista todas las selecciones existentes.
 *
 * @async
 * @returns {Promise<Seleccionado[]>}
 */
export async function listarSeleccionados() {
  const db = await getDb();
  return db.collection("seleccionados").find().toArray();
}

/**
 * Lista las selecciones de un usuario concreto.
 *
 * @async
 * @param {number} id_usuario - Id del usuario.
 * @returns {Promise<Seleccionado[]>}
 */
export async function seleccionadosPorUsuario(id_usuario) {
  const db = await getDb();
  return db.collection("seleccionados").findOne({ id_usuario }).toArray();
}

/**
 * Borra una selección por su id.
 *
 * @async
 * @param {number} id - Id de la selección.
 * @returns {Promise<boolean>} `true` si se ha borrado, `false` si no existía.
 */
export async function borrarSeleccionado(id) {
  const db = await getDb();
  const resultado = await db.collection("seleccionados").deleteOne({ id });
  return resultado.matchedCount === 1;
}
