// src/almacenajeService.js
import { borrarVoluntariado } from "../../p2-frontend/js/almacenaje.js";
import { USARIOS_INICIALES, VOLUNTARIADOS_INICIALES } from "../data/datos.js";

let usuarios = [USARIOS_INICIALES];
let voluntariados = [VOLUNTARIADOS_INICIALES];

// ------ CRUD - USUARIOS ------

export function altaUsuario(nuevoUsuario) {
  const existe = usuarios.some((u) => u.email === nuevoUsuario.email);
  if (existe) {
    throw new Error("Ya existe este usuario con este email.");
  }
  usuarios.push(nuevoUsuario);
  return nuevoUsuario;
}

export function listarUsuarios() {
  return usuarios;
}

export function buscarUsuarioPorEmail(email) {
  return usuarios.find((u) => u.email === email || null);
}

export function buscarUsuarioPorId(id) {
  return usuarios.find((u) => u.id === id || null);
}

export function modificarUsuario(emailOriginal, usuarioActualizado) {
  const indice = usuarios.findIndex((u) => u.email === emailOriginal);
  if (indice === -1) {
    return false;
  }
  if (usuarioActualizado.email !== emailOriginal) {
    const emailUsuarioExiste = usuarios.some((u) => u.email === usuarioActualizado.email);
    if (emailUsuarioExiste) {
      return false;
    }
  }
  usuarios[indice] = usuarioActualizado;
  return true;
}

export function borrarUsuario(email) {
  const indice = usuarios.findIndex((u) => u.email === email);
  if (indice === -1) {
    return false;
  }
  usuarios.splice(indice, 1);
  return true;
}

// ------ CRUD - VOLUNTARIADOS ------

export function altaVoluntariado(nuevoVoluntariado) {
  const maxId = voluntariados.reduce((max, v) => Math.max(max, v.id ?? 0), 0);
  const nuevoVoluntariadoConId = { ...nuevoVoluntariado, id: maxId + 1 };
  voluntariados.push(nuevoVoluntariadoConId);
  return nuevoVoluntariadoConId;
}

export function listarVoluntariados() {
  return voluntariados;
}

export function modificarVoluntariado(id, voluntariadoActualizado) {
  const indice = voluntariados.findIndex((v) => v.id === id);
  if (indice === -1) {
    return false;
  }
  voluntariados[indice] = voluntariadoActualizado;
  return true;
}

export function borrarVoluntariado(id) {
  const indice = voluntariados.findIndex((v) => v.id === id);
  if (indice === -1) {
    return false;
  }
  voluntariados.splice(indice, 1);
  return true;
}
