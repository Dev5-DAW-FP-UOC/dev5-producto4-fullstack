import { init, getVoluntariados, getCategorias } from './almacenaje.js';
import { checkLogin, updateNavbar } from './auth.js';

const STATE = {
  categoria: "Todas",
  query: "",
  page: 1,
  perPage: 6,
  voluntariados: [],
  seleccionados: []
};

const $ = (sel, ctx = document) => ctx.querySelector(sel);

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

function fmtFecha(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

function paginate(arr, page = 1, perPage = 6) {
  const pages = Math.max(1, Math.ceil(arr.length / perPage));
  const p = Math.min(Math.max(page, 1), pages);
  const start = (p - 1) * perPage;
  return { page: p, pages, items: arr.slice(start, start + perPage) };
}

function categoryClass(cat) {
  return (
    {
      Idiomas: "cat-Idiomas",
      Deportes: "cat-Deportes",
      Profesiones: "cat-Profesiones",
    }[cat] || ""
  );
}

function renderLayout(container) {
  const categorias = getCategorias();
  container.innerHTML = `
    <section class="mb-3">
      <input id="q" class="form-control form-control-lg" placeholder="Buscar por título, texto..." />
    </section>

    <section class="mb-3">
      <div id="tabs" class="d-flex flex-wrap gap-2">
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
    </section>

    <section>
      <div id="grid" class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3"></div>
      <nav class="mt-4 d-flex justify-content-center">
        <ul id="pager" class="pagination"></ul>
      </nav>
    </section>

    <section class="mt-5">
        <h2 class="h4 mb-3">Mi Selección</h2>
        <div id="drop-zone" class="vstack gap-3">
            <p id="drop-zone-placeholder" class="text-center text-muted m-0">Arrastra aquí tus voluntariados seleccionados</p>
        </div>
    </section>
  `;
}

function cardHTML(v) {
  const catCls = categoryClass(v.categoria);
  const typeBadge = v.tipo === "oferta" ? `<span class="badge badge-oferta">Oferta</span>` : `<span class="badge badge-peticion">Petición</span>`;

  return `
    <div class="col" draggable="true" data-id="${v.id}">
      <div class="card card-ld ${catCls} h-100">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between small mb-1">
            <div>${typeBadge}</div>
            <div class="small small-muted fw-semibold">${v.categoria}</div>
          </div>
          <h5 class="mb-1">${v.titulo}</h5>
          <div class="small small-muted mb-2">por <strong>${v.email || 'Anónimo'}</strong></div>
          <p class="flex-grow-1 mb-2">${v.descripcion || ""}</p>
          <div class="d-flex justify-content-between align-items-center">
            <button class="btn btn-sm btn-outline-secondary" type="button">Ver detalle</button>
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
    const q = STATE.query;
    out = out.filter((v) => v.titulo.toLowerCase().includes(q) || (v.descripcion || "").toLowerCase().includes(q) || (v.email || "").toLowerCase().includes(q));
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
  const win = 5;
  let s = Math.max(1, page - Math.floor(win / 2));
  let e = Math.min(pages, s + win - 1);
  if (e - s + 1 < win) s = Math.max(1, e - win + 1);
  for (let p = s; p <= e; p++) html += item(p, String(p), false, p === page);
  html += item(page + 1, "»", page === pages);
  return html;
}

function paintActiveTab() {
  document.querySelectorAll("#tabs .tab-pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.cat === STATE.categoria);
  });
}

function draw() {
  const grid = $("#grid");
  const pager = $("#pager");

  const voluntariadosDisponibles = STATE.voluntariados.filter(
    (v) => !STATE.seleccionados.includes(v.id)
  );
  
  const filtered = applyFilters(voluntariadosDisponibles || []);
  const { items, page, pages } = paginate(filtered, STATE.page, STATE.perPage);

  grid.innerHTML =
    items.map(cardHTML).join("") ||
    `
    <div class="col">
      <div class="text-center text-secondary p-5 border rounded">No hay resultados.</div>
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

function renderSeleccionados() {
    const dropZone = $("#drop-zone");
    const placeholder = $("#drop-zone-placeholder");
    
    dropZone.querySelectorAll('.card-selected-item').forEach(card => card.remove());

    if (STATE.seleccionados.length === 0) {
        placeholder.style.display = 'block';
        return;
    }

    placeholder.style.display = 'none';

    const seleccionadosHTML = STATE.seleccionados.map(id => {
        const voluntariado = STATE.voluntariados.find(v => v.id === id);
        if (!voluntariado) return '';
        const catCls = categoryClass(voluntariado.categoria);
        return `
            <div class="card card-selected-item card-ld ${catCls} p-2 shadow-sm" data-id-seleccionado="${id}">
                <div class="d-flex justify-content-between align-items-center">
                    <span class="fw-bold small px-2">${voluntariado.titulo}</span>
                    <button type="button" class="btn-close small" data-id-quitar="${id}" aria-label="Quitar"></button>
                </div>
            </div>
        `;
    }).join('');
    
    dropZone.insertAdjacentHTML('beforeend', seleccionadosHTML);
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  initDashboard();
});

async function initDashboard() {
  await init();

  const active = checkLogin();
  if (!active) return;
  
  updateNavbar();

  const app = $("#app");
  renderLayout(app);

  STATE.voluntariados = await getVoluntariados();

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

  addDragAndDropListeners();

  // [NUEVO] Inicializar WebSockets
  initWebSockets();

  draw();
  renderSeleccionados();
}

// --- Lógica Drag & Drop ---
        
function addDragAndDropListeners() {
    const dropZone = $("#drop-zone");
    const grid = $("#grid");

    dropZone.addEventListener("dragover", handleDragOver);
    dropZone.addEventListener("dragleave", handleDragLeave);
    dropZone.addEventListener("drop", handleDrop);
    grid.addEventListener("dragstart", handleDragStart);
    
    dropZone.addEventListener("click", (e) => {
        const quitartBtn = e.target.closest('[data-id-quitar]');
        if (quitartBtn) {
            const id = quitartBtn.dataset.idQuitar; // IDs son string en Mongo
            STATE.seleccionados = STATE.seleccionados.filter(selId => selId !== id);
            draw();
            renderSeleccionados();
        }
    });
}

function handleDragStart(e) {
    const card = e.target.closest('[data-id]');
    if (card) {
        e.dataTransfer.setData("text/plain", card.dataset.id);
        e.dataTransfer.effectAllowed = "move";
    }
}

function handleDragOver(e) {
    e.preventDefault();
    const dropZone = $("#drop-zone");
    dropZone.classList.add("drag-over");
    e.dataTransfer.dropEffect = "move";
}

function handleDragLeave(e) {
    const dropZone = $("#drop-zone");
    dropZone.classList.remove("drag-over");
}

function handleDrop(e) {
    e.preventDefault();
    const dropZone = $("#drop-zone");
    dropZone.classList.remove("drag-over");

    const id = e.dataTransfer.getData("text/plain"); // IDs son string
    if (!id) return;
    
    if (!STATE.seleccionados.includes(id)) {
        STATE.seleccionados.push(id);
        draw();
        renderSeleccionados();
    }
}

// --- [NUEVO] Lógica WebSockets ---

function initWebSockets() {
  // Se conecta a la misma URL del backend
  const socket = io("http://localhost:4000");

  console.log("Conectando a WebSockets...");

  socket.on("connect", () => {
    console.log("✅ WebSocket conectado:", socket.id);
  });

  // Escuchar cuando se crea un voluntariado
  socket.on("nuevo_voluntariado", (nuevoVoluntariado) => {
    console.log("WebSocket: Recibido nuevo voluntariado", nuevoVoluntariado);
    
    // Lo añadimos al estado local
    STATE.voluntariados.push(nuevoVoluntariado);
    
    // Repintamos para que el usuario lo vea al instante
    draw();
    
    // Opcional: Feedback visual
    // alert(`Nuevo voluntariado disponible: ${nuevoVoluntariado.titulo}`);
  });

  // Escuchar cuando se borra un voluntariado
  socket.on("voluntariado_borrado", (idBorrado) => {
    console.log("WebSocket: Voluntariado borrado", idBorrado);
    
    // Lo quitamos de la lista principal
    STATE.voluntariados = STATE.voluntariados.filter(v => v.id !== idBorrado);
    
    // Lo quitamos de seleccionados si estaba ahí
    STATE.seleccionados = STATE.seleccionados.filter(selId => selId !== idBorrado);
    
    // Repintamos todo
    draw();
    renderSeleccionados();
  });
}