// js/dashboard.js

import {listarVoluntariados, getCategorias, listarSeleccionados, guardarSeleccionados, borrarSeleccionados, getSeleccion, setActiveUser, getActiveUser, logout } from "./almacenaje.js";
import { addDragAndDropListeners } from "./dragdrop.js";

// Helper: fetch current user from backend session
async function fetchSessionUser() {
  try {
    const res = await fetch("http://localhost:4000/test", {
      credentials: "include"
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.session?.user || null;
  } catch {
    return null;
  }
}

// Estado del dashboard
const STATE = {
  categoria: "Todas",
  filtroSeleccion: "Todos",
  query: "",
  page: 1,
  perPage: 6,
  voluntariados: [],
  seleccionados: []
};

// Atajos simples
const $ = (sel, ctx = document) => ctx.querySelector(sel);

function setNavbarUser(name) {
  console.log('setNavbarUser called with name:', name);
  let badge = $("#userBadge") || document.querySelector(".navbar-text");
  console.log('badge found:', badge);
  if (!badge) {
    const container = $("#nav") || document.querySelector(".navbar .container, .navbar");
    badge = document.createElement("span");
    badge.className = "navbar-text small text-muted";
    badge.id = "userBadge";
    container?.appendChild(badge);
  }
  badge.textContent = name || "-no login-";
  console.log('badge textContent set to:', badge.textContent);
  // Ensure logout button exists and is wired
  let logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) {
    logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.className = 'btn btn-sm btn-outline-secondary ms-2';
    logoutBtn.textContent = 'Logout';
    badge.insertAdjacentElement('afterend', logoutBtn);
    logoutBtn.addEventListener('click', async () => {
      try {
        await logout();
      } catch (err) {
        console.error('Logout failed', err);
      }
      setActiveUser(null);
      setNavbarUser('-no login-');
    });
  }
  logoutBtn.style.display = name && name !== '-no login-' ? 'inline-block' : 'none';
}

// Formatea "YYYY-MM-DD" a "dd/mm/yyyy"
function fmtFecha(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

// Paginación simple
function paginate(arr, page = 1, perPage = 6) {
  const pages = Math.max(1, Math.ceil(arr.length / perPage));
  const p = Math.min(Math.max(page, 1), pages);
  const start = (p - 1) * perPage;
  return { page: p, pages, items: arr.slice(start, start + perPage) };
}

// Clase CSS según categoría (colorea la card)
function categoryClass(cat) {
  return (
    {
      Idiomas: "cat-Idiomas",
      Deportes: "cat-Deportes",
      Profesiones: "cat-Profesiones",
    }[cat] || ""
  );
}

// Dibuja la estructura base
async function renderLayout(container) {
  const categorias = await getCategorias();
  const filtroSeleccion = getSeleccion();
  container.innerHTML = `
    <section class="mb-3">
      <input id="q" class="form-control form-control-lg" placeholder="Buscar por título, texto..." />
    </section>

    <section class="mb-3 d-flex justify-content-between align-items-center">
      <div id="tabs" class="d-flex flex-row flex-wrap gap-2">
        ${(categorias || ["Todas", "Idiomas", "Deportes", "Profesiones"])
          .map(
            (c) => `
              <button
                class="tab-pill tab-${c} ${c === STATE.categoria ? "active" : ""}"
                data-cat="${c}"
                type="button"
              >
                ${c}
              </button>
            `
          )
          .join("")}
      </div>
      <div id="filtro-seleccion" class="d-flex flex-row justify-content-end">
          ${(filtroSeleccion || ["Todos", "Seleccionados"])
          .map(
            (c) => `
              <button
                class="tab-pill tab-${c} ${c === STATE.filtroSeleccion ? "active" : ""}"
                data-cat="${c}"
                type="button"
              >
                ${c}
              </button>
            `
          )
          .join("")}
      </div>
    </section>

    <section>
      <div id="grid" class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3"></div>
      <nav class="mt-4 d-flex justify-content-center">
        <ul id="pager" class="pagination"></ul>
      </nav>
    </section>

    <section id="drop-zone-section" class="mt-5">
      <h3 class="h4 mb-3"> Selección de Voluntariados </h3>
      <div id="drop-zone" class="d-flex d-wrap border border-2 border-primary-subtle rounded-4 p-3 gap-2">
          <p id="drop-zone-placeholder" class="text-center">Arrastra los voluntariados que quieras seleccionar.</p>
      </div>
    </section>
  `;
}

// HTML de una tarjeta
function cardHTML(v) {
  const catCls = categoryClass(v.categoria);
  const typeBadge = v.type === "oferta" ? `<span class="badge badge-oferta">Oferta</span>` : `<span class="badge badge-peticion">Petición</span>`;

  return `
    <div class="col" draggable="true" data-id="${v.id}">
      <div class="card card-ld ${catCls} h-100">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between small mb-1">
            <div>${typeBadge}</div>
            <div class="small small-muted fw-semibold">${v.categoria}</div>
          </div>
          <h5 class="mb-1">${v.titulo}</h5>
          <div class="small small-muted mb-2">por <strong>${v.autor?.nombre || 'Unknown'}</strong> · ${v.modalidad}</div>
          <p class="flex-grow-1 mb-2">${v.resumen || ""}</p>
          <div class="d-flex justify-content-between align-items-center">
            <button class="btn btn-sm btn-outline-secondary" type="button">Ver detalle</button>
            <span class="small small-muted">${fmtFecha(v.fecha)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Aplica filtros (categoría + texto) y orden por fecha desc.
function applyFilters(list) {
  let out = list;

  if (STATE.categoria !== "Todas") {
    out = out.filter((v) => v.categoria === STATE.categoria);
  }
  if (STATE.query) {
    const q = STATE.query;
    out = out.filter((v) => v.titulo.toLowerCase().includes(q) || (v.resumen || "").toLowerCase().includes(q) || (v.autor?.nombre || "").toLowerCase().includes(q));
  }

  return [...out].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
}

// Construye la paginación
function buildPager(page, pages) {
  if (pages <= 1) return "";
  const item = (p, label = p, disabled = false, active = false) => `
    <li class="page-item ${disabled ? "disabled" : ""} ${active ? "active" : ""}">
      <a class="page-link" href="#" data-page="${p}">${label}</a>
    </li>
  `;
  let html = "";
  html += item(page - 1, "«", page === 1);
  const win = 5;
  let s = Math.max(1, page - Math.floor(win / 2));
  let e = Math.min(pages, s + win - 1);
  if (e - s + 1 < win) s = Math.max(1, e - win + 1);
  for (let p = s; p <= e; p++) html += item(p, String(p), false, p === page);
  html += item(page + 1, "»", page === pages);
  return html;
}

// Marca pestaña activa (solo clase, sin estilos inline para que sea más sencillo)
function paintActiveTab() {
  document.querySelectorAll("#tabs .tab-pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.cat === STATE.categoria);
  })
  document.querySelectorAll("#filtro-seleccion .tab-pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.cat === STATE.filtroSeleccion);
  });
}

// Dibujo principal
function draw() {
  const grid = $("#grid");
  const pager = $("#pager");

  let listaBase;

 if (STATE.filtroSeleccion !== "Todos") {
  // Si no está seleccionado Todos nos quedamos solo con los voluntariados de seleccionados
  const selNums = STATE.seleccionados.map(Number);
  listaBase = selNums
    .map((id) => STATE.voluntariados.find((v) => Number(v.id) === id))
    .filter((v) => v);
} else {
  // Compare numerically to handle mixed id types
  const selNums = STATE.seleccionados.map(Number);
  listaBase = STATE.voluntariados.filter((v) => !selNums.includes(Number(v.id)));
}
  
  const filtered = applyFilters(listaBase || []);
  const { items, page, pages } = paginate(filtered, STATE.page, STATE.perPage);

  grid.innerHTML =
    items.map(cardHTML).join("") ||
    `
    <div class="col">
    </div>
    <div class="col">
      <div class="text-center text-secondary p-5 rounded">No hay resultados.</div>
    </div>
  `;

  pager.innerHTML = buildPager(page, pages);
  pager.onclick = (e) => {
    const a = e.target.closest("a[data-page]");
    if (!a) return;
    e.preventDefault();
    STATE.page = Number(a.dataset.page);
    draw();
  };

  paintActiveTab();
}


// Función para pintar las tarjetas en la zona de soltar
function renderSeleccionados() {
  const dropZoneSection = $("#drop-zone-section");
  const dropZone = $("#drop-zone");
  const placeholder = $("#drop-zone-placeholder");

  //Si filtramos solo los seleccionados escondemos el "Selección de Voluntariados" 
  if (STATE.filtroSeleccion !== "Todos") {
    dropZoneSection.style.display = 'none';
    return;
  }
  
  dropZoneSection.style.display = 'block';
  
  // Limpia solo las tarjetas seleccionadas anteriores, no el placeholder
  dropZone.querySelectorAll('.card-selected-item').forEach(card => card.remove());

  if (STATE.seleccionados.length === 0) {
    placeholder.style.display = 'block';
    return;
  }

  placeholder.style.display = 'none';

  const seleccionadosHTML = STATE.seleccionados.map(id => {
    const voluntariado = STATE.voluntariados.find((v) => Number(v.id) === Number(id));
    if (!voluntariado) return '';
        const catCls = categoryClass(voluntariado.categoria);
    // Usamos una versión "simplificada" de la tarjeta para la zona de selección
    return `
      <div class="card card-selected-item card-ld ${catCls} p-2 shadow-sm" draggable="true" data-id-seleccionado="${id}">
        <div class="d-flex justify-content-between align-items-center">
          <div class="flex-grow-1">
            <div class="fw-bold text-center small px-2">${voluntariado.titulo}</div>
            <div class="text-center small px-2">${voluntariado.autor?.nombre || 'Unknown'}</div>
            <div class="text-center small px-2">${voluntariado.fecha}</div>
          </div>
          <button type="button" class="btn-close small" data-id-quitar="${id}" aria-label="Quitar"></button>
        </div>
      </div>
    `;
  }).join('');
  
  dropZone.insertAdjacentHTML('beforeend', seleccionadosHTML);
}

// Init

document.addEventListener("DOMContentLoaded", () => {
  (async () => {
    // ensure frontend knows about server session on load
    try {
      await import('./almacenaje.js').then(m => m.ensureActiveUserFromSession && m.ensureActiveUserFromSession());
    } catch (e) {
      // ignore
    }
    initDashboard();
  })();
});

async function initDashboard() {
  const app = $("#app");
  await renderLayout(app);


  // Intenta sincronizar usuario desde la sesión del backend
  let user = getActiveUser();
  if (!user) {
    user = await fetchSessionUser();
    if (user) setActiveUser(user);
  }
  setNavbarUser(user?.nombre || "-no login-");


  // Carga los voluntariados desde la API
  try {
    STATE.voluntariados = await listarVoluntariados();
    console.log("voluntariados loaded:", STATE.voluntariados);
  } catch (error) {
    console.error("Error loading voluntariados:", error);
    STATE.voluntariados = [];
  }

  // Carga los seleccionados desde localStorage
  // Always store seleccionados as array of numbers
  STATE.seleccionados = (listarSeleccionados() || []).map(Number);


  // WebSocket para actualizaciones en tiempo real
  const socket = io("http://localhost:4000");
  socket.on("voluntariadoUpdated", async () => {
    console.log("Voluntariados actualizados, recargando...");
    try {
      STATE.voluntariados = await listarVoluntariados();
      draw();
    } catch (error) {
      console.error("Error reloading voluntariados:", error);
    }
  });

  // NOTA: Para evitar problemas de sesión/cookies, abre SIEMPRE el frontend desde http://localhost:5500 o similar, NUNCA como file://
  // Also re-sync active user when window gains focus (user may have logged in in other tab)
  window.addEventListener('focus', async () => {
    try {
      const m = await import('./almacenaje.js');
      await (m.ensureActiveUserFromSession && m.ensureActiveUserFromSession());
      const active = m.getActiveUser();
      setNavbarUser(active?.nombre || '-no login-');
    } catch (e) {}
  });
  // Si puedes, sirve el frontend desde el mismo servidor Express para evitar CORS y problemas de sesión.

  // Listeners de búsqueda y pestañas
  $("#q").addEventListener("input", (e) => {
    STATE.query = e.target.value.trim().toLowerCase();
    STATE.page = 1;
    draw();
  });

  $("#tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-cat]");
    if (!btn) return;
    STATE.categoria = btn.dataset.cat;
    STATE.page = 1;
    draw();
  });

  $("#filtro-seleccion").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-cat]");
    if (!btn) return;
    STATE.filtroSeleccion = btn.dataset.cat;
    STATE.page = 1;
    draw();
    renderSeleccionados();
  });

  // initialize drag & drop handlers (extracted to module)
  addDragAndDropListeners({
    $, STATE,
    apiCrearSeleccionado: async (userId, idVol) => {
      // fallback to local storage helper if server API not wired
      const voluntariado = STATE.voluntariados.find((v) => Number(v.id) === Number(idVol));
      if (voluntariado) {
        guardarSeleccionados({ ...voluntariado, id: Number(voluntariado.id) });
      }
      return { id: undefined };
    },
    apiBorrarSeleccionado: async (id) => {
      // fallback to local storage helper
      borrarSeleccionados(id);
    },
    draw,
    renderSeleccionados,
  });

  // Primer pintado
  draw();
  renderSeleccionados();
}

async function handleDropToGrid(e) {
    e.preventDefault();
    const grid = $("#grid");
    grid.classList.remove("drag-over-grid");

    const id = Number(e.dataTransfer.getData("text/plain"));
    const source = e.dataTransfer.getData("application/source");

    if (!id || source !== "dropzone") return;
    
    // Si viene de la zona de selección, hay que quitarlo de seleccionados
    if (STATE.seleccionados.includes(id)) {
      try {
        await borrarSeleccionados(id); // Eliminar de localStorage
      } catch (err) {
        console.error("[dashboard] error eliminando en localStorage", err);
      }
      // Always reload seleccionados from localStorage as numbers
      STATE.seleccionados = (listarSeleccionados() || []).map(Number);
      draw();
      renderSeleccionados();
    }
}