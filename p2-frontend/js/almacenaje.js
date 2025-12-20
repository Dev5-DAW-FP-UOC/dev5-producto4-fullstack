// =========================
// USUARIOS
// =========================

// Use GraphQL backend for usuarios
export async function obtenerUsuarios() {
  const query = `
    query {
      usuarios {
        id
        nombre
        email
        rol
      }
    }
  `;
  const data = await graphqlFetch(query);
  return data.usuarios;
}

export async function altaUsuario({ nombre, email, password, rol }) {
  const mutation = `
    mutation {
      altaUsuario(nombre: "${nombre}", email: "${email}", password: "${password}", rol: "${rol}") {
        id
        nombre
        email
        rol
      }
    }
  `;
  const data = await graphqlFetch(mutation);
  return data.altaUsuario;
}

export async function borrarUsuario(id) {
  const mutation = `
    mutation {
      borrarUsuario(id: ${id})
    }
  `;
  const data = await graphqlFetch(mutation);
  return data.borrarUsuario;
}

// =========================
// CATEGORIAS
// =========================

export async function obtenerCategorias() {
  // Puedes cambiar esto para que haga una petición a la API si tienes endpoint de categorías
  return ["Todas", "Idiomas", "Deportes", "Profesiones"];
}
// js/almacenaje.js

const GRAPHQL_URL = "http://localhost:4000/graphql";

async function graphqlFetch(query) {
  console.log('[almacenaje] Sending GraphQL request:', query);
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      credentials: "include", // 🔴 SESIÓN
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    console.log('[almacenaje] Response status:', res.status);
    const json = await res.json();
    console.log('[almacenaje] Response JSON:', json);
    if (json.errors) {
      console.error('[almacenaje] GraphQL errors:', json.errors);
      throw new Error(json.errors[0].message);
    }
    return json.data;
  } catch (err) {
    console.error('[almacenaje] Fetch error:', err);
    throw err;
  }
}

// =========================
// VOLUNTARIADOS
// =========================

// Use GraphQL backend for voluntariados
export async function obtenerVoluntariados() {
  const query = `
    query {
      voluntariados {
        id
        titulo
        resumen
        modalidad
        categoria
        fecha
        autor {
          nombre
        }
        creadoPor
        type
      }
    }
  `;
  const data = await graphqlFetch(query);
  return data.voluntariados;
}

export async function altaVoluntariado(nuevo) {
  // id_usuario must be provided (logged-in user)
  if (!nuevo.id_usuario) throw new Error('id_usuario is required');
  const mutation = `
    mutation {
      altaVoluntariado(
        type: "${nuevo.type || 'oferta'}",
        titulo: "${nuevo.titulo}",
        resumen: "${nuevo.resumen}",
        modalidad: "${nuevo.modalidad}",
        categoria: "${nuevo.categoria}",
        fecha: "${nuevo.fecha}",
        id_usuario: ${nuevo.id_usuario}
      ) {
        id
        titulo
      }
    }
  `;
  const data = await graphqlFetch(mutation);
  return data.altaVoluntariado;
}

export async function borrarVoluntariado(id) {
  const mutation = `
    mutation {
      borrarVoluntariado(id: ${id})
    }
  `;
  const data = await graphqlFetch(mutation);
  return data.borrarVoluntariado;
}

// =========================
// LOGIN / LOGOUT
// =========================

export async function login(email, password) {
  const res = await fetch("http://localhost:4000/login", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json.error || "Login failed");
  }

  return json.user;
}

export async function logout() {
  await fetch("http://localhost:4000/logout", {
    method: "POST",
    credentials: "include",
  });
}

// =========================
// USUARIO ACTIVO
// =========================

export function getActiveUser() {
  // Since session is server-side, perhaps fetch from API, but for simplicity, assume not needed, or fetch user info.
  // But in the app, perhaps store locally after login.
  // For now, return null or something.
  return JSON.parse(localStorage.getItem("activeUser") || "null");
}

export function setActiveUser(user) {
  if (user === null || user === undefined) {
    localStorage.removeItem("activeUser");
  } else {
    localStorage.setItem("activeUser", JSON.stringify(user));
  }
}

// Try to populate `activeUser` from server session if localStorage is empty.
export async function ensureActiveUserFromSession() {
  try {
    const current = getActiveUser();
    if (current) return current;
    const res = await fetch("http://localhost:4000/test", { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    const u = data?.session?.user ?? null;
    // Only set activeUser from session if the session user contains an email.
    // This avoids overwriting a richer local `activeUser` (which includes email)
    // with a minimal session object that would make the UI lose the email.
    if (u && u.email) {
      setActiveUser(u);
      return u;
    }
    return null;
  } catch (err) {
    return null;
  }
}

// =========================
// SELECCIONADOS (LOCAL, SIN API)
// =========================

export function getSeleccion() {
  return ["Todos", "Seleccionados"];
}

// Patch: store and retrieve seleccionados from localStorage as array of IDs
export function listarSeleccionados() {
  let data = localStorage.getItem("seleccionados");
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function guardarSeleccionados(voluntariado) {
  // Robustly read the stored selection list (coerce to array)
  let seleccionados;
  try {
    const raw = localStorage.getItem("seleccionados");
    const parsed = JSON.parse(raw);
    seleccionados = Array.isArray(parsed) ? parsed : [];
  } catch {
    seleccionados = [];
  }

  const id = voluntariado && typeof voluntariado === "object" ? voluntariado.id : voluntariado;
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return;

  if (!seleccionados.map(Number).includes(idNum)) {
    seleccionados.push(idNum);
    localStorage.setItem("seleccionados", JSON.stringify(seleccionados));
  }
}

export function borrarSeleccionados(id) {
  let seleccionados;
  try {
    const raw = localStorage.getItem("seleccionados");
    const parsed = JSON.parse(raw);
    seleccionados = Array.isArray(parsed) ? parsed : [];
  } catch {
    seleccionados = [];
  }
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return;
  const updated = seleccionados.map(Number).filter((selId) => selId !== idNum);
  localStorage.setItem("seleccionados", JSON.stringify(updated));
    // inside the existing dropZone click handler, after deleting from server/local map:
  try { borrarSeleccionados(idVol); } catch {}
  STATE.seleccionados = STATE.seleccionados.filter((x) => Number(x) !== Number(idVol));
  draw();
  renderSeleccionados();
  }

// =========================
// ALIASES PARA COMPATIBILIDAD
// =========================

export async function listarVoluntariados() {
  return await obtenerVoluntariados();
}

export async function getCategorias() {
  // Always return an array, even if obtenerCategorias fails
  try {
    const cats = await obtenerCategorias();
    return Array.isArray(cats) ? cats : ["Todas", "Idiomas", "Deportes", "Profesiones"];
  } catch {
    return ["Todas", "Idiomas", "Deportes", "Profesiones"];
  }
}

export async function listarUsuarios() {
  return await obtenerUsuarios();
}

