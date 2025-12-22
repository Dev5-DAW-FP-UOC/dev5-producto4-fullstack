// js/dashboard.js

import { API } from "./services/api.js";

const $ = (s, ctx = document) => ctx.querySelector(s);

// Estado del dashboard
const STATE = {
  user: null, // <--- Agregado para identificar quién está logueado
  categoria: "Todas",
  filtroSeleccion: "Todos",
  query: "",
  page: 1,
  perPage: 6,
  voluntariados: [],
  seleccionados: []
};


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

// Clase CSS según categoría
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

// Dibuja la estructura base
function renderLayout(container) {
  const categorias = ["Todas", "Idiomas", "Deportes", "Profesiones"];
  const filtroSeleccion = ["Todos", "Seleccionados"];
  container.innerHTML = `
    <section class="mb-3">
      <input id="q" class="form-control form-control-lg" placeholder="Buscar por título, texto..." />
    </section>

    <section class="mb-3 d-flex justify-content-between align-items-center">
      <div id="tabs" class="d-flex flex-row flex-wrap gap-2">
        ${categorias.map(c => `
          <button class="tab-pill tab-${c} ${c === STATE.categoria ? "active" : ""}" data-cat="${c}" type="button">
            ${c}
          </button>
        `).join("")}
      </div>
      <div id="filtro-seleccion" class="d-flex flex-row justify-content-end">
          ${filtroSeleccion.map(c => `
            <button class="tab-pill tab-${c} ${c === STATE.filtroSeleccion ? "active" : ""}" data-cat="${c}" type="button">
              ${c}
            </button>
          `).join("")}
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

function cardHTML(v) {
  const catCls = categoryClass(v.categoria);
  const autor = v.nombre_usuario || `Usuario #${v.id_usuario}`; 

  return `
    <div class="col" draggable="true" data-id="${v.id}">
      <div class="card card-ld ${catCls} h-100">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between small mb-1">
            <div class="small-muted fw-semibold">${v.categoria}</div>
          </div>
          <h5 class="mb-1">${v.titulo}</h5>
          <div class="small small-muted mb-2">por <strong>${autor}</strong></div>
          <p class="flex-grow-1 mb-2">${v.resumen || ""}</p>
          <div class="d-flex justify-content-between align-items-center">
            <button class="btn btn-sm btn-outline-secondary">Ver detalle</button>
            <span class="small small-muted">${fmtFecha(v.fecha)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function applyFilters(list) {
  let out = list;
  if (STATE.categoria !== "Todas") {
    out = out.filter((v) => v.categoria === STATE.categoria);
  }
  if (STATE.query) {
    const q = STATE.query.toLowerCase();
    out = out.filter((v) => 
      v.titulo.toLowerCase().includes(q) || 
      (v.resumen || "").toLowerCase().includes(q)
    );
  }
  return [...out].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
}

function buildPager(page, pages) {
  if (pages <= 1) return "";
  const item = (p, label = p, disabled = false, active = false) => `
    <li class="page-item ${disabled ? "disabled" : ""} ${active ? "active" : ""}">
      <a class="page-link" href="#" data-page="${p}">${label}</a>
    </li>
  `;
  let html = "";
  html += item(page - 1, "«", page === 1);
  for (let p = 1; p <= pages; p++) html += item(p, String(p), false, p === page);
  html += item(page + 1, "»", page === pages);
  return html;
}

function paintActiveTab() {
  document.querySelectorAll("#tabs .tab-pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.cat === STATE.categoria);
  });
  document.querySelectorAll("#filtro-seleccion .tab-pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.cat === STATE.filtroSeleccion);
  });
}

function draw() {
    const grid = $("#grid");
    if (!grid) return;
    const listaParaMostrar = STATE.voluntariados.filter(v => {
        const loTengoYo = STATE.seleccionados.some(sel => Number(sel.volId) === Number(v.id));
        return !loTengoYo && !v.ocupado; 
    });

    const filtered = applyFilters(listaParaMostrar);
    const { items, page, pages } = paginate(filtered, STATE.page, STATE.perPage);

    grid.innerHTML = items.map(cardHTML).join("") || `<div class="p-5 text-center">No hay voluntarios libres.</div>`;
    $("#pager").innerHTML = buildPager(page, pages)
}

function renderSeleccionados() {
  const dropZoneSection = $("#drop-zone-section");
  const dropZone = $("#drop-zone");
  const placeholder = $("#drop-zone-placeholder");
  if(!dropZone) return;

  if (STATE.filtroSeleccion !== "Todos") {
    dropZoneSection.style.display = 'none';
    return;
  }
  
  dropZoneSection.style.display = 'block';
  dropZone.querySelectorAll('.card-selected-item').forEach(card => card.remove());

  if (STATE.seleccionados.length === 0) {
    placeholder.style.display = 'block';
    return;
  }

  placeholder.style.display = 'none';

  const seleccionadosHTML = STATE.seleccionados.map(selObj => {
    const vol = STATE.voluntariados.find(v => v.id === selObj.volId);
    if (!vol) return '';
    const catCls = categoryClass(vol.categoria);
    return `
      <div class="card card-selected-item card-ld ${catCls} p-2 shadow-sm" data-id-seleccionado="${vol.id}">
          <div class="d-flex justify-content-between align-items-center">
            <div class="flex-grow-1">
              <div class="fw-bold small px-2">${vol.titulo}</div>
              <div class="text-muted small px-2">${fmtFecha(vol.fecha)}</div>
            </div>
            <button type="button" class="btn-close small" data-id-quitar="${selObj.selId}"></button>
          </div>
      </div>`;
  }).join('');
  
  dropZone.insertAdjacentHTML('beforeend', seleccionadosHTML);
}

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
  try {
    const meData = await API.getMe();
    if (!meData.me) {
        window.location.href = "login.html";
        return;
    }
    STATE.user = meData.me; // Guardamos el usuario logueado
    setNavbarUser(STATE.user.nombre);

    renderLayout($("#app"));

    const [vols, sels] = await Promise.all([
        API.getVoluntariados(),
        API.getSeleccionados()
    ]);

    STATE.voluntariados = vols;
    STATE.seleccionados = sels.map(s => ({
      selId: Number(s.id),             
      volId: Number(s.id_voluntariado)  
    }));

    const socket = io("http://localhost:4000");

    socket.on("voluntariado-creado", (nuevoVol) => {
      if (!STATE.voluntariados.find(v => v.id === nuevoVol.id)) {
        STATE.voluntariados.push(nuevoVol);
        draw();
      }
    });

    socket.on("voluntariado-seleccionado", (data) => {
      if (Number(data.userId) === Number(STATE.user.id)) {
        if (!STATE.seleccionados.some(s => s.selId === data.selId)) {
            STATE.seleccionados.push({
                selId: data.selId,
                volId: data.volId
            });
        }
      }
      const vol = STATE.voluntariados.find(v => v.id === data.volId);
      if (vol) {
          vol.ocupado = true; // Le ponemos una marca temporal
      }
      draw(); 
      renderSeleccionados();
    });

    socket.on("voluntariado-deseleccionado", (data) => {
      if (Number(data.userId) === Number(STATE.user.id)) {
        STATE.seleccionados = STATE.seleccionados.filter(s => Number(s.selId) !== Number(data.selId));
      }

      const vol = STATE.voluntariados.find(v => Number(v.id) === Number(data.volId));
      if (vol) {
        vol.ocupado = false; // Ya no está ocupado, debe volver al grid
      } else {
        STATE.voluntariados.push(data.voluntariado);
      }
      
      draw(); 
      renderSeleccionados();
    });

    socket.on("voluntariado-eliminado", (idVolEliminado) => {
      STATE.voluntariados = STATE.voluntariados.filter(v => v.id !== idVolEliminado);
      STATE.seleccionados = STATE.seleccionados.filter(s => s.volId !== idVolEliminado);
      draw();
      renderSeleccionados();
    });

    setupEventListeners();
    draw();
    renderSeleccionados();

  } catch (error) {
    console.error("Error inicializando dashboard:", error);
  }
} // <--- CIERRE DE initDashboard (Aquí estaba el error)

function setupEventListeners() {
  $("#q").addEventListener("input", (e) => {
    STATE.query = e.target.value;
    STATE.page = 1;
    draw();
  });

  $("#tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-cat]");
    if (btn) { STATE.categoria = btn.dataset.cat; STATE.page = 1; draw(); }
  });

  $("#filtro-seleccion").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-cat]");
    if (btn) { STATE.filtroSeleccion = btn.dataset.cat; draw(); renderSeleccionados(); }
  });

  $("#pager").addEventListener("click", (e) => {
    const a = e.target.closest("a[data-page]");
    if (a) { e.preventDefault(); STATE.page = Number(a.dataset.page); draw(); }
  });

  addDragAndDrop();
}

function addDragAndDrop() {
    const dropZone = $("#drop-zone");
    const grid = $("#grid");

    grid.addEventListener("dragstart", (e) => {
        const card = e.target.closest('[data-id]');
        if (card) {
            e.dataTransfer.setData("text/plain", card.dataset.id);
            e.dataTransfer.setData("source", "grid");
        }
    });

    dropZone.addEventListener("dragover", (e) => e.preventDefault());
    
    dropZone.addEventListener("drop", async (e) => {
        e.preventDefault();
        const id = Number(e.dataTransfer.getData("text/plain"));
        const source = e.dataTransfer.getData("source");
        const yaSeleccionado = STATE.seleccionados.some(s => s.volId === id);

        if (source === "grid" && !yaSeleccionado) {
          try {
            const res = await API.crearSeleccionado(id);
            if (res) {
              if (!STATE.seleccionados.some(s => s.volId === id)) {
                STATE.seleccionados.push({ selId: Number(res.id), volId: id });
              }
              draw(); 
              renderSeleccionados();
            }
          } catch (err) { console.error(err); }
        }
    });

    dropZone.addEventListener("click", async (e) => {
        const btn = e.target.closest('[data-id-quitar]');
        if (btn) {
            const id = Number(btn.dataset.idQuitar);
            try {
                await API.borrarSeleccionado(id);
                STATE.seleccionados = STATE.seleccionados.filter(s => s.selId !== id);
                draw();
                renderSeleccionados();
            } catch (err) { alert("Error: " + err.message); }
        }
    });
}