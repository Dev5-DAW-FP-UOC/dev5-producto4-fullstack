// js/int_dashboard.js
import { gqlFetch } from "./api/graphqlClient.js";

console.log("[int_dashboard] cargado");

// Estado del dashboard
const STATE = {
  categoria: "Todas",
  filtroSeleccion: "Todos",
  query: "",
  page: 1,
  perPage: 6,
  voluntariados: [],
  seleccionados: [],

  // ✅ sesión actual
  me: null,

  // ✅ mapa: id_voluntariado -> id_seleccion (para borrar bien)
  _selMap: new Map(),
};

// Atajos simples
const $ = (sel, ctx = document) => ctx.querySelector(sel);

// funciones “API”
async function apiMe() {
  const data = await gqlFetch(`query { me { id nombre email rol } }`);
  return data.me; // puede ser null
}

async function apiCategorias() {
  const data = await gqlFetch(`query { categorias }`);
  return data.categorias || ["Todas"];
}

async function apiVoluntariados() {
  const data = await gqlFetch(`
    query {
      voluntariados {
        id type titulo id_usuario nombre_usuario modalidad categoria resumen fecha
      }
    }
  `);
  return data.voluntariados || [];
}

async function apiSeleccionadosPorUsuario(id_usuario) {
  const data = await gqlFetch(
    `query ($id_usuario:Int!) {
      seleccionadosPorUsuario(id_usuario:$id_usuario){
        id id_usuario id_voluntariado
      }
    }`,
    { id_usuario }
  );
  return data.seleccionadosPorUsuario || [];
}

async function apiCrearSeleccionado(id_usuario, id_voluntariado) {
  const data = await gqlFetch(
    `mutation ($id_usuario:Int!, $id_voluntariado:Int!) {
      crearSeleccionado(id_usuario:$id_usuario, id_voluntariado:$id_voluntariado){
        id id_usuario id_voluntariado
      }
    }`,
    { id_usuario, id_voluntariado }
  );
  return data.crearSeleccionado;
}

async function apiBorrarSeleccionado(id) {
  const data = await gqlFetch(
    `mutation ($id:Int!) { borrarSeleccionado(id:$id) }`,
    { id }
  );
  return data.borrarSeleccionado;
}

