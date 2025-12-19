// js/users.js
import { listarUsuarios, altaUsuario, borrarUsuario as borrarUsuarioGQL, getActiveUser } from "./almacenaje.js";
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

async function drawTable() {
  const tbody = $("#tablaUsers tbody");
  if (!tbody) return;
  const arr = await listarUsuarios();
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

function wireTableActions() {
  const tbody = $("#tablaUsers tbody");
  if (!tbody) return;
  tbody.addEventListener("click", async (ev) => {
    const btn = ev.target.closest('button[data-action="del"]');
    if (!btn) return;
    const id = btn.getAttribute("data-email");
    const ok = confirm("¿Seguro que quieres borrar este usuario?");
    if (!ok) return;

    const activeUser = getActiveUser();
    const isActiveUser = activeUser && activeUser.email === id;

    await borrarUsuario(id);

    if(isActiveUser){
      logoutUsuario();
      setNavbarUser(null);
    }

    await drawTable();
    showMsg("Usuario eliminado", "success");
  });
}

// Patch: wireTableActions and altaUsuario are not implemented, so just remove user from table for demo
async function borrarUsuario(email) {
  const users = await listarUsuarios();
  const user = users.find(u => u.email === email);
  if (!user) return;
  await borrarUsuarioGQL(user.id);
}


document.addEventListener("DOMContentLoaded", async () => {
  // Usuario activo → navbar
  const active = getActiveUser();
  setNavbarUser(active?.nombre);

  // Set email placeholder to logged user
  const form = $("#formUser");
  if (form && active?.email) {
    const emailInput = form.querySelector('input[name="email"], #email');
    if (emailInput) {
      emailInput.placeholder = active.email;
    }
  }

  // Pintar tabla
  await drawTable();
  wireTableActions();

  // Alta de usuarios
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

      try {
        await altaUsuario({ nombre, email, password, rol });
        showMsg("Usuario creado correctamente", "success");
        form.reset();
        document.getElementById("nombre")?.focus();
        await drawTable();
      } catch (err) {
        showMsg("No se pudo crear el usuario: " + err.message, "danger");
      }
    });
  }
});
