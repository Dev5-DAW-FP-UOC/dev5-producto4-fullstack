// src//services/almacenajeService.js
import { CATEGORIAS, USUARIOS_INICIALES, VOLUNTARIADOS_INICIALES } from "../data/datos.js";
import Usuario from "../models/Usuarios.js";
import Voluntariado from "../models/Voluntariados.js";
import Categoria from "../models/Categorias.js";
import Seleccionado from "../models/Seleccionados.js";
import bcrypt from 'bcryptjs';

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
 * Inicializa la base de datos con los datos de `datos.js` si las colecciones
 * se encuentran vacías. Esta función se ejecuta una sola vez al arrancar
 * el servidor.
 *
 * @async
 * @returns {Promise<void>}
 */
export async function initMongoData() {
  // Usuarios
  for (const u of USUARIOS_INICIALES) {
    try {
      // hash password before inserting initial users
      const copy = { ...u };
      if (copy.password) copy.password = await bcrypt.hash(copy.password, 10);
      await Usuario.create(copy);
      console.log(`Inserted user: ${u.nombre}`);
    } catch (e) {
      console.log(`User ${u.nombre} already exists`);
      // Ensure existing user's password is hashed. If the user was created
      // in an earlier run with a plain password, re-hash it now.
      try {
        const existing = await Usuario.findOne({ email: u.email });
        if (existing && existing.password && !String(existing.password).startsWith('$2')) {
          const newHash = await bcrypt.hash(String(existing.password), 10);
          existing.password = newHash;
          await existing.save();
          console.log(`Re-hashed password for existing user ${u.email}`);
        }
      } catch (err2) {
        console.log('Error ensuring hashed password for', u.email, err2 && err2.message);
      }
    }
  }
  console.log("[Mongo] Usuarios iniciales insertados");

  // Voluntariados
  for (const v of VOLUNTARIADOS_INICIALES) {
    try {
      await Voluntariado.create(v);
      console.log(`Inserted voluntariado: ${v.titulo}`);
    } catch (e) {
      console.log(`Voluntariado ${v.titulo} already exists`);
    }
  }
  console.log("[Mongo] Voluntariados iniciales insertados");

  // Categorías
  for (let i = 0; i < CATEGORIAS.length; i++) {
    const nombre = CATEGORIAS[i];
    try {
      await Categoria.create({ id: i, nombre });
      console.log(`Inserted categoria: ${nombre}`);
    } catch (e) {
      console.log(`Categoria ${nombre} already exists`);
    }
  }
  console.log("[Mongo] Categorías iniciales insertadas");
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
  const existe = await Usuario.findOne({ email: nuevoUsuario.email });
  if (existe) throw new Error("Ya existe este usuario con este email.");

  const max = await Usuario.findOne().sort({ id: -1 }).select({ id: 1 }).lean();
  const siguienteId = max ? max.id + 1 : 1;
  const toCreate = { ...nuevoUsuario, id: siguienteId };
  if (toCreate.password) {
    toCreate.password = await bcrypt.hash(String(toCreate.password), 10);
  }
  const creado = await Usuario.create(toCreate);
  return creado.toObject();
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
  return Usuario.findOne({ email }).lean();
}

/**
 * Busca un usuario por su id.
 *
 * @async
 * @param {number} id - Identificador del usuario.
 * @returns {Promise<Usuario|null>} Usuario encontrado o null.
 */
export async function buscarUsuarioPorId(id) {
  return Usuario.findOne({ id }).lean();
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
  if (usuarioActualizado.email && usuarioActualizado.email !== emailOriginal) {
    const emailUsuarioExiste = await Usuario.findOne({ email: usuarioActualizado.email });
    if (emailUsuarioExiste) return false;
  }

  const resultado = await Usuario.updateOne({ email: emailOriginal }, { $set: usuarioActualizado });
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
  const resultado = await Usuario.deleteOne({ email });
  return resultado.deletedCount === 1;
}

/**
 * Borra un usuario por su id numérico.
 * @param {number|string} id - Id numérico del usuario.
 * @returns {Promise<boolean>} true si se borró.
 */
export async function borrarUsuarioPorId(id) {
  const resultado = await Usuario.deleteOne({ id: Number(id) });
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
  const usuario = await Usuario.findOne({ email }).lean();
  if (!usuario) return null;
  const ok = await bcrypt.compare(String(password), String(usuario.password));
  return ok ? usuario : null;
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
  const max = await Voluntariado.findOne().sort({ id: -1 }).select({ id: 1 }).lean();
  const siguienteId = max ? max.id + 1 : 1;
  const creado = await Voluntariado.create({ ...nuevoVoluntariado, id: siguienteId });
  return creado.toObject();
}

/**
 * Devuelve todos los voluntariados.
 *
 * @async
 * @returns {Promise<Voluntariado[]>}
 */
export async function listarVoluntariados() {
  const voluntariados = await Voluntariado.find().lean();
  return voluntariados;
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
  const resultado = await Voluntariado.updateOne({ id }, { $set: voluntariadoActualizado });
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
  const resultado = await Voluntariado.deleteOne({ id });
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
  return Voluntariado.find({ id_usuario }).lean();
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
  const docs = await Categoria.find().sort({ id: 1 }).lean();
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
  const usuarioExiste = await Usuario.findOne({ id: id_usuario });
  if (!usuarioExiste) throw new Error("Usuario no encontrado para id_usuario=" + id_usuario);

  const voluntariadoExiste = await Voluntariado.findOne({ id: id_voluntariado });
  if (!voluntariadoExiste) throw new Error("Voluntariado no encontrado para id_voluntariado=" + id_voluntariado);

  const yaExiste = await Seleccionado.findOne({ id_usuario, id_voluntariado });
  if (yaExiste) throw new Error("Este voluntariado ya está seleccionado por este usuario.");

  const max = await Seleccionado.findOne().sort({ id: -1 }).select({ id: 1 }).lean();
  const siguienteId = max ? max.id + 1 : 1;

  const creado = await Seleccionado.create({ id: siguienteId, id_usuario, id_voluntariado });
  return creado.toObject();
}

/**
 * Lista todas las selecciones existentes.
 *
 * @async
 * @returns {Promise<Seleccionado[]>}
 */
export async function listarSeleccionados() {
  return Seleccionado.find().lean();
}

/**
 * Lista las selecciones de un usuario concreto.
 *
 * @async
 * @param {number} id_usuario - Id del usuario.
 * @returns {Promise<Seleccionado[]>}
 */
export async function seleccionadosPorUsuario(id_usuario) {
  return Seleccionado.find({ id_usuario }).lean();
}

/**
 * Borra una selección por su id.
 *
 * @async
 * @param {number} id - Id de la selección.
 * @returns {Promise<boolean>} `true` si se ha borrado, `false` si no existía.
 */
export async function borrarSeleccionado(id) {
  const resultado = await Seleccionado.deleteOne({ id });
  return resultado.deletedCount === 1;
}
