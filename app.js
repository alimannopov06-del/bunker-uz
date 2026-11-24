/*
 * BUNKER UZ — Telegram Mini App frontend
 * Real multiplayer via Supabase Edge Function: bunker-game
 * Never put TELEGRAM_BOT_TOKEN or SUPABASE_SERVICE_ROLE_KEY in this file.
 */
const CONFIG = {
  SUPABASE_URL: "https://hqnyebrkkkahmfdmzlfj.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_aJ2nmIByvF4jsMXP2TsDMg_a_XXZ9ny"
};

const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

const $ = id => document.getElementById(id);
const state = {
  nickname: tg?.initDataUnsafe?.user?.first_name || "Mehmon",
  telegramId: tg?.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : null,
  survivorCount: 2,
  theme: "normal",
  cardMode: "open",
  room: null,
  players: [],
  myCards: [],
  revealedCards: [],
  round: 1,
  selectedVote: null,
  isHost: false,
  tab: "friends",
  polling: null
};

const scenarios = [
  ["Global pandemiya", "Noma’lum virus dunyo aholisining katta qismini zararladi."],
  ["Zombi apokalipsisi", "Shaharlar xavfli hududga aylandi. Omon qolganlar bunker izlamoqda."],
  ["Yadro falokati", "Radiatsiya sababli ochiq havoda yashash deyarli imkonsiz."],
  ["Sun’iy intellekt isyoni", "Avtonom tizimlar insoniyatga qarshi bosh ko‘tardi."],
  ["Muzlik davri", "Harorat keskin tushib, oziq-ovqat va energiya tanqisligi boshlandi."]
];

function toast(message) {
  const el = $("toast");
  if (!el) return;
  el.textContent = message;
  el.style.display = "block";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.style.display = "none"; }, 3000);
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(el => el.classList.remove("active"));
  const screen = $(name);
  if (screen) screen.classList.add("active");
  document.querySelectorAll(".nav").forEach(el =>
    el.classList.toggle("active", el.dataset.screen === name)
  );
}

