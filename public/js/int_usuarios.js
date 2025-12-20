// public/js/users.js
import { altaUsuario, listarUsuarios, borrarUsuario, getActiveUser, logoutUsuario } from "./almacenaje.js";

const $ = (s, ctx = document) => ctx.querySelector(s);

function showMsg(text, type = "info") {
  const box = $("#msg");
  if (!box) return;
  box.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${text}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;
}

function setNavbarUser(name) {
  let badge = $("#userBadge") || document.querySelector(".navbar-text");
  if (!badge) {
    const container = $("#nav") || document.querySelector(".navbar .container, .navbar");
    badge = document.createElement("span");
    badge.className = "navbar-text small text-muted";
    badge.id = "userBadge";
    container?.appendChild(badge);
  }
  badge.textContent = name || "-no login-";
}

let USERS_CACHE = [];

async function drawTable() {
  const tbody = $("#tablaUsers tbody");
  if (!tbody) return;

  let arr = [];
  try {
    arr = await listarUsuarios(); // <-- async
    USERS_CACHE = arr || [];
  } catch (err) {
    console.error("[users] listarUsuarios error:", err);
    tbody.innerHTML = `<tr><td colspan="3" class="text-danger">No autorizado o error cargando usuarios.</td></tr>`;
    return;
  }

  if (!arr.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-muted">No hay usuarios.</td></tr>`;
    return;
  }

  tbody.innerHTML = arr
    .map(
      (u) => `
    <tr>
      <td>${u.nombre || ""}</td>
      <td>${u.email}</td>
      <td class="text-end">
        <button class="btn btn-outline-danger btn-sm" data-action="del" data-email="${u.email}">Borrar</button>
      </td>
    </tr>`
    )
    .join("");
}

function wireTableActions(active) {
  const tbody = $("#tablaUsers tbody");
  if (!tbody) return;

  tbody.addEventListener("click", async (ev) => {
    const btn = ev.target.closest('button[data-action="del"]');
    if (!btn) return;

    const email = btn.getAttribute("data-email");
    const ok = confirm(`¿Seguro que quieres borrar el usuario ${email}?`);
    if (!ok) return;

    // Si se borra el propio usuario (admin), se cierra sesión
    const isActiveUser = active && active.email === email;

    try {
      await borrarUsuario(email);
      showMsg("Usuario eliminado", "success");
    } catch (err) {
      console.error("[users] borrarUsuario error:", err);
      showMsg(err?.message || "Error al borrar usuario", "danger");
      return;
    }

    if (isActiveUser) {
      try {
        await logoutUsuario();
      } catch {}
      setNavbarUser(null);
      window.location.href = "/login.html";
      return;
    }

    await drawTable();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  // Usuario activo → navbar
  const active = await getActiveUser();
  if (!active) {
    window.location.href = "/login.html";
    return;
  }
  setNavbarUser(active?.nombre);

  // Control de rol (solo asmin)
  if (active.rol !== "admin") {
    showMsg("No autorizado: esta página es solo para administradores.", "danger");
    window.location.href = "/dashboard.html";
    return;
  }
  // Pintar tabla
  await drawTable();
  wireTableActions(active);

  // Alta de usuarios
  const form = $("#formUser");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nombre = form.nombre.value.trim();
      const email = form.email.value.trim();
      const password = form.password.value;
      const rol = form.rol ? form.rol.value : "user";

      if (!nombre || !email || !password) {
        showMsg("Rellena todos los campos", "warning");
        return;
      }

      const usuario = { nombre, email, password, rol };

      try {
        await altaUsuario(usuario);
        showMsg("Usuario creado correctamente", "success");
        form.reset();
        document.getElementById("nombre")?.focus();
        await drawTable();
      } catch (err) {
        console.error("[users] altaUsuario error:", err);
        showMsg(err?.message || "Error al crear el usuario", "danger");
      }
    });
  }
});
