// js/almacenaje.js

import { datos } from "./datos.js";

/**
 * Inicializa los usuarios en localStorage si no existen todavía y en IndexedDB.
 */
export async function inicializarDatos() {
  const usuariosExisten = localStorage.getItem("usuarios");
  if (!usuariosExisten) {
    localStorage.setItem("usuarios", JSON.stringify(datos.usuarios));
    console.log("Usuarios iniciales cargados en localStorage");
  }

  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("voluntariados", "readonly");
    const store = tx.objectStore("voluntariados");
    const countRequest = store.count();
    countRequest.onsuccess = async function () {
      if (countRequest.result === 0) {
        // Si está vacío, agregamos los de ejemplo
        const txAdd = db.transaction("voluntariados", "readwrite");
        const storeAdd = txAdd.objectStore("voluntariados");
        for (const v of datos.voluntariados) {
          storeAdd.add({
          ...v,
          creadoPor: v.creadoPor || v.autor || "Anónimo" // ← usa autor si creadoPor no existe
         });
        }
        txAdd.oncomplete = () => {
          console.log("Voluntariados inicales cargados en IndexedDB");
          resolve(true);
        };
        txAdd.onerror = reject;
      } else {
        resolve(false); // Ya había datos, no se carga nada
      }
    };
    countRequest.onerror = reject;
  });
}

// Categorías disponibles para filtros, tabs, etc.
export function getCategorias() {
  return datos.categorias || ["Todas"];
}
// Seleccion voluntariados propios
export function getSeleccion(){
  return datos.seleccion || ["Todos"];
}

// === CRUD y autenticación para la app de voluntariado ===

// ------ Usuarios (LocalStorage) ------

/**
 * Añade un nuevo usuario al sistema y lo guarda en localStorage.
 * Si ya existe un usuario con el mismo email, no lo añade y retorna false.
 * @param {Object} usuario - Debe tener { nombre, email, contraseña, rol }
 * @returns {boolean} true si fue añadido, false si ya existía ese email
 */
export function altaUsuario(usuario) {
  let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  const existeUsuario = usuarios.some((u) => u.email === usuario.email);
  if (existeUsuario) {
    return false;
  }
  usuarios.push(usuario);
  localStorage.setItem("usuarios", JSON.stringify(usuarios));
  return true;
}

/**
 * Devuelve un array con todos los usuarios regsitrados.
 */
export function listarUsuarios() {
  const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  return usuarios;
}

/**
 * Modifica los datos de un usuario existente en localSotrage.
 * Busca el usuario por su email (clave única).
 * @param {string} emailOriginal - El email del usuario (clave única)
 * @param {Object} usuarioActualizado - Objeto con los nuevos datos {nombre, email, contraseña, rol}
 * @returns {boolean} true si se modificó correctamente, false si no existía el usuario
 */
export function modificarUsuario(emailOriginal, usuarioActualizado) {
  let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  const indice = usuarios.findIndex((u) => u.email === emailOriginal);
  if (indice === -1) {
    return false; // No se encontró el usuario
  }
  if (usuarioActualizado.email !== emailOriginal) {
    const emailUsuarioExiste = usuarios.some((u) => u.email === usuarioActualizado.email);
    if (emailUsuarioExiste) {
      return false; // No permite modificar el email a uno que ya existe en otro usuario
    }
  }
  usuarios[indice] = usuarioActualizado;
  localStorage.setItem("usuarios", JSON.stringify(usuarios));
  return true;
}

/**
 * Elimina un usuario del localStorage por su email.
 * @param {string} email - Email del usuario a eliminar
 * @retuns {boolean} true si eliminó el usuario, false si no existía
 */
export function borrarUsuario(email) {
  let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

  const indice = usuarios.findIndex((u) => u.email === email);
  if (indice === -1) {
    return false; // No existe ese usuario
  }
  usuarios.splice(indice, 1);
  localStorage.setItem("usuarios", JSON.stringify(usuarios));
  return true;
}

/**
 * Verifica usuario/contraseña y devuelve el usuario si existe.
 * @param {string} email
 * @param {string} password
 * @return {Object|null} El objeto usuario si autenticación OK, null si no concide.
 */
export function loguearUsuario(email, password) {
  const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  const usuario = usuarios.find((u) => u.email === email && u.password === password);
  return usuario || null;
}

/**
 * Guarda el usuario activo en localStorage.
 * @param {string} usuario
 */
export function guardarUsuarioActivo(email) {
  localStorage.setItem("usuarioActivo", email);
}

/**
 * Recupera el email del usario activo o null si no hay sesión.
 * @returns {string|null}
 */
export function obtenerUsuarioActivo() {
  return localStorage.getItem("usuarioActivo");
}

/**
 * Cierra sesión.
 */
