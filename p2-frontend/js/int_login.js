// js/login.js
//import { login, getActiveUser } from './storage.js';
import { API } from "./services/api.js";

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
  const badge = document.getElementById("userBadge");
  const menu = document.getElementById("userMenu");

  if (name) {
    // Usuario logueado
    badge.textContent = `Hola, ${name}`;
    badge.classList.remove("text-muted", "disabled");
    badge.style.pointerEvents = "auto"; // Permite clics
    if (menu) menu.parentElement.style.display = "block";
  } else {
    // Sin login
    badge.textContent = "-no login-";
    badge.classList.add("text-muted", "disabled");
    badge.style.pointerEvents = "none"; // Desactiva el menú
    if (menu) menu.parentElement.style.display = "none";
  }
}

document.addEventListener("click", (e) => {
  if (e.target.id === "btnLogout" || e.target.closest("#btnLogout")) {
    e.preventDefault();
    localStorage.removeItem("usuario"); // O la clave que uses
    window.location.href = "./login.html";
  }
});
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Verificación inicial de sesión (Sustituye a getActiveUser de localStorage)
  try {
    const data = await API.getMe();
    if (data && data.me) {
      setNavbarUser(data.me.nombre);
      // Opcional: si ya está logueado, mandarlo al dashboard
      // window.location.href = "dashboard.html";
    }
  } catch (error) {
    console.log("Sesión no iniciada");
  }

  const form = $("#loginForm");
  if (!form) return;

  $("#email")?.focus();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
      showMsg("Completa email y contraseña", "warning");
      return;
    }

    try {
      const data = await API.login(email, password);
      
      const user = data.login;

      if (!user) {
        showMsg("Email o contraseña incorrectos", "danger");
        return;
      }

      setNavbarUser(user.nombre);
      showMsg("Inicio de sesión exitoso", "success");
      
      setTimeout(() => {
        window.location.href = "dashboard.html"; 
      }, 1000);

    } catch (error) {
      showMsg(error.message || "Error al conectar con el servidor", "danger");
    }
  });
});
