// ./js/int_voluntariados.js
// Voluntariados (GraphQL) + sesión (cookie) + Canvas

const API_URL = "http://localhost:4000/graphql";
const $ = (s, ctx = document) => ctx.querySelector(s);
const todayISO = () => new Date().toISOString().slice(0, 10);

function showMsg(text, type = "danger") {
  const el = document.getElementById("msg");
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type} py-2 mb-0">${text}</div>`;
}

async function fetchGraphQL(query, variables = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("GraphQL HTTP error:", res.status, json);
    throw new Error(`HTTP ${res.status}`);
  }
  if (json.errors?.length) {
    console.error("GraphQL errors:", json.errors);
    throw new Error(json.errors[0]?.message || "GraphQL error");
  }
  return json.data;
}

async function getMe() {
  const q = `query { me { id nombre email rol } }`;
  const data = await fetchGraphQL(q);
  return data?.me ?? null;
}

async function listarVoluntariadosAPI() {
  const q = `
    query {
      voluntariados {
        id
        type
        titulo
        id_usuario
        nombre_usuario
        modalidad
        categoria
        resumen
        fecha
      }
    }
  `;
  const data = await fetchGraphQL(q);
  return data?.voluntariados ?? [];
}

async function crearVoluntariadoAPI(args) {
  const m = `
    mutation CrearVol($type: String!, $titulo: String!, $id_usuario: Int!, $modalidad: String!, $categoria: String!, $resumen: String!, $fecha: String!) {
      crearVoluntariado(
        type: $type,
        titulo: $titulo,
        id_usuario: $id_usuario,
        modalidad: $modalidad,
        categoria: $categoria,
        resumen: $resumen,
        fecha: $fecha
      ) {
        id
      }
    }
  `;
  const data = await fetchGraphQL(m, args);
  return data?.crearVoluntariado ?? null;
}

async function borrarVoluntariadoAPI(id) {
  const m = `
    mutation ($id: Int!) {
      borrarVoluntariado(id: $id)
    }
  `;
  const data = await fetchGraphQL(m, { id: Number(id) });
  return !!data?.borrarVoluntariado;
}

// ---------------- UI helpers ----------------
function setNavbarUser(name) {
  const badge = $("#userBadge");
  if (badge) badge.textContent = name || "-no login-";
}

function fmtFecha(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return (
    String(d.getDate()).padStart(2, "0") +
    "/" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "/" +
    d.getFullYear()
  );
}

function normCat(c) {
  const v = String(c || "").toLowerCase();
  if (v.startsWith("idio")) return "Idiomas";
  if (v.startsWith("depo")) return "Deportes";
  if (v.startsWith("prof")) return "Profesiones";
  return "Idiomas";
}