function setNavbarUser(name) {
  let badge = $("#userBadge") || document.querySelector(".navbar-text");
  if (!badge) {
    const container =
      $("#nav") || document.querySelector(".navbar .container, .navbar");
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
async function renderLayout(container, categorias) {
  const filtroSeleccion = ["Todos", "Seleccionados"];

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
                class="tab-pill tab-${c} ${
              c === STATE.categoria ? "active" : ""
            }"
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
          ${filtroSeleccion
            .map(
              (c) => `
              <button
                class="tab-pill tab-${c} ${
                c === STATE.filtroSeleccion ? "active" : ""
              }"
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
  const typeBadge =
    v.type === "oferta"
      ? `<span class="badge badge-oferta">Oferta</span>`
      : `<span class="badge badge-peticion">Petición</span>`;

  const autorTxt =
    v.nombre_usuario ||
    (v.id_usuario != null ? `Usuario #${v.id_usuario}` : "-");

  return `
    <div class="col" draggable="true" data-id="${v.id}">
      <div class="card card-ld ${catCls} h-100">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between small mb-1">
            <div>${typeBadge}</div>
            <div class="small small-muted fw-semibold">${v.categoria}</div>
          </div>
          <h5 class="mb-1">${v.titulo}</h5>
          <div class="small small-muted mb-2">por <strong>${autorTxt}</strong> · ${
    v.modalidad
  }</div>
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
    out = out.filter(
      (v) =>
        v.titulo.toLowerCase().includes(q) ||
        (v.resumen || "").toLowerCase().includes(q) ||
        String(v.id_usuario ?? "")
          .toLowerCase()
          .includes(q) // ✅ filtrar por autor (id_usuario)
    );
  }

  return [...out].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
}

// Construye la paginación
function buildPager(page, pages) {
  if (pages <= 1) return "";
  const item = (p, label = p, disabled = false, active = false) => `
    <li class="page-item ${disabled ? "disabled" : ""} ${
    active ? "active" : ""
  }">
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

// Marca pestaña activa
function paintActiveTab() {
  document.querySelectorAll("#tabs .tab-pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.cat === STATE.categoria);
  });
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
    listaBase = STATE.seleccionados
      .map((id) => STATE.voluntariados.find((v) => v.id === id))
      .filter((v) => v);
  } else {
    listaBase = STATE.voluntariados.filter(
      (v) => !STATE.seleccionados.includes(v.id)
    );
  }

  const filtered = applyFilters(listaBase || []);
  const { items, page, pages } = paginate(filtered, STATE.page, STATE.perPage);

  grid.innerHTML =
    items.map(cardHTML).join("") ||
    `
      <div class="col"></div>
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

// Seleccionados
function renderSeleccionados() {
  const dropZoneSection = $("#drop-zone-section");
  const dropZone = $("#drop-zone");
  const placeholder = $("#drop-zone-placeholder");

  if (STATE.filtroSeleccion !== "Todos") {
    dropZoneSection.style.display = "none";
    return;
  }

  dropZoneSection.style.display = "block";
  dropZone
    .querySelectorAll(".card-selected-item")
    .forEach((card) => card.remove());

  if (STATE.seleccionados.length === 0) {
    placeholder.style.display = "block";
    return;
  }

  placeholder.style.display = "none";

  const seleccionadosHTML = STATE.seleccionados
    .map((id) => {
      const voluntariado = STATE.voluntariados.find((v) => v.id === id);
      if (!voluntariado) return "";
      const catCls = categoryClass(voluntariado.categoria);

      const autorTxt =
        voluntariado.nombre_usuario ||
        (voluntariado.id_usuario != null
          ? `Usuario #${voluntariado.id_usuario}`
          : "-");

      return `
        <div class="card card-selected-item card-ld ${catCls} p-2 shadow-sm" draggable="true" data-id-seleccionado="${id}">
          <div class="d-flex justify-content-between align-items-center">
            <div class="flex-grow-1">
              <div class="fw-bold text-center small px-2">${voluntariado.titulo}</div>
              <div class="text-center small px-2">${autorTxt}</div>
              <div class="text-center small px-2">${voluntariado.fecha}</div>
            </div>
            <button type="button" class="btn-close small" data-id-quitar="${id}" aria-label="Quitar"></button>
          </div>
        </div>
      `;
    })
    .join("");

  dropZone.insertAdjacentHTML("beforeend", seleccionadosHTML);
}

async function comprobarSesion() {
  try {
    const me = await apiMe();
    if (!me) {
      window.location.href = "./login.html";
      return null;
    }
    return me;
  } catch (err) {
    console.error("Error comprobando sesión", err);
    window.location.href = "./login.html";
    return null;
  }
}

// Init
document.addEventListener("DOMContentLoaded", async () => {
  const me = await comprobarSesion();
  if (!me) return;

  STATE.me = me;
  setNavbarUser(me.nombre);

  await initDashboard();
});

async function initDashboard() {
  const app = $("#app");

  const categorias = await apiCategorias();
  await renderLayout(app, categorias);

  STATE.voluntariados = await apiVoluntariados();

  const selDocs = await apiSeleccionadosPorUsuario(STATE.me.id);

  STATE.seleccionados = selDocs.map((s) => s.id_voluntariado);
  STATE._selMap = new Map(selDocs.map((s) => [s.id_voluntariado, s.id]));

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

  addDragAndDropListeners();

  draw();
  renderSeleccionados();
}

