// js/int_login.js
import { gqlFetch } from "./api/graphqlClient.js";

const $ = (s, ctx = document) => ctx.querySelector(s);

function showMsg(text, type = "info") {
  const box = $("#msg");
  if (!box) return;
  box.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${text}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
}

async function apiMe() {
  const data = await gqlFetch(`query { me { id nombre email rol } }`);
  return data.me || null;
}

async function apiLogout() {
  const data = await gqlFetch(`mutation { logout }`);
  return !!data.logout;
}

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

document.addEventListener("DOMContentLoaded", async () => {
  bindLogoutButton();

  // ✅ Pintar estado real al cargar
  let me = null;
  try {
    me = await apiMe();
  } catch (err) {
    me = null;
  }
  applyNavbarState(me);

  // Login form
  const form = $("#loginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
      showMsg("Completa email y contraseña", "warning");
      return;
    }

    try {
      const data = await gqlFetch(
        `
        mutation ($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            id
            nombre
            email
            rol
          }
        }`,
        { email, password }
      );

      applyNavbarState(data.login);
      showMsg("Inicio de sesión exitoso", "success");

      setTimeout(() => {
        window.location.href = "./dashboard.html";
      }, 350);
    } catch (err) {
      showMsg(err.message, "danger");
    }
  });
});
