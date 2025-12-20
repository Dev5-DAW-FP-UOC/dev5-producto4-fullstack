// Minimal, self-contained drag & drop integration for int_dashboard
export function addDragAndDropListeners({ $, STATE, apiCrearSeleccionado, apiBorrarSeleccionado, draw, renderSeleccionados }) {
  const dropZone = $("#drop-zone");
  const grid = $("#grid");

  // catch dragstart globally so dynamically-rendered cards are handled
document.addEventListener('dragstart', (e) => {
  // only if drag originates inside our grid or drop zone
  if (e.target.closest('#grid') || e.target.closest('#drop-zone')) {
    handleDragStart(e);
  }
});

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
// Try to remove from server if we have a mapping, else just remove locally
const seleccionId = STATE._selMap && (STATE._selMap.get(idVol) ?? STATE._selMap.get(String(idVol)));

if (seleccionId) {
  try {
    // apiBorrarSeleccionado expects a voluntariado id (server route deletes by voluntariado id)
    await apiBorrarSeleccionado(idVol);
  } catch (err) {
    console.error("[dragdrop] error eliminando seleccionado en servidor", err);
  }
  // remove mapping for both numeric and string keys
  STATE._selMap.delete(idVol);
  STATE._selMap.delete(String(idVol));
}

// Always remove from persisted/local storage if available
try {
  const mod = await import('./almacenaje.js');
  if (mod && typeof mod.borrarSeleccionados === 'function') {
    try { mod.borrarSeleccionados(idVol); } catch (e) {}
  }
} catch (e) {}

// Update in-memory selection list and UI
STATE.seleccionados = STATE.seleccionados.filter((x) => Number(x) !== idVol);
draw();
renderSeleccionados();
  });

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
    if (e.dataTransfer.types.includes("application/source")) {
      dropZone.classList.add("drag-over");
      e.dataTransfer.dropEffect = "move";
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  }

  function handleDragOverToGrid(e) {
    e.preventDefault();
    if (e.dataTransfer.types.includes("application/source")) {
      grid.classList.add("drag-over-grid");
      e.dataTransfer.dropEffect = "move";
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  }

  function handleDragLeave() {
    dropZone?.classList.remove("drag-over");
  }

  function handleDragLeaveToGrid() {
    grid?.classList.remove("drag-over-grid");
  }

async function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  dropZone?.classList.remove("drag-over");

  const raw = e.dataTransfer.getData("text/plain");
  const idVolNum = Number(raw);
  const source = e.dataTransfer.getData("application/source");
  if (!raw || Number.isNaN(idVolNum) || source !== "grid") return;

  const voluntariado = STATE.voluntariados.find((v) => Number(v.id) === idVolNum);
  const idToStore = voluntariado ? voluntariado.id : raw;

  if (!STATE.seleccionados.map(Number).includes(idVolNum)) {
    STATE.seleccionados.push(idToStore);

    // persist locally so page changes keep selection
    try {
      const mod = await import('./almacenaje.js');
      if (mod && typeof mod.guardarSeleccionados === 'function') {
        try { mod.guardarSeleccionados(idToStore); } catch (e) {}
      }
    } catch (e) {}

    try {
      const created = await apiCrearSeleccionado(STATE.me?.id, idToStore);
      if (created && created.id) {
        STATE._selMap.set(Number(idToStore), created.id);
        STATE._selMap.set(String(idToStore), created.id);
      }
    } catch (err) {
      console.error("[dragdrop] error creando seleccionado (API)", err);
    }

    try { e.dataTransfer.clearData(); } catch (err) { /* ignore */ }

    setTimeout(() => {
      draw();
      renderSeleccionados();
    }, 0);
  }
}


  async function handleDropToGrid(e) {
  e.preventDefault();
  grid?.classList.remove("drag-over-grid");

  const raw = e.dataTransfer.getData("text/plain");
  const idVolNum = Number(raw);
  const source = e.dataTransfer.getData("application/source");
  if (!raw || Number.isNaN(idVolNum) || source !== "dropzone") return;

  if (STATE.seleccionados.map(Number).includes(idVolNum)) {
    try {
      const seleccionId = STATE._selMap.get(idVolNum) ?? STATE._selMap.get(String(idVolNum));
      if (seleccionId) {
        // ask API to remove selection by voluntariado id
        await apiBorrarSeleccionado(idVolNum);
        STATE._selMap.delete(idVolNum);
        STATE._selMap.delete(String(idVolNum));
      }
    } catch (err) {
      console.error("[dragdrop] error borrando seleccionado (API)", err);
    }

    STATE.seleccionados = STATE.seleccionados.map((s) => s).filter((x) => Number(x) !== idVolNum);
    draw();
    renderSeleccionados();
  }
}
}