function addDragAndDropListeners() {
  const dropZone = $("#drop-zone");
  const grid = $("#grid");

  dropZone.addEventListener("dragover", handleDragOver);
  dropZone.addEventListener("dragleave", handleDragLeave);
  dropZone.addEventListener("drop", handleDrop);

  grid.addEventListener("dragover", handleDragOverToGrid);
  grid.addEventListener("dragleave", handleDragLeaveToGrid);
  grid.addEventListener("drop", handleDropToGrid);

  grid.addEventListener("dragstart", handleDragStart);
  dropZone.addEventListener("dragstart", handleDragStartFromDropZone);

  dropZone.addEventListener("click", async (e) => {
    const quitBtn = e.target.closest("[data-id-quitar]");
    if (!quitBtn) return;

    const idVol = Number(quitBtn.dataset.idQuitar);
    const seleccionId = STATE._selMap.get(idVol);

    if (seleccionId) {
      try {
        await apiBorrarSeleccionado(seleccionId);
        STATE._selMap.delete(idVol);
      } catch (err) {
        console.error(
          "[dashboard] error eliminando seleccionado en servidor",
          err
        );
      }
    }

    STATE.seleccionados = STATE.seleccionados.filter((x) => x !== idVol);
    draw();
    renderSeleccionados();
  });
}

function handleDragStart(e) {
  const card = e.target.closest("[data-id]");
  if (card) {
    e.dataTransfer.setData("text/plain", card.dataset.id);
    e.dataTransfer.setData("application/source", "grid");
    e.dataTransfer.effectAllowed = "move";
  }
}

function handleDragStartFromDropZone(e) {
  const card = e.target.closest("[data-id-seleccionado]");
  if (card) {
    const id = card.dataset.idSeleccionado;
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.setData("application/source", "dropzone");
    e.dataTransfer.effectAllowed = "move";
  }
}

function handleDragOver(e) {
  e.preventDefault();
  const dropZone = $("#drop-zone");
  if (e.dataTransfer.types.includes("application/source")) {
    dropZone.classList.add("drag-over");
    e.dataTransfer.dropEffect = "move";
  } else {
    e.dataTransfer.dropEffect = "none";
  }
}

function handleDragOverToGrid(e) {
  e.preventDefault();
  const grid = $("#grid");
  if (e.dataTransfer.types.includes("application/source")) {
    grid.classList.add("drag-over-grid");
    e.dataTransfer.dropEffect = "move";
  } else {
    e.dataTransfer.dropEffect = "none";
  }
}

function handleDragLeave() {
  $("#drop-zone")?.classList.remove("drag-over");
}

function handleDragLeaveToGrid() {
  $("#grid")?.classList.remove("drag-over-grid");
}

async function handleDrop(e) {
  e.preventDefault();
  $("#drop-zone")?.classList.remove("drag-over");

  const idVol = Number(e.dataTransfer.getData("text/plain"));
  const source = e.dataTransfer.getData("application/source");
  if (!idVol || source !== "grid") return;

  if (!STATE.seleccionados.includes(idVol)) {
    STATE.seleccionados.push(idVol);

    try {
      const created = await apiCrearSeleccionado(STATE.me.id, idVol);
      STATE._selMap.set(idVol, created.id);
    } catch (err) {
      console.error("[dashboard] error creando seleccionado (API)", err);
    }

    draw();
    renderSeleccionados();
  }
}

async function handleDropToGrid(e) {
  e.preventDefault();
  $("#grid")?.classList.remove("drag-over-grid");

  const idVol = Number(e.dataTransfer.getData("text/plain"));
  const source = e.dataTransfer.getData("application/source");
  if (!idVol || source !== "dropzone") return;

  if (STATE.seleccionados.includes(idVol)) {
    try {
      const seleccionId = STATE._selMap.get(idVol);
      if (seleccionId) {
        await apiBorrarSeleccionado(seleccionId);
        STATE._selMap.delete(idVol);
      }
    } catch (err) {
      console.error("[dashboard] error borrando seleccionado (API)", err);
    }

    STATE.seleccionados = STATE.seleccionados.filter((x) => x !== idVol);
    draw();
    renderSeleccionados();
  }
}
