// public/js/nav.js
import { getActiveUser, logoutUsuario } from "./almacenaje.js";

const $ = (sel, ctx = document) => ctx.querySelector(sel);

function show(el, visible) {
  if (!el) return;
  el.classList.toggle("d-none", !visible);
}

function setBadge(name) {
  const badge = $("#userBadge");
  if (badge) badge.textContent = name || "-no login-";
}

export async function initNav() {
  const user = await getActiveUser(); // <- usa me() (sesión servidor)

  const navDashboard = $("#navDashboard");
  const navVol = $("#navVoluntariados");
  const navUsers = $("#navUsuarios");
  const navLogin = $("#navLogin");
  const navLogoutItem = $("#navLogoutItem");
  const navLogout = $("#navLogout");

  // Dashboard siempre visible
  show(navDashboard?.closest("li") || navDashboard, true);

  if (!user) {
    // NO LOGEADO -> solo Dashboard + Login
    setBadge(null);
    show(navVol?.closest("li") || navVol, false);
    show(navUsers?.closest("li") || navUsers, false);
    show(navLogin?.closest("li") || navLogin, true);
    show(navLogoutItem, false);
    return;
  }

  // LOGEADO
  setBadge(user.nombre);

  show(navLogin?.closest("li") || navLogin, false);
  show(navLogoutItem, true);

  if (user.rol === "admin") {
    // ADMIN -> todo visible
    show(navVol?.closest("li") || navVol, true);
    show(navUsers?.closest("li") || navUsers, true);
  } else {
    // USER -> como ahora (normalmente: Dashboard + Voluntariados, NO Usuarios)
    show(navVol?.closest("li") || navVol, true);
    show(navUsers?.closest("li") || navUsers, false);
  }

  // Logout
  navLogout?.addEventListener("click", async (e) => {
    e.preventDefault();
    await logoutUsuario();
    location.href = "./login.html";
  });
}

// Auto-init
document.addEventListener("DOMContentLoaded", () => {
  initNav();
});
