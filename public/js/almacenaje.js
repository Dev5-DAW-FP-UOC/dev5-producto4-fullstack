// public/js/almacenaje.js

import { gql, me as meQuery } from "./graphqlClient.js";

/**
 * En P2 inicializabas LocalStorage + IndexedDB.
 * En P4 el backend ya hace seed con initMongoData().
 * Se deja la función para no romper imports, pero no hace nada.
 */
export async function inicializarDatos() {
  return true;
}

// Categorías disponibles para filtros, tabs, etc.
export async function getCategorias() {
  const data = await gql(`query { categorias }`);
  return data?.categorias?.length ? data.categorias : ["Todas"];
}
// Seleccion voluntariados propios
// En P2 venía de datos.js; en P4 no existe como tal.
// Se deja por compatibilidad.
export function getSeleccion() {
  return ["Todos"];
}

// === CRUD y autenticación para la app de voluntariado ===

// ------ Usuarios (LocalStorage) ------

/**
 * Añade un nuevo usuario al sistema y lo guarda en la base de datos.
 * Si ya existe un usuario con el mismo email, no lo añade y retorna false.
 * @param {Object} usuario - Debe tener { nombre, email, contraseña, rol }
 * @returns {boolean} true si fue añadido, false si ya existía ese email
 */
export async function altaUsuario(usuario) {
  try {
    const q = `
      mutation CrearUsuario($nombre:String!,$email:String!,$password:String!,$rol:String){
        crearUsuario(nombre:$nombre,email:$email,password:$password,rol:$rol){
          id nombre email rol
        }
      }
    `;
    await gql(q, {
      nombre: usuario.nombre,
      email: usuario.email,
      password: usuario.password,
      rol: usuario.rol,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Devuelve un array con todos los usuarios regsitrados.
 */
export async function listarUsuarios() {
  const q = `query { usuarios { id nombre email rol } }`;
  const data = await gql(q);
  return data.usuarios || [];
}

/**
 * Modifica los datos de un usuario existente en la base de datos.
 * Busca el usuario por su email (clave única).
 * @param {string} emailOriginal - El email del usuario (clave única)
 * @param {Object} usuarioActualizado - Objeto con los nuevos datos {nombre, email, contraseña, rol}
 * @returns {boolean} true si se modificó correctamente, false si no existía el usuario
 */
export async function modificarUsuario(emailOriginal, usuarioActualizado) {
  const q = `
    mutation ModUser($emailOriginal:String!,$nombre:String,$email:String,$password:String,$rol:String){
      modificarUsuario(
        emailOriginal:$emailOriginal,
        nombre:$nombre,
        email:$email,
        password:$password,
        rol:$rol
      )
    }
  `;
  const data = await gql(q, {
    emailOriginal,
    nombre: usuarioActualizado.nombre,
    email: usuarioActualizado.email,
    password: usuarioActualizado.password,
    rol: usuarioActualizado.rol,
  });
  return !!data.modificarUsuario;
}

/**
 * Elimina un usuario de la base de datos por su email.
 * @param {string} email - Email del usuario a eliminar
 * @retuns {boolean} true si eliminó el usuario, false si no existía
 */
export async function borrarUsuario(email) {
  const q = `mutation Del($email:String!){ borrarUsuario(email:$email) }`;
  const data = await gql(q, { email });
  return !!data.borrarUsuario;
}

/**
 * Login: crea sesión en servidor (cookie sid).
 * @param {string} email
 * @param {string} password
 * @return {Object|null} El objeto usuario si autenticación OK, null si no concide.
 */
export async function loguearUsuario(email, password) {
  try {
    const q = `
      mutation Login($email:String!,$password:String!){
        login(email:$email,password:$password){
          id nombre email rol
        }
      }
    `;
    const data = await gql(q, { email, password });

    // Compatibilidad P2: se guarda email local solo para UI (la autoridad real es la sesión en servidor)
    if (data.login?.email) localStorage.setItem("usuarioActivo", data.login.email);

    return data.login || null;
  } catch (e) {
    return null;
  }
}

/**
 * Compatibilidad P2: (ya no es “guardar sesión”, la sesión está en servidor).
 * Se mantiene la firma para no romper el frontend.
 * @param {string} usuario
 */
export function guardarUsuarioActivo(email) {
  localStorage.setItem("usuarioActivo", email);
}

/**
 * Compatibilidad P2: devuelve email guardado localmente (solo UI).
 * @returns {string|null}
 */
export function obtenerUsuarioActivo() {
  return localStorage.getItem("usuarioActivo");
}

/**
 * Logout: destruye sesión en servidor.
 */
export async function logoutUsuario() {
  await gql("mutation { logout }");
  localStorage.removeItem("usuarioActivo");
  return true;
}

// Devuelve el objeto usuario activo, o null si no hay
export async function getActiveUser() {
  const user = await meQuery();
  if (user?.email) localStorage.setItem("usuarioActivo", user.email);
  else localStorage.removeItem("usuarioActivo");
  return user;
}

// (Opcional) helper rápido para comprobar si hay login
export async function isLoggedIn() {
  const u = await getActiveUser();
  return !!u;
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
      if (!db.objectStoreNames.contains("seleccionados")) {
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
 * Añade un nuevo voluntariado a la base de datos (async).
 * @param {Object} voluntariado -El objeto con los campos: titulo, email, fecha, descripción, tipo
 * @returns {Promise<number>} - El id generado para el voluntariado
 */
export async function altaVoluntariado(voluntariado) {
  const user = await getActiveUser();
  if (!user) throw new Error("No autenticado");

  const q = `
    mutation CrearVol($type:String!,$id_usuario:Int!,$titulo:String!,$categoria:String!,$modalidad:String!,$resumen:String!,$fecha:String!){
      crearVoluntariado(
        type:$type,
        id_usuario:$id_usuario,
        titulo:$titulo,
        categoria:$categoria,
        modalidad:$modalidad,
        resumen:$resumen,
        fecha:$fecha
      ){
        id id_usuario type titulo categoria modalidad resumen fecha
      }
    }
  `;

  const variables = {
    type: voluntariado.type || voluntariado.tipo || "petición",
    id_usuario: user.id,
    titulo: voluntariado.titulo,
    categoria: voluntariado.categoria || "General",
    modalidad: voluntariado.modalidad || "presencial",
    resumen: voluntariado.resumen || voluntariado.descripcion || "",
    fecha: voluntariado.fecha || new Date().toISOString().slice(0, 10),
  };

  const data = await gql(q, variables);
  return data.crearVoluntariado;
}

/**
 * Devuelve un array con todos los voluntariados de la base de datos (async).
 * @returns {Promise<Array>}
 */
export async function listarVoluntariados() {
  const q = `query { voluntariados { id id_usuario type titulo categoria modalidad resumen fecha } }`;
  const data = await gql(q);
  return data.voluntariados || [];
}

export async function listarVoluntariadosFeed() {
  const query = `
    query {
      voluntariadosFeed {
        id type titulo id_usuario modalidad categoria resumen fecha creadorNombre
      }
    }
  `;
  const data = await gql(query);
  return data.voluntariadosFeed;
}

/**
 * Modificar un voluntariado por ID de la base de datos (async).
 * @param {number} id - ID del voluntariado a modificar.
 * @param {Object} voluntariadoActualizado - Nuevo objeto voluntariado.
 * @returns {Promise<boolean>}
 */
export async function modificarVoluntariado(id, voluntariadoActualizado) {
  const q = `
    mutation ModVol($id:Int!,$type:String,$id_usuario:Int,$titulo:String,$categoria:String,$modalidad:String,$resumen:String,$fecha:String){
      modificarVoluntariado(
        id:$id,
        type:$type,
        id_usuario:$id_usuario,
        titulo:$titulo,
        categoria:$categoria,
        modalidad:$modalidad,
        resumen:$resumen,
        fecha:$fecha
      )
    }
  `;

  const data = await gql(q, {
    id,
    type: voluntariadoActualizado.type || voluntariadoActualizado.tipo,
    id_usuario: voluntariadoActualizado.id_usuario,
    titulo: voluntariadoActualizado.titulo,
    categoria: voluntariadoActualizado.categoria,
    modalidad: voluntariadoActualizado.modalidad,
    resumen: voluntariadoActualizado.resumen || voluntariadoActualizado.descripcion,
    fecha: voluntariadoActualizado.fecha,
  });

  return !!data.modificarVoluntariado;
}

/**
 * Elimina un voluntariado por ID de la base de datos (async).
 * @param {number} id
 */
export async function borrarVoluntariado(id) {
  const q = `mutation DelVol($id:Int!){ borrarVoluntariado(id:$id) }`;
  const data = await gql(q, { id });
  return !!data.borrarVoluntariado;
}

/**
 * Devuelve los voluntariados de un usuario (filtro por email) (async).
 * En P2 se filtraba por email.
 * En P4 el backend filtra por id_usuario.
 * Esta función se mantiene para compatibilidad:
 * - si el email es el del usuario logueado => devuelve sus voluntariados (query voluntariados ya viene filtrada en server)
 * @param {string} email
 * @returns {Promise<Array>}
 */
export async function voluntariadosPorUsuario(email) {
  const u = await getActiveUser();
  if (!u) throw new Error("No autenticado");

  // Usuario normal: solo puede ver los suyos
  if (u.rol !== "admin") {
    if (email && email !== u.email) return [];
    return await listarVoluntariados();
  }

  // Admin: si pide los suyos y coincide el email
  if (!email || email === u.email) return await listarVoluntariados();

  // Admin: si necesita voluntariados de otro usuario -> usa usuarioPorEmail + voluntariadosPorUsuario
  const qUser = `query($email:String!){ usuarioPorEmail(email:$email){ id } }`;
  const userData = await gql(qUser, { email });
  if (!userData.usuarioPorEmail) return [];

  const qVols = `query($id:Int!){ voluntariadosPorUsuario(id_usuario:$id){ id id_usuario type titulo categoria modalidad resumen fecha } }`;
  const volsData = await gql(qVols, { id: userData.usuarioPorEmail.id });
  return volsData.voluntariadosPorUsuario || [];
}

/**
 * Guardar voluntariados seleccionados
 * En P2 se guardaba el objeto voluntariado entero.
 * En P4 se guarda una relación (usuario en sesión + id_voluntariado).
 * Acepta:
 * - un número (id_voluntariado)
 * - o un objeto con propiedad id
 */
export async function guardarSeleccionados(voluntariadoOrId) {
  const idVol = typeof voluntariadoOrId === "number" ? voluntariadoOrId : voluntariadoOrId?.id;
  if (!idVol) throw new Error("id_voluntariado inválido");

  const q = `
    mutation AddSel($idVol:Int!){
      guardarSeleccionado(id_voluntariado:$idVol){
        id id_usuario id_voluntariado
      }
    }
  `;
  const data = await gql(q, { idVol });
  return data.guardarSeleccionado;
}

/**
 * Lista voluntariados seleccionados:
 * - admin: todos (query seleccionados)
 * - user: los suyos (query seleccionadosPorUsuario)
 */
export async function listarSeleccionados() {
  const u = await getActiveUser();
  if (!u) throw new Error("No autenticado");

  if (u.rol === "admin") {
    const data = await gql(`query { seleccionados { id id_usuario id_voluntariado } }`);
    return data.seleccionados || [];
  }

  const q = `query($id:Int!){ seleccionadosPorUsuario(id_usuario:$id){ id id_usuario id_voluntariado } }`;
  const data = await gql(q, { id: u.id });
  return data.seleccionadosPorUsuario || [];
}

/**
 * Borra una selección por id (id de la selección, no del voluntariado).
 */
export async function borrarSeleccionados(id) {
  const q = `mutation($id:Int!){ borrarSeleccionado(id:$id) }`;
  const data = await gql(q, { id });
  return !!data.borrarSeleccionado;
}
