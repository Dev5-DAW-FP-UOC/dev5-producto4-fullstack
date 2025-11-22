// js/volunteers.js
// Persistencia con IndexedDB + gráfico Canvas + UI

import { listarUsuarios, altaVoluntariado, borrarVoluntariado, listarVoluntariados, getActiveUser, borrarSeleccionados } from "./almacenaje.js";

const $ = (s, ctx = document) => ctx.querySelector(s);
const todayISO = () => new Date().toISOString().slice(0, 10);

// ---------------- UI helpers ----------------
function shortLabel(str, max = 18) {
  const s = String(str || "");
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
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
function fmtFecha(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}
function normCat(c) {
  const v = String(c || "").toLowerCase();
  if (v.startsWith("idio")) return "Idiomas";
  if (v.startsWith("depo")) return "Deportes";
  if (v.startsWith("prof")) return "Profesiones";
  return "Idiomas";
}

function itemHTML(v) {
  const cat = normCat(v.categoria);
  const typeBadge = String(v.type).toLowerCase().includes("pet") ? '<span class="badge bg-primary me-2">Petición</span>' : '<span class="badge bg-warning text-dark me-2">Oferta</span>';

  const trashBtn = `
    <button class="btn-icon" data-action="del" title="Eliminar" aria-label="Eliminar">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 6h18" stroke="#666" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="#666" stroke-width="2"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#666" stroke-width="2"/>
        <path d="M10 11v6M14 11v6" stroke="#666" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  `;

  return `
    <div class="item p-3 p-md-4 border rounded-3 cat-${cat}" data-id="${v.id}">
      <div class="d-flex justify-content-between align-items-start gap-3">
        <div class="flex-grow-1">
          <div class="fw-bold mb-1">${typeBadge}${v.titulo}</div>
          <div class="text-muted small mb-2">
  ${cat}${v.creadoPor ? " · Creado por: " + v.creadoPor : ""}
</div>

          <div>${v.descripcion || v.resumen || ""}</div>
        </div>
        <div class="text-end d-flex flex-column align-items-end gap-2">
          <small class="text-muted">${fmtFecha(v.fecha)}</small>
          ${trashBtn}
        </div>
      </div>
    </div>
  `;
}

// ---------- Estado en memoria (refleja IndexedDB) ----------
const state = { vols: [] };

// ---------- Render listado + contador + gráfico ----------
function drawList() {
  const list = $("#list");
  if (!list) return;

  if (!state.vols.length) {
    list.innerHTML = `<div class="text-muted">No hay registros.</div>`;
    document.getElementById("countVol")?.replaceChildren(document.createTextNode("0 ítem(s)"));
    drawCanvasChart();
    return;
  }

  list.innerHTML = state.vols.map(itemHTML).join("");
  document.getElementById("countVol")?.replaceChildren(document.createTextNode(`${state.vols.length} ítem(s)`));

  drawCanvasChart(); // actualizar gráfico siempre
}

async function handleSubmit(e) {
  e.preventDefault();
  const f = e.currentTarget;

  // 🔧 añade esta línea:
  const active = getActiveUser();

  const nuevo = {
    // id: (NO poner, lo genera IndexedDB)
    titulo: (f.titulo?.value || "").trim(),
    categoria: normCat(f.categoria?.value),
    type: (f.tipo?.value || "oferta").toLowerCase(),
    email: (f.email?.value || "").trim(),
    descripcion: (f.descripcion?.value || "").trim(),
    resumen: (f.descripcion?.value || "").trim(),
    fecha: f.fecha?.value || todayISO(),
    creadoPor: active?.nombre || "Anónimo", // ← ahora sí existe 'active'
  };

  if (!nuevo.titulo || !nuevo.descripcion) {
    alert("Rellena título y descripción.");
    return;
  }

  try {
    await altaVoluntariado(nuevo);
  } catch (err) {
    console.error("IndexedDB put failed:", err);
    alert("No se pudo guardar el voluntariado (ver consola).");
    return;
  }

  await loadFromDB(); // refresca state.vols
  drawList();

  document.dispatchEvent(new CustomEvent('voluntariadoChanged'));

  f.reset();
  const ff = $("#fecha");
  if (ff) ff.value = todayISO();
}

async function handleListClick(e) {
  const btn = e.target.closest("[data-action='del']");
  if (!btn) return;
  const card = btn.closest("[data-id]");
  const idStr = card?.dataset.id;
  if (!idStr) return;

  const id = Number(idStr); // id numérico (autoIncrement)
  await borrarVoluntariado(id);
    try {
    await borrarSeleccionados(id); 
  } catch (err) {
    //Como es probable que el voluntariado no estuviese seleccionado saltará el error
    console.log("No fue necesario borrar de seleccionados o la clave no existía.");
  }
  await loadFromDB();
  drawList();

  document.dispatchEvent(new CustomEvent('voluntariadoChanged'));
}

// ---------- Carga inicial + seed opcional desde datos.js ----------
async function loadFromDB() {
  state.vols = (await listarVoluntariados()).map(v => ({
    ...v,
    creadoPor: v.creadoPor || v.autor || "Anónimo" // <- usa autor si no existe creadoPor
  }));
}

// ---------- Canvas ----------
function countByType(arr) {
  // cuenta TODO (existentes + nuevos), sin filtrar por usuario
  const c = { oferta: 0, peticion: 0 };
  (arr || []).forEach((v) => {
    const t = String(v.type || v.tipo || "oferta").toLowerCase();
    if (t.includes("pet")) c.peticion++;
    else c.oferta++;
  });
  return c;
}

function drawCanvasChart() {
  const canvas = document.getElementById("chartVol");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Escalado HiDPI
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || canvas.width;
  const cssH = canvas.clientHeight || canvas.height;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Agrupar por usuario
  const userMap = {};
  (state.vols || []).forEach(v => {
    const user = v.creadoPor || "Anónimo";
    if (!userMap[user]) userMap[user] = { oferta: 0, peticion: 0 };
    const t = String(v.type || v.tipo || "oferta").toLowerCase();
    if (t.includes("pet")) userMap[user].peticion++;
    else userMap[user].oferta++;
  });

  const users = Object.keys(userMap);
  const values = users.map(u => [userMap[u].oferta, userMap[u].peticion]);

  // Layout
  const padX = 20, padTop = 18, padBottom = 28;
  const W = cssW, H = cssH;
  ctx.clearRect(0, 0, W, H);
  ctx.font = "11px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textBaseline = "middle";

  // Escala vertical
  const maxVal = Math.max(1, ...values.flat());
  const scale = (H - padTop - padBottom) / maxVal;
  const gap = 16;
  const barW = Math.min(40, (W - padX * 2 - gap * users.length) / (users.length * 2));

  // Eje X
  ctx.strokeStyle = "#aaa";
  ctx.beginPath();
  ctx.moveTo(padX, H - padBottom + 0.5);
  ctx.lineTo(W - padX, H - padBottom + 0.5);
  ctx.stroke();

  users.forEach((user, i) => {
    const [oferta, peticion] = values[i];
    const x0 = padX + i * (2 * barW + gap);

    // Oferta (azul)
    const h1 = oferta * scale;
    ctx.fillStyle = "#0d6efd";
    ctx.fillRect(x0, H - padBottom - h1, barW, h1);

    // Petición (amarilla)
    const h2 = peticion * scale;
    ctx.fillStyle = "#ffc107";
    ctx.fillRect(x0 + barW, H - padBottom - h2, barW, h2);

    // Valores arriba
    ctx.fillStyle = "#111";
    ctx.textAlign = "center";
    ctx.fillText(String(oferta), x0 + barW / 2, H - padBottom - h1 - 10);
    ctx.fillText(String(peticion), x0 + barW + barW / 2, H - padBottom - h2 - 10);

    // Nombre abajo
    ctx.fillStyle = "#555";
    ctx.fillText(user, x0 + barW, H - padBottom + 12);
  });
}


// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", async () => {
  // await inicializarDatos();

  const active = getActiveUser();
  setNavbarUser(active?.nombre);

  const form = document.getElementById("formVol");
  if (form && active?.email) {
    const emailInput = form.querySelector('input[name="email"], #email');
    if (emailInput && !emailInput.value) {
      emailInput.value = active.email;
    }
  }
  const fch = $("#fecha");
  if (fch && !fch.value) fch.value = todayISO();

  await loadFromDB();
  drawList();

  $("#formVol")?.addEventListener("submit", (e) => {
    handleSubmit(e);
  });
  $("#list")?.addEventListener("click", (e) => {
    handleListClick(e);
  });

  // Redibuja el canvas al redimensionar
  window.addEventListener("resize", () => drawCanvasChart());
});