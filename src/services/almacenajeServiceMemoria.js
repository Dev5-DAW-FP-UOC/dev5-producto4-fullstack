// src/almacenajeService.js
import { CATEGORIAS, USUARIOS_INICIALES, VOLUNTARIADOS_INICIALES } from "../data/datos.js";

let usuarios = [...USUARIOS_INICIALES];
let voluntariados = [...VOLUNTARIADOS_INICIALES];
let seleccionados = [];

// =============================
//   USUARIOS
// =============================

// ------ CRUD - USUARIOS ------

export function altaUsuario(nuevoUsuario) {
  const existe = usuarios.some((u) => u.email === nuevoUsuario.email);
  if (existe) {
    throw new Error("Ya existe este usuario con este email.");
  }
  // Genera id incremental
  const maxId = usuarios.reduce((max, u) => Math.max(max, u.id ?? 0), 0);
  const usuarioConId = {
    ...nuevoUsuario,
    id: maxId + 1,
  };
  usuarios.push(usuarioConId);
  return usuarioConId;
}

export function listarUsuarios() {
  return usuarios;
}

export function buscarUsuarioPorEmail(email) {
  return usuarios.find((u) => u.email === email) || null;
}

export function buscarUsuarioPorId(id) {
  return usuarios.find((u) => u.id === id) || null;
}

export function modificarUsuario(emailOriginal, usuarioActualizado) {
  const indice = usuarios.findIndex((u) => u.email === emailOriginal);
  if (indice === -1) {
    return false;
  }
  // Si se cambia el email, se comprueba que no existe ya
  if (usuarioActualizado.email && usuarioActualizado.email !== emailOriginal) {
    const emailUsuarioExiste = usuarios.some((u) => u.email === usuarioActualizado.email);
    if (emailUsuarioExiste) {
      return false;
    }
  }
  usuarios[indice] = {
    ...usuarios[indice],
    ...usuarioActualizado,
  };
  return true;
}

export function borrarUsuario(email) {
  const tamAntes = usuarios.length;
  usuarios = usuarios.filter((u) => u.email !== email);
  return usuarios.length < tamAntes;
}

// ------ LOGIN simple ------
/**
 * Verifica email/password y devuelve el usuario o null.
 */
export function loginUsuario(email, password) {
  const usuario = usuarios.find((u) => u.email === email && u.password === password);
  return usuario || null;
}

// ==================================
//   VOLUNTARIADOS
// ==================================

// ------ CRUD - VOLUNTARIADOS ------

export function altaVoluntariado(nuevoVoluntariado) {
  const maxId = voluntariados.reduce((max, v) => Math.max(max, v.id ?? 0), 0);
  const voluntariadoConId = {
    id: maxId + 1,
    type: nuevoVoluntariado.type,
    titulo: nuevoVoluntariado.titulo,
    id_usuario: nuevoVoluntariado.id_usuario,
    modalidad: nuevoVoluntariado.modalidad,
    categoria: nuevoVoluntariado.categoria,
    resumen: nuevoVoluntariado.resumen,
    fecha: nuevoVoluntariado.fecha,
  };

  voluntariados.push(voluntariadoConId);
  return voluntariadoConId;
}

export function listarVoluntariados() {
  return voluntariados;
}

export function modificarVoluntariado(id, voluntariadoActualizado) {
  const indice = voluntariados.findIndex((v) => v.id === id);
  if (indice === -1) {
    return false;
  }
  voluntariados[indice] = {
    ...voluntariados[indice],
    ...voluntariadoActualizado,
    id, // aseguramos que no se pierde el id
  };
  return true;
}

export function borrarVoluntariado(id) {
  const tamAntes = voluntariados.length;
  voluntariados = voluntariados.filter((v) => v.id !== id);
  return voluntariados.length < tamAntes;
}

// Voluntariados de un usuario concreto
export function voluntariadosPorUsuario(id_usuario) {
  return voluntariados.filter((v) => v.id_usuario === id_usuario);
}

export function getCategorias() {
  return CATEGORIAS;
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
export function guardarSeleccionado(id_usuario, id_voluntariado) {
  const usuarioExiste = usuarios.some((u) => u.id === id_usuario);
  if (!usuarioExiste) {
    throw new Error("Usuario no encontrado para id_usuario=" + id_usuario);
  }

  const voluntariadoExiste = voluntariados.some((v) => v.id === id_voluntariado);
  if (!voluntariadoExiste) {
    throw new Error("Voluntariado no encontrado para id_voluntariado=" + id_voluntariado);
  }

  // Evitar duplicados opcionalmente (mismo usuario + mismo voluntariado)
  const yaExiste = seleccionados.some((s) => s.id_usuario === id_usuario && s.id_voluntariado === id_voluntariado);
  if (yaExiste) {
    throw new Error("Este voluntariado ya está seleccionado por este usuario.");
  }

  const maxId = seleccionados.reduce((max, s) => Math.max(max, s.id ?? 0), 0);

  const nuevoSeleccionado = {
    id: maxId + 1,
    id_usuario,
    id_voluntariado,
  };

  seleccionados.push(nuevoSeleccionado);
  return nuevoSeleccionado;
}

/**
 * Devuelve todos los voluntariados seleccionados.
 */
export function listarSeleccionados() {
  return seleccionados;
}

/**
 * Devuelve los seleccionados de un usuario concreto.
 * @param {number} id_usuario
 * @returns {Array<{id, id_usuario, id_voluntariado}>}
 */
export function seleccionadosPorUsuario(id_usuario) {
  return seleccionados.filter((s) => s.id_usuario === id_usuario);
}

/**
 * Borra un seleccionado por su id (id de la selección, no del voluntariado).
 * @param {number} id
 * @returns {boolean} true si se ha borrado, false si no existía
 */
export function borrarSeleccionado(id) {
  const indice = seleccionados.findIndex((s) => s.id === id);
  if (indice === -1) {
    return false;
  }
  seleccionados.splice(indice, 1);
  return true;
}
