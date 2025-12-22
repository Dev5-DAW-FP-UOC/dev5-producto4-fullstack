// js/int_voluntariados.js
import { API } from "./services/api.js";

const $ = (s, ctx = document) => ctx.querySelector(s);
const todayISO = () => new Date().toISOString().slice(0, 10);

// --- ESTADO EN MEMORIA ---
const state = { 
  vols: [],
  user: null 
};

// --- HELPERS VISUALES ---
function fmtFecha(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function categoryClass(cat) {
  if (!cat) return "";
  const clave = cat.trim().toLowerCase(); 
  const mapa = {
    "idiomas": "cat-Idiomas",
    "deportes": "cat-Deportes",
    "profesiones": "cat-Profesiones"
  };
  return mapa[clave] || "";
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


// --- RENDERIZADO ---

function itemHTML(v) {
  const catCls = categoryClass(v.categoria);
  const isPeticion = String(v.type || v.tipo || "").toLowerCase().includes("pet");
  
  const typeBadge = isPeticion 
    ? '<span class="badge bg-primary-subtle text-primary border border-primary-subtle me-2">Petición</span>' 
    : '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle me-2">Oferta</span>';

  return `
    <div class="item p-3 p-md-4 mb-3 border-2 rounded-3 shadow-sm ${catCls}" data-id="${v.id}">
      <div class="d-flex justify-content-between align-items-start gap-3">
        <div class="flex-grow-1">
          <div class="fw-bold fs-5 mb-1">${typeBadge}${v.titulo}</div>
          <div class="text-muted small mb-2">
            ${v.categoria} · por <strong>${v.nombre_usuario || 'Usuario'}</strong>
          </div>
          <div class="text-secondary">${v.descripcion || v.resumen || ""}</div>
        </div>
        <div class="text-end d-flex flex-column align-items-end gap-3">
          <small class="text-muted">${fmtFecha(v.fecha)}</small>
          <button class="btn btn-outline-danger btn-sm border-0" data-action="del" title="Eliminar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Esta función ahora solo PINTA lo que hay en state.vols
function renderAll() {
  const list = $("#list");
  if (!list) return;

  if (!state.vols.length) {
    list.innerHTML = `<div class="text-muted p-4 text-center">No hay registros de voluntariado.</div>`;
  } else {
    // Ordenamos por fecha descendente antes de pintar
    const sorted = [...state.vols].sort((a,b) => (b.fecha||"").localeCompare(a.fecha||""));
    list.innerHTML = sorted.map(itemHTML).join("");
  }
  
  $("#countVol")?.replaceChildren(document.createTextNode(`${state.vols.length} ítem(s)`));
  drawCanvasChart();
}

// Esta función CARGA los datos de la API y luego llama a render
async function loadInitialData() {
  try {
    const vols = await API.getVoluntariados();
    state.vols = vols;
    renderAll();
  } catch (err) {
    console.error("Error al cargar lista:", err);
  }
}

// --- MANEJADORES DE EVENTOS ---

async function handleSubmit(e) {
  e.preventDefault();
  const f = e.currentTarget;

  const nuevo = {
    titulo: f.titulo.value.trim(),
    categoria: normCat(f.categoria.value),
    type: f.tipo.value,
    descripcion: f.descripcion.value.trim(),
    resumen: f.descripcion.value.trim().substring(0, 80) + "...",
    fecha: f.fecha.value || todayISO(),
    modalidad: "Presencial",
    id_usuario: Number(state.user.id)
  };

  try {
    await API.crearVoluntariado(nuevo); 
    f.reset();
    if ($("#fecha")) $("#fecha").value = todayISO();
    // No hace falta llamar a renderAll aquí, el socket lo hará por nosotros
  } catch (err) {
    alert("Error al guardar: " + err.message);
  }
}

async function handleListClick(e) {
  const btn = e.target.closest("[data-action='del']");
  if (!btn) return;

  const id = Number(btn.closest("[data-id]").dataset.id);
  if (confirm("¿Eliminar este voluntariado permanentemente?")) {
    try {
      await API.borrarVoluntariado(id);
      // No hace falta llamar a nada aquí, el socket lo hará
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  }
}

// --- GRÁFICO CANVAS ---
function drawCanvasChart() {
  const canvas = document.getElementById("chartVol");
  if (!canvas || !state.vols.length) return;
  const ctx = canvas.getContext("2d");

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const userMap = {};
  state.vols.forEach(v => {
    const user = v.nombre_usuario || "Anónimo";
    if (!userMap[user]) userMap[user] = { oferta: 0, peticion: 0 };
    const tipo = (v.tipo || v.type || "").toLowerCase();
    if (tipo.includes("pet")) userMap[user].peticion++;
    else if (tipo.includes("ofe")) userMap[user].oferta++;
  });

  const users = Object.keys(userMap);
  const baseline = h - 40;
  const chartHeight = h - 80;
  const maxVal = Math.max(1, ...users.flatMap(u => [userMap[u].oferta, userMap[u].peticion]));
  const scale = chartHeight / maxVal;

  users.forEach((u, i) => {
    const x = 50 + i * 95;
    const barW = 25;
    const hOfe = userMap[u].oferta * scale;
    const hPet = userMap[u].peticion * scale;

    ctx.fillStyle = "#3b82f6"; 
    ctx.fillRect(x, baseline - hPet, barW, hPet);
    ctx.fillStyle = "#f88c3f"; 
    ctx.fillRect(x + barW + 5, baseline - hOfe, barW, hOfe);
    
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.font = "bold 10px Arial";
    ctx.fillText(u.substring(0, 8), x + barW, baseline + 20);
  });
}

// --- INICIALIZACIÓN ---
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { me } = await API.getMe();
    if (!me) {
      window.location.href = "login.html";
      return;
    }
    state.user = me;
    setNavbarUser(me.nombre);

    if ($("#email")) $("#email").value = me.email;
    if ($("#fecha")) $("#fecha").value = todayISO();

    // 1. CARGA INICIAL (Aquí es donde se traen los voluntariados)
    await loadInitialData();

    // 2. CONEXIÓN SOCKET.IO
    // Asegúrate de que el servidor está en el puerto 4000
    const socket = io("http://localhost:4000");

    socket.on("voluntariado-creado", (nuevoVol) => {
      if (!state.vols.find(v => v.id === nuevoVol.id)) {
        state.vols.push(nuevoVol);
        renderAll(); 
      }
    });

    socket.on("voluntariado-eliminado", (idEliminado) => {
      state.vols = state.vols.filter(v => v.id !== idEliminado);
      renderAll();
    });

    socket.on("voluntariado-actualizado", (volEditado) => {
      const idx = state.vols.findIndex(v => v.id === volEditado.id);
      if (idx !== -1) {
        state.vols[idx] = volEditado;
        renderAll();
      }
    });

    // 3. EVENTOS DE UI
    $("#formVol")?.addEventListener("submit", handleSubmit);
    $("#list")?.addEventListener("click", handleListClick);
    window.addEventListener("resize", drawCanvasChart);

  } catch (err) {
    console.error("Error en el inicio:", err);
  }
});