export function logoutUsuario() {
  localStorage.removeItem("usuarioActivo");
}

// Devuelve el objeto usuario activo, o null si no hay
export function getActiveUser() {
  const email = obtenerUsuarioActivo(); // string o null
  if (!email) return null;

  const usuarios = listarUsuarios() || []; // del localStorage / datos
  return usuarios.find((u) => u.email === email) || null;
}

// (Opcional) helper rápido para comprobar si hay login
export function isLoggedIn() {
  return !!getActiveUser();
}

/**
 * ----- Voluntariados (IndexedDB, funciones asíncronas) -----
 */

// Función que se reutiliza en todas las operaciones de voluntariados
function abrirDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("VoluntariadoDB", 1);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("voluntariados")) {
        db.createObjectStore("voluntariados", { keyPath: "id", autoIncrement: true });
      }

      //almacenaje de voluntariados seleccionados
      if(!db.objectStoreNames.contains("seleccionados")) {
        db.createObjectStore("seleccionados", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = function (event) {
      resolve(event.target.result);
    };
    request.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

/**
 * Añade un nuevo voluntariado a la base de datos IndexedDB (async).
 * @param {Object} voluntariado -El objeto con los campos: titulo, email, fecha, descripción, tipo
 * @returns {Promise<number>} - El id generado para el voluntariado
 */
export async function altaVoluntariado(voluntariado) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("voluntariados", "readwrite");
    const store = tx.objectStore("voluntariados");
    const request = store.add(voluntariado);
    request.onsuccess = function (event) {
      resolve(event.target.result);
    };
    request.onerror = function (event) {
      reject(request.result);
    };
  });
}

/**
 * Devuelve un array con todos los voluntariados de la base de datos (async).
 * @returns {Promise<Array>}
 */
export async function listarVoluntariados() {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("voluntariados", "readonly");
    const store = transaction.objectStore("voluntariados");
    const request = store.getAll();
    request.onsuccess = function (event) {
      resolve(request.result);
    };
    request.onsuccess = function (event) {
  // Garantiza que todos los registros tengan creadoPor
  const vols = request.result.map(v => ({ ...v, creadoPor: v.creadoPor || "Anónimo" }));
  resolve(vols)
    };
  });
}

/**
 * Modificar un voluntariado por ID de la base de datos (async).
 * @param {number} id - ID del voluntariado a modificar.
 * @param {Object} voluntariadoActualizado - Nuevo objeto voluntariado.
 * @returns {Promise<boolean>}
 */
export async function modificarVoluntariado(id, voluntariadoActualizado) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("voluntariados", "readwrite");
    const store = tx.objectStore("voluntariados");
    // Debes asegurarte de que el objeto tiene el id
    voluntariadoActualizado.id = id;
    const request = store.put(voluntariadoActualizado);
    request.onsuccess = function () {
      resolve(true);
    };
    request.onerror = function () {
      reject(request.error);
    };
  });
}

/**
 * Elimina un voluntariado por ID de la base de datos (async).
 * @param {number} id
 */
export async function borrarVoluntariado(id) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const trasaction = db.transaction("voluntariados", "readwrite");
    const store = trasaction.objectStore("voluntariados");
    const request = store.delete(id);
    request.onsuccess = function (event) {
      resolve(true);
    };
    request.onerror = function (event) {
      reject(request.error);
    };
  });
}

/**
 * Devuelve los voluntariados de un usuario (filtro por email) (async).
 * @param {string} email
 * @returns {Promise<Array>}
 */
export async function voluntariadosPorUsuario(email) {
  const todosVoluntarioados = await listarVoluntariados();
  return todosVoluntarioados.filter((v) => v.email === email);
}

//guardar voluntariados seleccionados
export async function guardarSeleccionados(voluntariado) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("seleccionados", "readwrite");
    const store = tx.objectStore("seleccionados");
    const request = store.add(voluntariado);
    request.onsuccess = function (event) {
      resolve(event.target.result);
    };
    request.onerror = function (event) {
      reject(request.result);
    };
  });
}

//listar voluntariados seleccionados
export async function listarSeleccionados() {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("seleccionados", "readonly");
    const store = transaction.objectStore("seleccionados");
    const request = store.getAll();
    request.onsuccess = function (event) {
      resolve(request.result);
    };
    request.onerror = function (event) {
      reject(request.error);
    };
  });
}

//borrar voluntariados seleccionados
export async function borrarSeleccionados(id) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const trasaction = db.transaction("seleccionados", "readwrite");
    const store = trasaction.objectStore("seleccionados");
    const request = store.delete(id);
    request.onsuccess = function (event) {
      resolve(true);
    };
    request.onerror = function (event) {
      reject(request.error);
    };
  });
}