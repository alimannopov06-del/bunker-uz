/*
 BUNKER UZ - Telegram Mini App frontend.
 Demo mode ishlaydi. Real multiplayer uchun quyidagi Supabase sozlamalarini kiriting.
 Telegram Bot tokenini hech qachon bu faylga yozmang.
*/
const CONFIG = {
  SUPABASE_URL: "",       // Supabase Project URL
  SUPABASE_ANON_KEY: ""   // Supabase anon/public key (service_role emas!)
};
const tg = window.Telegram?.WebApp;
tg?.ready(); tg?.expand();

const $ = id => document.getElementById(id);
const state = {
  nickname: tg?.initDataUnsafe?.user?.first_name || "Mehmon",
  telegramId: tg?.initDataUnsafe?.user?.id || ("guest-" + Math.random().toString(36).slice(2,8)),
  survivorCount: 2, theme: "normal", cardMode: "open",
  room: null, players: [], myCards: [], round: 1, selectedVote: null,
  supabase: null, channel: null, tab: "friends"
};
const scenarios = [
  ["Global pandemiya","Noma’lum virus dunyo aholisining katta qismini zararladi."],
  ["Zombi apokalipsisi","Shaharlar xavfli hududga aylandi. Omon qolganlar bunker izlamoqda."],
  ["Yadro falokati","Radiatsiya sababli ochiq havoda yashash deyarli imkonsiz."],
  ["Sun’iy intellekt isyoni","Avtonom tizimlar insoniyatga qarshi bosh ko‘tardi."],
  ["Muzlik davri","Harorat keskin tushib, oziq-ovqat va energiya tanqisligi boshlandi."]
];
const deck = {
  "Kasb":["Shifokor","Muhandis","O‘qituvchi","Dehqon","Dasturchi","Harbiy","Oshpaz","Elektrik","Biolog","Quruvchi"],
  "Sog‘liq":["Sog‘lom","Astma","Qandli diabet","Yuqori immunitet","Oyoq jarohati","Allergiya"],
  "Biologiya":["25 yosh","32 yosh","41 yosh","Ayol, 28 yosh","Erkak, 35 yosh","50 yosh"],
  "Ko‘nikma":["Birinchi yordam","Ov qilish","Mexanik ta’mir","Bog‘dorchilik","Liderlik","Suvni tozalash"],
  "Yuk":["Dori qutisi","Asboblar to‘plami","Urug‘lar","Radioaloqa","Konserva","Bo‘sh ryukzak"],
  "Shaxsiy fakt":["Suzishni biladi","3 til biladi","Yolg‘izlikdan qo‘rqadi","Sobiq sportchi","Xotirasi kuchli","Tunda yaxshi ko‘radi"]
};
function random(arr){return arr[Math.floor(Math.random()*arr.length)]}
function toast(msg){const el=$("toast");el.textContent=msg;el.style.display="block";setTimeout(()=>el.style.display="none",2600)}
function showScreen(name){document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));$(name).classList.add("active");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.screen===name))}
function selected(group){return document.querySelector(`#${group} .chosen`)?.dataset.value}
function makeCards(){return Object.entries(deck).map(([type,items])=>({type,value:random(items),revealed:false}))}
function renderRoom(){
  $("roomPanel").classList.remove("hidden");$("roomCode").textContent=state.room.code;
  $("roomInfo").textContent=`O‘yinchilar: ${state.players.length} / 16`;
  $("playersList").innerHTML=state.players.map(p=>`<div class="player"><span>${escapeHtml(p.name)} ${p.id===state.telegramId?"(Siz)":""}</span><span>${p.alive===false?"Chiqarilgan":"Tirik"}</span></div>`).join("");
  $("startBtn").disabled=state.players.length<3;
  $("startBtn").style.opacity=state.players.length<3?".45":"1";
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function createRoom(){
  const code=Math.random().toString(36).slice(2,8).toUpperCase();
  state.room={code,host:state.telegramId,status:"waiting"};
  state.players=[{id:state.telegramId,name:state.nickname,alive:true}];
  renderRoom();toast("Xona yaratildi. Do‘stlaringizga kodni yuboring.");
  // Demo room is local until Supabase is configured.
}
function joinRoom(code){
  if(!/^[A-Z0-9]{6}$/.test(code)){toast("6 belgili xona kodini kiriting.");return}
  if(state.room?.code===code){toast("Siz allaqachon shu xonadasiz.");return}
  toast("Demo rejimda faqat shu qurilmada yaratilgan xona mavjud. Supabase ulangach, do‘stlar qo‘shila oladi.");
}
function startGame(){
  if(state.players.length<3){toast("O‘yinni boshlash uchun kamida 3 o‘yinchi kerak.");return}
  state.room.status="playing";state.round=1;state.myCards=makeCards();
  const scenario=random(scenarios);$("apocalypseTitle").textContent=scenario[0];$("apocalypseDesc").textContent=scenario[1];
  renderGame();showScreen("game");toast("O‘yin boshlandi!");
}
function renderGame(){
  $("roundLabel").textContent=state.round+"-raund";
  $("aliveCount").textContent=state.players.filter(p=>p.alive!==false).length+" nafar tirik";
  $("gamePlayers").innerHTML=state.players.map(p=>`<div class="player ${p.alive===false?"dead":""}"><span>${escapeHtml(p.name)}</span><span>${p.alive===false?"Chiqarilgan":"O‘yinda"}</span></div>`).join("");
  $("myCards").innerHTML=state.myCards.map((c,i)=>`<button class="card ${c.revealed?"revealed":""}" data-card="${i}"><b>${c.type}</b><span>${c.revealed?escapeHtml(c.value):"Maxfiy karta — ochish uchun bosing"}</span></button>`).join("");
  document.querySelectorAll("[data-card]").forEach(btn=>btn.onclick=()=>revealCard(Number(btn.dataset.card)));
  $("voteTargets").innerHTML=state.players.filter(p=>p.alive!==false&&p.id!==state.telegramId).map(p=>`<button class="player ${state.selectedVote===p.id?"revealed":""}" data-vote="${p.id}">${escapeHtml(p.name)} <span>Tanlash</span></button>`).join("");
  document.querySelectorAll("[data-vote]").forEach(btn=>btn.onclick=()=>{state.selectedVote=btn.dataset.vote;renderGame()});
}
function revealCard(i){if(!state.myCards[i]||state.myCards[i].revealed)return;state.myCards[i].revealed=true;renderGame();toast("Karta ochildi. Demo rejimda faqat sizda ko‘rinadi.")}
function vote(){if(!state.selectedVote){toast("Avval o‘yinchini tanlang.");return}toast("Ovoz demo rejimida qayd etildi. Haqiqiy umumiy ovoz berish uchun server ulanishi kerak.");}
function wire(){
  document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>showScreen(b.dataset.screen));
  $("profileBtn").onclick=()=>showScreen("profile");$("homeBtn").onclick=()=>showScreen("home");
  $("backBtn").onclick=()=>showScreen("home");
  document.querySelectorAll(".choices").forEach(g=>g.querySelectorAll("button").forEach(b=>b.onclick=()=>{g.querySelectorAll("button").forEach(x=>x.classList.remove("chosen"));b.classList.add("chosen")}));
  $("createBtn").onclick=()=>{state.nickname=$("nickname").value.trim()||state.nickname;state.survivorCount=Number(selected("survivorChoices"));state.theme=selected("themeChoices");state.cardMode=selected("cardChoices");createRoom()};
  $("joinBtn").onclick=()=>$("joinModal").classList.remove("hidden");
  $("cancelJoinBtn").onclick=()=>$("joinModal").classList.add("hidden");
  $("confirmJoinBtn").onclick=()=>{joinRoom($("joinCode").value.trim().toUpperCase());$("joinModal").classList.add("hidden")};
  $("copyCodeBtn").onclick=async()=>{try{await navigator.clipboard.writeText(state.room.code);toast("Kod nusxalandi")}catch{toast("Kod: "+state.room.code)}};
  $("startBtn").onclick=startGame;$("voteBtn").onclick=vote;
  $("leaveBtn").onclick=()=>{$("roomPanel").classList.add("hidden");state.room=null;state.players=[];toast("Xonadan chiqdingiz")};
  $("profileName").textContent=state.nickname;$("nickname").value=state.nickname;
}
wire();
if(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase){
  state.supabase=window.supabase.createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_ANON_KEY);
  toast("Supabase kutubxonasi tayyor. Backend SQL va autentifikatsiya ulanishi hali sozlanishi kerak.");
}