function selected(group) {
  return document.querySelector(`#${group} .chosen`)?.dataset.value;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function requireTelegram() {
  if (!tg?.initData) {
    throw new Error("Botni Telegram ichidagi O‘YINNI BOSHLASH tugmasi orqali oching.");
  }
}

async function api(action, payload = {}) {
  requireTelegram();

  const response = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/bunker-game`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": CONFIG.SUPABASE_ANON_KEY
    },
    body: JSON.stringify({
      action,
      initData: tg.initData,
      nickname: $("nickname")?.value?.trim() || state.nickname,
      ...payload
    })
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`Server javobi noto‘g‘ri (HTTP ${response.status}).`);
  }

  if (!response.ok || !result?.ok) {
    throw new Error(result?.error || `Server xatosi (HTTP ${response.status}).`);
  }
  return result.data;
}

function stopPolling() {
  if (state.polling) clearInterval(state.polling);
  state.polling = null;
}

function startPolling() {
  stopPolling();
  state.polling = setInterval(() => {
    if (state.room?.code) refreshState(true);
  }, 2500);
}

function renderRoom() {
  if (!state.room) return;
  $("roomPanel")?.classList.remove("hidden");
  $("roomCode").textContent = state.room.code;
  $("roomStatus").textContent =
    state.room.status === "playing" ? "O‘yin boshlandi" :
    state.room.status === "finished" ? "Tugadi" : "Kutmoqda";
  $("roomInfo").textContent = `O‘yinchilar: ${state.players.length} / 16`;
  $("playersList").innerHTML = state.players.map(player => `
    <div class="player">
      <span>${escapeHtml(player.name)} ${player.id === state.telegramId ? "(Siz)" : ""}</span>
      <span>${player.alive ? "Tirik" : "Chiqarilgan"}</span>
    </div>
  `).join("");

  const start = $("startBtn");
  start.disabled = !state.isHost || state.players.length < 3 || state.room.status !== "waiting";
  start.style.opacity = start.disabled ? ".45" : "1";
  start.textContent = state.isHost ? "O‘YINNI BOSHLASH" : "XONA EGASI BOSHLAYDI";
}

function renderGame() {
  if (!state.room) return;

  $("roundLabel").textContent = `${state.round}-raund`;
  $("aliveCount").textContent =
    `${state.players.filter(player => player.alive).length} nafar tirik`;

  $("gamePlayers").innerHTML = state.players.map(player => `
    <div class="player ${player.alive ? "" : "dead"}">
      <span>${escapeHtml(player.name)} ${player.id === state.telegramId ? "(Siz)" : ""}</span>
      <span>${player.alive ? "O‘yinda" : "Chiqarilgan"}</span>
    </div>
  `).join("");

  const ownCardsHtml = state.myCards.map(card => `
    <button class="card ${card.is_revealed ? "revealed" : ""}"
      data-card="${escapeHtml(card.id)}"
      ${card.is_revealed ? "disabled" : ""}>
      <b>${escapeHtml(card.card_type)}</b>
      <span>${card.is_revealed ? escapeHtml(card.card_value) : "Maxfiy karta — ochish uchun bosing"}</span>
    </button>
  `).join("");

  const publicCardsHtml = state.revealedCards.length ? `
    <div class="public-cards">
      <h4>OCHILGAN KARTALAR</h4>
      ${state.revealedCards.map(card => {
        const owner = state.players.find(p => p.id === card.telegram_id);
        return `<div class="player"><span>${escapeHtml(owner?.name || "O‘yinchi")} — ${escapeHtml(card.card_type)}</span><b>${escapeHtml(card.card_value)}</b></div>`;
      }).join("")}
    </div>
  ` : "";

  $("myCards").innerHTML = ownCardsHtml + publicCardsHtml;
  document.querySelectorAll("[data-card]").forEach(button => {
    button.onclick = () => revealCard(button.dataset.card);
  });

  $("voteTargets").innerHTML = state.players
    .filter(player => player.alive && player.id !== state.telegramId)
    .map(player => `
      <button class="player ${state.selectedVote === player.id ? "revealed" : ""}"
        data-vote="${escapeHtml(player.id)}">
        ${escapeHtml(player.name)} <span>Tanlash</span>
      </button>
    `).join("");

  document.querySelectorAll("[data-vote]").forEach(button => {
    button.onclick = () => {
      state.selectedVote = button.dataset.vote;
      renderGame();
    };
  });

  if (state.room.status === "finished") {
    $("voteHint").textContent = "O‘yin yakunlandi.";
    $("voteBtn").disabled = true;
  } else {
    $("voteHint").textContent = "Muhokamadan so‘ng chiqariladigan o‘yinchini tanlang.";
    $("voteBtn").disabled = false;
  }
}

async function refreshState(silent = false) {
  if (!state.room?.code) return;
  try {
    const data = await api("state", { code: state.room.code });
    const previousStatus = state.room.status;

    state.room.status = data.status;
    state.room.settings = data.settings;
    state.isHost = Boolean(data.is_host);
    state.round = Number(data.round || 1);
    state.players = (data.players || []).map(player => ({
      id: String(player.telegram_id),
      name: player.display_name,
      alive: player.is_alive !== false
    }));
    state.myCards = data.my_cards || [];
    state.revealedCards = data.revealed_cards || [];

    renderRoom();

    if (data.status === "playing" || data.status === "finished") {
      if (data.apocalypse) {
        $("apocalypseTitle").textContent = data.apocalypse.title || "Apokalipsis";
        $("apocalypseDesc").textContent = data.apocalypse.description || "";
      }
      renderGame();
      if (previousStatus === "waiting" && data.status === "playing") {
        toast("O‘yin boshlandi!");
        showScreen("game");
      }
      if (data.status === "finished" && previousStatus !== "finished") {
        toast("O‘yin yakunlandi!");
        showScreen("game");
        stopPolling();
      }
    }
  } catch (error) {
    if (!silent) toast(error.message);
  }
}

async function createRoom() {
  try {
    state.nickname = $("nickname").value.trim() || state.nickname;
    state.survivorCount = Number(selected("survivorChoices") || 2);
    state.theme = selected("themeChoices") || "normal";
    state.cardMode = selected("cardChoices") || "open";

    const data = await api("create_room", {
      survivors: state.survivorCount,
      theme: state.theme,
      card_mode: state.cardMode
    });

    state.room = { code: data.room_code, status: data.status };
    state.isHost = true;
    $("roomPanel").classList.remove("hidden");
    await refreshState();
    renderRoom();
    startPolling();
    toast("Xona yaratildi. Kodni do‘stlaringizga yuboring.");
  } catch (error) {
    toast(error.message);
  }
}

async function joinRoom(code) {
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    toast("6 belgili xona kodini kiriting.");
    return;
  }
  try {
    const data = await api("join_room", { code });
    state.room = { code: data.room_code, status: data.status };
    state.isHost = false;
    $("roomPanel").classList.remove("hidden");
    await refreshState();
    renderRoom();
    startPolling();
    toast("Xonaga muvaffaqiyatli qo‘shildingiz.");
  } catch (error) {
    toast(error.message);
  }
}

async function startGame() {
  if (!state.room?.code) return;
  try {
    await api("start_game", { code: state.room.code });
    await refreshState();
    showScreen("game");
    toast("O‘yin boshlandi!");
  } catch (error) {
    toast(error.message);
  }
}

async function revealCard(cardId) {
  try {
    await api("reveal_card", { code: state.room.code, card_id: cardId });
    await refreshState();
    toast("Karta ochildi.");
  } catch (error) {
    toast(error.message);
  }
}

async function vote() {
  if (!state.selectedVote) {
    toast("Avval o‘yinchini tanlang.");
    return;
  }
  try {
    const result = await api("vote", {
      code: state.room.code,
      target_telegram_id: state.selectedVote
    });
    state.selectedVote = null;
    await refreshState();
    toast(result.message || "Ovoz qabul qilindi.");
  } catch (error) {
    toast(error.message);
  }
}

async function leaveRoom() {
  if (!state.room?.code) return;
  try {
    await api("leave_room", { code: state.room.code });
    stopPolling();
    state.room = null;
    state.players = [];
    state.myCards = [];
    state.revealedCards = [];
    state.isHost = false;
    $("roomPanel").classList.add("hidden");
    showScreen("home");
    toast("Xonadan chiqdingiz.");
  } catch (error) {
    toast(error.message);
  }
}

function wire() {
  document.querySelectorAll(".nav").forEach(button => {
    button.onclick = () => showScreen(button.dataset.screen);
  });

  $("profileBtn").onclick = () => showScreen("profile");
  $("homeBtn").onclick = () => showScreen("home");
  $("backBtn").onclick = () => showScreen("home");

  document.querySelectorAll(".choices").forEach(group => {
    group.querySelectorAll("button").forEach(button => {
      button.onclick = () => {
        group.querySelectorAll("button").forEach(item => item.classList.remove("chosen"));
        button.classList.add("chosen");
      };
    });
  });

  $("createBtn").onclick = createRoom;
  $("joinBtn").onclick = () => $("joinModal").classList.remove("hidden");
  $("cancelJoinBtn").onclick = () => $("joinModal").classList.add("hidden");
  $("confirmJoinBtn").onclick = async () => {
    const code = $("joinCode").value.trim().toUpperCase();
    $("joinModal").classList.add("hidden");
    await joinRoom(code);
  };

  $("copyCodeBtn").onclick = async () => {
    if (!state.room?.code) return;
    try {
      await navigator.clipboard.writeText(state.room.code);
      toast("Xona kodi nusxalandi.");
    } catch {
      toast(`Xona kodi: ${state.room.code}`);
    }
  };

  $("startBtn").onclick = startGame;
  $("voteBtn").onclick = vote;
  $("leaveBtn").onclick = leaveRoom;

  $("profileName").textContent = state.nickname;
  $("nickname").value = state.nickname;
}

wire();
