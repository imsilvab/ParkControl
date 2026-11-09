const TOTAL_SPOTS = 12;
const STORAGE_KEY = "parkcontrol_reservations";
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function getReservations() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveReservations(items) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
function occupiedSpots() { return getReservations().map(item => Number(item.spot)); }
function freeSpots() {
  const occupied = occupiedSpots();
  return Array.from({length: TOTAL_SPOTS}, (_, i) => i + 1).filter(n => !occupied.includes(n));
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 3000);
}
function goTo(page) {
  $$(".page").forEach(section => section.classList.toggle("active", section.id === `page-${page}`));
  $$(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.page === page));
  const titles = {dashboard:"Visão geral", cadastro:"Nova reserva", cadastradas:"Reservas cadastradas", disponiveis:"Vagas disponíveis"};
  $("#page-title").textContent = titles[page] || "ParkControl";
  if (page === "cadastro") updateSpotSelect();
  renderAll();
  window.scrollTo({top:0, behavior:"smooth"});
}
function makeSpotTile(number, isBusy) {
  const tile = document.createElement("div");
  tile.className = `spot-tile${isBusy ? " busy" : ""}`;
  tile.innerHTML = `<strong>${String(number).padStart(2,"0")}</strong><small>${isBusy ? "Ocupada" : "Disponível"}</small>`;
  return tile;
}
function renderOccupancy() {
  const occupied = occupiedSpots();
  const dashboard = $("#occupancy-grid");
  const parking = $("#parking-grid");
  dashboard.innerHTML = "";
  parking.innerHTML = "";
  for (let number = 1; number <= TOTAL_SPOTS; number++) {
    const busy = occupied.includes(number);
    dashboard.appendChild(makeSpotTile(number, busy));
    parking.appendChild(makeSpotTile(number, busy));
  }
}
function updateSpotSelect() {
  const select = $("#spot");
  const previous = select.value;
  select.innerHTML = '<option value="">Selecione uma vaga disponível</option>';
  freeSpots().forEach(number => {
    const option = document.createElement("option");
    option.value = number;
    option.textContent = `Vaga ${String(number).padStart(2,"0")}`;
    select.appendChild(option);
  });
  if (freeSpots().includes(Number(previous))) select.value = previous;
  if (freeSpots().length === 0) {
    select.innerHTML = '<option value="">Nenhuma vaga disponível</option>';
  }
}
function renderBookings() {
  const list = getReservations();
  const query = ($("#booking-search")?.value || "").trim().toLowerCase();
  const filtered = list.filter(item => [item.owner,item.plate,item.model].some(value => value.toLowerCase().includes(query)));
  const body = $("#bookings-body");
  body.innerHTML = "";
  filtered.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `<td><strong>${escapeHTML(item.owner)}</strong></td><td class="vehicle-cell"><strong>${escapeHTML(item.plate)}</strong><small>${escapeHTML(item.model)} • ${escapeHTML(item.color)}</small></td><td>${escapeHTML(item.apartment)} / ${escapeHTML(item.block)}</td><td><strong>Vaga ${String(item.spot).padStart(2,"0")}</strong></td><td><span class="status">● Ativa</span></td><td><button class="delete-btn" data-delete="${item.id}" aria-label="Excluir reserva">Excluir</button></td>`;
    body.appendChild(row);
  });
  $("#booking-count").textContent = `${filtered.length} ${filtered.length === 1 ? "registro encontrado" : "registros encontrados"}`;
  $("#bookings-empty").style.display = filtered.length ? "none" : "block";
  body.closest(".table-wrap").style.display = filtered.length ? "block" : "none";
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}
function renderDashboard() {
  const occupied = occupiedSpots().length;
  const free = TOTAL_SPOTS - occupied;
  const rate = Math.round((occupied / TOTAL_SPOTS) * 100);
  $("#stat-total").textContent = TOTAL_SPOTS;
  $("#stat-occupied").textContent = occupied;
  $("#stat-free").textContent = free;
  $("#occupancy-rate").textContent = `${rate}%`;
  $("#occupancy-bar").style.width = `${rate}%`;
  $("#summary-bookings").textContent = getReservations().length;
  $("#summary-free").textContent = `${free} ${free === 1 ? "vaga" : "vagas"}`;
  $("#available-number").textContent = free;
  $("#occupied-number").textContent = occupied;
}
function renderAll() {
  renderDashboard();
  renderOccupancy();
  renderBookings();
  updateSpotSelect();
}
$("#reservation-form").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const spot = Number($("#spot").value);
  if (!freeSpots().includes(spot)) {
    showToast("Essa vaga não está mais disponível. Escolha outra.");
    updateSpotSelect();
    return;
  }
  const reservation = {
    id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
    owner: $("#owner").value.trim(),
    apartment: $("#apartment").value.trim(),
    block: $("#block").value.trim(),
    plate: $("#plate").value.trim().toUpperCase(),
    model: $("#model").value.trim(),
    color: $("#color").value.trim(),
    spot
  };
  const items = getReservations();
  items.push(reservation);
  saveReservations(items);
  form.reset();
  renderAll();
  showToast("Reserva cadastrada com sucesso!");
  goTo("cadastradas");
});
$("#reservation-form").addEventListener("reset", () => setTimeout(updateSpotSelect, 0));
$("#plate").addEventListener("input", event => {
  event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
});
$("#booking-search").addEventListener("input", renderBookings);
$("#bookings-body").addEventListener("click", event => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  const updated = getReservations().filter(item => item.id !== button.dataset.delete);
  saveReservations(updated);
  renderAll();
  showToast("Reserva removida. A vaga está disponível novamente.");
});
$$(".nav-link").forEach(button => button.addEventListener("click", () => goTo(button.dataset.page)));
$$("[data-go]").forEach(button => button.addEventListener("click", () => goTo(button.dataset.go)));
$("#today").textContent = new Intl.DateTimeFormat("pt-BR", {weekday:"short", day:"2-digit", month:"short", year:"numeric"}).format(new Date());
renderAll();