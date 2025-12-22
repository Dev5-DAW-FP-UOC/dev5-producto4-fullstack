// js/users.js
import { API } from "./services/api.js"; // Cambiamos la importación

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

// Ahora es ASYNC porque pide datos al servidor
async function drawTable() {
    const tbody = $("#tablaUsers tbody");
    try {
        const arr = await API.getUsers(); // Llamada a la API

        if (!arr || !arr.length) {
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
    } catch (error) {
        showMsg("Error al cargar usuarios: " + error.message, "danger");
    }
}

function wireTableActions() {
  const tbody = $("#tablaUsers tbody");
  
  tbody.addEventListener("click", async (ev) => {
    const btn = ev.target.closest('button[data-action="del"]');
    if (!btn) return;

    // 1. EXTRAER EL EMAIL (Usando dataset para leer 'data-email')
    const emailABorrar = btn.dataset.email; 

    // DEBUG: Abre la consola (F12) y comprueba si sale el email o sale 'undefined'
    console.log("Intentando borrar email:", emailABorrar);

    if (!emailABorrar) {
        alert("Error: No se pudo encontrar el email del usuario en el botón.");
        return;
    }

    const ok = confirm(`¿Seguro que quieres borrar a ${emailABorrar}?`);
    if (!ok) return;

    try {
        await API.borrarUsuario(emailABorrar);
        await drawTable(); // Recargar la tabla tras borrar
        showMsg("Usuario eliminado", "success");
    } catch (err) {
        showMsg("Error al borrar: " + err.message, "danger");
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        // 1. Verificar Usuario Activo mediante API
        const meData = await API.getMe();
        if (meData.me) {
            setNavbarUser(meData.me.nombre);
        }

        // 2. Pintar tabla y activar eventos
        await drawTable();
        wireTableActions();

        // 3. Alta de usuarios
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

                try {
                    // Llamada a la API para crear
                    await API.crearUsuario({ nombre, email, password, rol });
                    
                    showMsg("Usuario creado correctamente", "success");
                    form.reset();
                    await drawTable();
                } catch (err) {
                    showMsg(err.message || "Error al crear el usuario", "danger");
                }
            });
        }
    } catch (error) {
        console.error("Error en la inicialización:", error);
    }
});