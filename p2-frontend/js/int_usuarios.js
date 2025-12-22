// js/int_usuarios.js
// Usuarios (GraphQL) + sesión (cookie) + UI

const API_URL = "http://localhost:4000/graphql";
const $ = (s, ctx = document) => ctx.querySelector(s);

function showMsg(text, type = "info") {
  const box = $("#msg");
  if (!box) return;
  box.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show py-2 mb-0" role="alert">
      ${text}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;
}

async function fetchGraphQL(query, variables = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("GraphQL HTTP error:", res.status, json);
    throw new Error(`HTTP ${res.status}`);
  }
  if (json.errors?.length) {
    console.error("GraphQL errors:", json.errors);
    throw new Error(json.errors[0]?.message || "GraphQL error");
  }
  return json.data;
}

async function getMe() {
  const q = `query { me { id nombre email rol } }`;
  const data = await fetchGraphQL(q);
  return data?.me ?? null;
}

async function apiLogout() {
  const data = await fetchGraphQL(`mutation { logout }`);
  return !!data?.logout;
}

async function listarUsuariosAPI() {
  const q = `
    query {
      usuarios { id nombre email rol }
    }
  `;
  const data = await fetchGraphQL(q);
  return data?.usuarios ?? [];
}

async function crearUsuarioAPI({ nombre, email, password, rol }) {
  const m = `
    mutation ($nombre: String!, $email: String!, $password: String!, $rol: String!) {
      crearUsuario(nombre: $nombre, email: $email, password: $password, rol: $rol) {
        id nombre email rol
      }
    }
  `;
  const data = await fetchGraphQL(m, { nombre, email, password, rol });
  return data?.crearUsuario ?? null;
}

async function borrarUsuarioAPI(email) {
  const m = `
    mutation ($email: String!) {
      borrarUsuario(email: $email)
    }
  `;
  const data = await fetchGraphQL(m, { email });
  return !!data?.borrarUsuario;
}

// ---------------- Navbar (estado + logout) ----------------
function applyNavbarState(me) {
  const badge = document.getElementById("userBadge");
  const dropdown = document.getElementById("userMenuBtn")?.closest(".dropdown");

  const linkDashboard = document.querySelector('a[href="./dashboard.html"]')?.closest("li");
  const linkVoluntariados = document.querySelector('a[href="./voluntariados.html"]')?.closest("li");
  const linkUsuarios = document.querySelector('a[href="./usuarios.html"]')?.closest("li");
  const linkLogin = document.querySelector('a[href="./login.html"]')?.closest("li");

  const show = (el) => el && (el.style.display = "");
  const hide = (el) => el && (el.style.display = "none");

  if (!me) {
    if (badge) badge.textContent = "-no login-";
    hide(dropdown);
    hide(linkDashboard);
    hide(linkVoluntariados);
    hide(linkUsuarios);
    show(linkLogin);
    return;
  }

  if (badge) badge.textContent = me.nombre || me.email || "Usuario";
  show(dropdown);

  show(linkDashboard);
  show(linkVoluntariados);
  hide(linkLogin);

  if (me.rol === "admin") show(linkUsuarios);
  else hide(linkUsuarios);
}

function bindLogoutButton() {
  const btn = document.getElementById("btnLogout");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.warn("[logout] fallo, continuo igual:", err);
    }
    applyNavbarState(null);
    window.location.href = "./login.html";
  });
}

// ---------------- UI helpers ----------------
function escapeHTML(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function drawTable(users) {
  const tbody = $("#tablaUsers tbody");
  if (!tbody) return;

  if (!users?.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-muted">No hay usuarios.</td></tr>`;
    return;
  }

  tbody.innerHTML = users
    .map(
      (u) => `
      <tr>
        <td>${escapeHTML(u.nombre || "")}</td>
        <td>${escapeHTML(u.email || "")}</td>
        <td class="text-end">
          <button class="btn btn-outline-danger btn-sm" data-action="del" data-email="${escapeHTML(u.email)}">
            Borrar
          </button>
        </td>
      </tr>`
    )
    .join("");
}

function wireTableActions() {
  const tbody = $("#tablaUsers tbody");
  if (!tbody) return;

  tbody.addEventListener("click", async (ev) => {
    const btn = ev.target.closest('button[data-action="del"]');
    if (!btn) return;

    const email = btn.getAttribute("data-email");
    if (!email) return;

    const ok = confirm(`¿Seguro que quieres borrar el usuario ${email}?`);
    if (!ok) return;

    try {
      const deleted = await borrarUsuarioAPI(email);
      if (!deleted) throw new Error("No se pudo borrar (¿existe el usuario?)");

      showMsg("Usuario eliminado", "success");
      const users = await listarUsuariosAPI();
      drawTable(users);
    } catch (err) {
      console.error(err);
      showMsg(err.message || "Error al borrar usuario", "danger");
    }
  });
}

// ---------------- Boot ----------------
document.addEventListener("DOMContentLoaded", async () => {
  bindLogoutButton();

  let me = null;
  try {
    me = await getMe();
  } catch (err) {
    console.error(err);
    me = null;
  }

  applyNavbarState(me);

  if (!me) {
    window.location.href = "./login.html";
    return;
  }

  // ✅ Si NO es admin, no tiene acceso a /usuarios
  if (me.rol !== "admin") {
    showMsg("Acceso denegado: solo el administrador puede gestionar usuarios.", "warning");
    return;
  }

  try {
    const users = await listarUsuariosAPI();
    drawTable(users);
  } catch (err) {
    console.error(err);
    showMsg(err.message || "No se pudieron cargar usuarios.", "danger");
  }

  wireTableActions();

  const form = $("#formUser");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nombre = form.nombre?.value?.trim();
      const email = form.email?.value?.trim();
      const password = form.password?.value ?? "";
      const rol = form.rol ? form.rol.value : "user";

      if (!nombre || !email || !password) {
        showMsg("Rellena todos los campos", "warning");
        return;
      }

      try {
        await crearUsuarioAPI({ nombre, email, password, rol });
        showMsg("Usuario creado correctamente", "success");
        form.reset();
        $("#nombre")?.focus();

        const users = await listarUsuariosAPI();
        drawTable(users);
      } catch (err) {
        console.error(err);
        showMsg(err.message || "Error al crear el usuario", "danger");
      }
    });
  }
});