function shortLabel(str, max = 16) {
  const s = String(str || "");
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function itemHTML(v) {
  const cat = normCat(v.categoria);
  const t = String(v.type || "oferta").toLowerCase();
  const typeBadge = t.includes("pet")
    ? '<span class="badge bg-primary me-2">Petición</span>'
    : '<span class="badge bg-warning text-dark me-2">Oferta</span>';

  return `
    <div class="item p-3 p-md-4 border rounded-3 cat-${cat}" data-id="${v.id}">
      <div class="d-flex justify-content-between align-items-start gap-3">
        <div class="flex-grow-1">
          <div class="fw-bold mb-1">${typeBadge}${v.titulo}</div>
          <div class="text-muted small mb-2">
            ${cat} · Usuario: ${v.nombre_usuario || `U${v.id_usuario}`}
          </div>
          <div>${v.resumen || ""}</div>
        </div>
        <div class="text-end d-flex flex-column align-items-end gap-2">
          <small class="text-muted">${fmtFecha(v.fecha)}</small>
          <button class="btn-icon" data-action="del" title="Eliminar" aria-label="Eliminar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 6h18" stroke="#666" stroke-width="2" stroke-linecap="round"/>
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="#666" stroke-width="2"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#666" stroke-width="2"/>
              <path d="M10 11v6M14 11v6" stroke="#666" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ---------------- State ----------------
const state = { me: null, vols: [] };

async function loadFromAPI() {
  state.vols = (await listarVoluntariadosAPI()).map((v) => ({
    ...v,
    categoria: normCat(v.categoria),
    type: String(v.type || "oferta").toLowerCase(),
  }));
}

function drawList() {
  const list = $("#list");
  if (!list) return;

  if (!state.vols.length) {
    list.innerHTML = `<div class="text-muted">No hay registros.</div>`;
    $("#countVol")?.replaceChildren(document.createTextNode("0 ítem(s)"));
    drawCanvasChart();
    return;
  }

  list.innerHTML = state.vols.map(itemHTML).join("");
  $("#countVol")?.replaceChildren(
    document.createTextNode(`${state.vols.length} ítem(s)`)
  );
  drawCanvasChart();
}

async function handleSubmit(e) {
  e.preventDefault();
  const f = e.currentTarget;

  const resumen = (f.descripcion?.value || "").trim();
  const titulo = (f.titulo?.value || "").trim();

  if (!titulo || !resumen) {
    alert("Rellena título y descripción.");
    return;
  }

  const payload = {
    type: (f.tipo?.value || "oferta").toLowerCase(),
    titulo,
    id_usuario: Number(state.me.id), // obligatorio por schema, aunque backend lo sobrescribe
    modalidad: f.modalidad?.value || "Presencial",
    categoria: normCat(f.categoria?.value),
    resumen,
    fecha: f.fecha?.value || todayISO(),
  };

  try {
    await crearVoluntariadoAPI(payload);
  } catch (err) {
    console.error(err);
    showMsg(err.message || "No se pudo crear el voluntariado.", "danger");
    return;
  }

  showMsg("Voluntariado creado correctamente.", "success");
  await loadFromAPI();
  drawList();

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

  if (!confirm("¿Seguro que quieres borrar este voluntariado?")) return;

  try {
    await borrarVoluntariadoAPI(Number(idStr));
  } catch (err) {
    console.error(err);
    showMsg(err.message || "No se pudo borrar.", "danger");
    return;
  }

  showMsg("Voluntariado borrado.", "success");
  await loadFromAPI();
  drawList();
}

// ---------------- Canvas ----------------
function drawCanvasChart() {
  const canvas = document.getElementById("chartVol");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // HiDPI
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 720;
  const cssH =
    canvas.clientHeight || Number(canvas.getAttribute("height")) || 120;

  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, cssW, cssH);
  ctx.font = "11px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textBaseline = "middle";

  // Agrupa por id_usuario (porque tu schema no trae nombre)
  // Agrupa por nombre_usuario (fallback_toggle)
  const userMap = {};
  for (const v of state.vols) {
    const userLabel =
      v.nombre_usuario || (v.id_usuario != null ? `U${v.id_usuario}` : "—");

    if (!userMap[userLabel]) userMap[userLabel] = { oferta: 0, peticion: 0 };

    if (String(v.type).includes("pet")) userMap[userLabel].peticion++;
    else userMap[userLabel].oferta++;
  }

  const users = Object.keys(userMap);
  if (!users.length) {
    ctx.fillStyle = "#777";
    ctx.textAlign = "center";
    ctx.fillText("Sin datos para mostrar", cssW / 2, cssH / 2);
    return;
  }

  const values = users.map((u) => [userMap[u].oferta, userMap[u].peticion]);

  const padX = 20,
    padTop = 12,
    padBottom = 24;
  const maxVal = Math.max(1, ...values.flat());
  const scale = (cssH - padTop - padBottom) / maxVal;

  const gap = 14;
  const barW = Math.max(
    10,
    Math.min(34, (cssW - padX * 2 - gap * users.length) / (users.length * 2))
  );

  // eje
  ctx.strokeStyle = "#aaa";
  ctx.beginPath();
  ctx.moveTo(padX, cssH - padBottom + 0.5);
  ctx.lineTo(cssW - padX, cssH - padBottom + 0.5);
  ctx.stroke();

  users.forEach((user, i) => {
    const [oferta, peticion] = values[i];
    const x0 = padX + i * (2 * barW + gap);

    const h1 = oferta * scale;
    ctx.fillStyle = "#ffc107";
    ctx.fillRect(x0, cssH - padBottom - h1, barW, h1);

    const h2 = peticion * scale;
    ctx.fillStyle = "#0d6efd";
    ctx.fillRect(x0 + barW, cssH - padBottom - h2, barW, h2);

    ctx.fillStyle = "#111";
    ctx.textAlign = "center";
    ctx.fillText(String(oferta), x0 + barW / 2, cssH - padBottom - h1 - 10);
    ctx.fillText(
      String(peticion),
      x0 + barW + barW / 2,
      cssH - padBottom - h2 - 10
    );

    ctx.fillStyle = "#555";
    ctx.fillText(shortLabel(user, 10), x0 + barW, cssH - padBottom + 12);
  });
}

// ---------------- Boot ----------------
document.addEventListener("DOMContentLoaded", async () => {
  // Nota: cambia disabled -> readonly en el HTML para que se vea siempre el email
  try {
    state.me = await getMe();
  } catch (err) {
    console.error(err);
    state.me = null;
  }

  if (!state.me) {
    window.location.href = "./login.html";
    return;
  }

  setNavbarUser(state.me.nombre);

  const emailInput = $("#email");
  if (emailInput && state.me.email) {
    emailInput.value = state.me.email;
  }

  const fch = $("#fecha");
  if (fch && !fch.value) fch.value = todayISO();

  try {
    await loadFromAPI();
    drawList();
  } catch (err) {
    console.error(err);
    showMsg(err.message || "No se pudieron cargar voluntariados.", "danger");
  }

  $("#formVol")?.addEventListener("submit", handleSubmit);
  $("#list")?.addEventListener("click", handleListClick);
  window.addEventListener("resize", drawCanvasChart);
});
