// js/login.js

import { setActiveUser } from "./almacenaje.js";

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

document.addEventListener("DOMContentLoaded", () => {
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
      const response = await fetch("http://localhost:4000/login", {
        method: "POST",
        credentials: "include", // 🔴 CLAVE
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        showMsg("Email o contraseña incorrectos", "danger");
        return;
      }

      // ✅ sesión creada en servidor
      const json = await response.json();
      console.log('login response json:', json);
      setActiveUser(json.user);
      console.log('set active user:', json.user);
      console.log('localStorage activeUser:', localStorage.getItem('activeUser'));
      window.location.href = "dashboard.html";

    } catch (err) {
      showMsg("Error de conexión con el servidor", "danger");
    }
  });
});
