/* ================================
   상태 변수
================================ */
let hunger = 100, clean = 100, fun = 100;
let coins = 0, outfit = "none";
let food = 10, soap = 10;
let soundOn = true;
let playerName = "";
let xp = 0, level = 1;
let affinity = 0;
let currentBackground = "night";

let saveInterval, statusInterval, coinInterval;
let speechTimeout;

let purchasedOutfits = new Set(JSON.parse(localStorage.getItem("purchasedOutfits") || "[]"));
let purchasedBackgrounds = new Set(JSON.parse(localStorage.getItem("purchasedBackgrounds") || "[]"));


/* 캐릭터/오버레이 이미지 */
const characterImages = {
  neutral: "https://i.postimg.cc/RC2Cmh5V/Character.jpg",
  happy:   "https://i.postimg.cc/RC2Cmh5V/Character.jpg",
  sad:     "https://i.postimg.cc/RC2Cmh5V/Character.jpg",
  grumpy:  "https://i.postimg.cc/RC2Cmh5V/Character.jpg",
  eat:     "https://i.imgur.com/BqWvZH2.gif",
  wash:    "https://i.imgur.com/mSoIzHJ.gif"
};

const outfitImages = {
  hat: "https://cdn-icons-png.flaticon.com/512/2589/2589175.png",
  bow: "https://cdn-icons-png.flaticon.com/512/9512/9512942.png",
  none: ""
};

/* 저장/불러오기 */
function saveGame() {
  const data = {
    hunger, clean, fun, coins, outfit, food, soap,
    playerName, soundOn, xp, level, affinity, currentBackground
  };
  localStorage.setItem("petGameState", JSON.stringify(data));
  localStorage.setItem("purchasedOutfits", JSON.stringify([...purchasedOutfits]));
  localStorage.setItem("purchasedBackgrounds", JSON.stringify([...purchasedBackgrounds]));
}

function loadGame() {
  const s = JSON.parse(localStorage.getItem("petGameState") || "{}");
  hunger = s.hunger ?? 100;
  clean = s.clean ?? 100;
  fun   = s.fun   ?? 100;
  coins = s.coins ?? 0;
  outfit= s.outfit?? "none";
  food  = s.food  ?? 10;
  soap  = s.soap  ?? 10;
  soundOn = s.soundOn ?? true;
  xp    = s.xp    ?? 0;
  level = s.level ?? 1;
  affinity = s.affinity ?? 0;
  playerName = s.playerName ?? "";
  currentBackground = s.currentBackground ?? "night";
}

/* UI 갱신 */
function updateBars() {
  const hb = document.getElementById("hunger-bar");
  const cb = document.getElementById("clean-bar");
  const fb = document.getElementById("fun-bar");
  if (hb) hb.style.width = Math.max(0, Math.min(100, hunger)) + "%";
  if (cb) cb.style.width = Math.max(0, Math.min(100, clean)) + "%";
  if (fb) fb.style.width = Math.max(0, Math.min(100, fun)) + "%";

  const coinsEl = document.getElementById("coins");
  if (coinsEl) coinsEl.innerText = Math.floor(coins);
  const foodBadge = document.getElementById("food-badge");
  const soapBadge = document.getElementById("soap-badge");
  if (foodBadge) foodBadge.innerText = food;
  if (soapBadge) soapBadge.innerText = soap;

  const levelBar = document.getElementById("level-bar");
  if (levelBar) {
    const pct = (xp % 100);
    levelBar.style.width = pct + "%";
    const labelEl = levelBar.parentElement;
    if (labelEl) {
      const label = (playerName ? `${playerName} ` : "") + `Lv. ${level}`;
      labelEl.setAttribute("data-level", label);
    }
  }

  const bar = document.getElementById("affinity-bar");
  const text = document.getElementById("affinity-text");
  if (bar) bar.style.width = affinity + "%";
  if (text) text.innerText = affinity < 30 ? "😠" : affinity < 70 ? "😐" : "😊";

  updateMood();
}

/* 말풍선/토스트 */
function speak(text) {
  const bubble = document.getElementById("speech");
  if (!bubble) return;
  bubble.innerText = text;
  bubble.classList.remove("hidden");
  clearTimeout(speechTimeout);
  speechTimeout = setTimeout(() => bubble.classList.add("hidden"), 1600);
}
function showToast(msg) {
  const t = document.getElementById("toast");
  t.innerText = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}

/* 캐릭터 표정/오버레이 */
function setCharacterVisual(kind) {
  const el = document.getElementById("character");
  if (el && el.tagName.toLowerCase() === "img") {
    const src = characterImages[kind] || characterImages.neutral;
    el.src = src;
  }
}
function applyOutfitOverlay() {
  const ov = document.getElementById("outfit-overlay");
  if (!ov) return;
  const src = outfitImages[outfit] || "";
  if (src) {
    ov.src = src;
    ov.style.display = "block";
  } else {
    ov.removeAttribute("src");
    ov.style.display = "none";
  }
}
function updateCharacter() {
  const avg = (hunger + clean + fun) / 3;
  let state = "neutral";
  if (affinity < 30) state = "grumpy";
  else if (affinity >= 70) state = "happy";
  else if (avg < 40) state = "sad";
  setCharacterVisual(state);
  applyOutfitOverlay();
}
function setEmotion(type) {
  setCharacterVisual(type);
  setTimeout(updateCharacter, 1600);
}

/* 기분 클래스(시각효과만) */
function updateMood() {
  const c = document.getElementById("character");
  if (!c) return;
  c.classList.remove("happy","normal","sad","grumpy");
  const avg = (hunger + clean + fun) / 3;
  if (affinity < 30) c.classList.add("grumpy");
  else if (affinity >= 70) c.classList.add("happy");
  else if (avg < 40) c.classList.add("sad");
  else c.classList.add("normal");
}

/* 행동 */
function feed() {
  if (food <= 0) return showToast("❌ 음식이 부족해요!");
  food--; hunger = Math.min(100, hunger + 20);
  coins++; xp += 10; updateAffinity(+0.5);
  const msgList = ["...이게 뭔데", "...고마워", "먹을만 해"];
  speak(msgList[Math.floor(Math.random()*msgList.length)]);
  playSound("eat-sound"); setEmotion("eat");
  updateBars(); saveGame();
}
function wash() {
  if (soap <= 0) return showToast("❌ 비누가 부족해요!");
  soap--; clean = Math.min(100, clean + 20);
  coins++; xp += 10; updateAffinity(+0.5);
  const msgList = ["내가 할수 있어...", "보지마..", "내가 더러워..?"];
  speak(msgList[Math.floor(Math.random()*msgList.length)]);
  playSound("click-sound"); setEmotion("wash");
  updateBars(); saveGame();
}

/* 캐릭터 클릭 대화 */
document.getElementById("character")?.addEventListener("click", () => {
  const cuteTalk = [`...${playerName}`, "응..?", "뭐해..?"];
  const neutralTalk = ["...?", "하지마...", "너 이름이 뭐라고,,?"];
  const grumpyTalk = ["...죽인다", "손대지 마.", "너 누군데"];
  const messages = affinity < 30 ? grumpyTalk : affinity >= 70 ? cuteTalk : neutralTalk;

  speak(messages[Math.floor(Math.random()*messages.length)]);
  fun = Math.min(100, fun + 5); coins++; xp += 5;
  updateAffinity(+0.1); playSound("click-sound");
  updateBars(); saveGame();
});

/* 호감도 */
function updateAffinity(delta=0) {
  affinity = Math.max(0, Math.min(100, affinity + delta));
  updateBars(); updateCharacter(); saveGame();
}

/* 레벨업(보상: 옷 제거됨) */
function checkLevelUp() {
  let leveled = false;
  while (xp >= 100) { xp -= 100; level++; leveled = true; }
  if (leveled) { showToast(`✨ Lv.${level} 달성!`); saveGame(); updateBars(); }
}

/* 상점 */
function openShop(){ document.getElementById("shop-modal").style.display="flex"; updateShopUI(); }
function closeShop(){ document.getElementById("shop-modal").style.display="none"; }
function showTab(tab){
  const ids = ["outfit","item","bg"];
  ids.forEach(id=>{
    document.getElementById(`${id}-shop`).style.display = (id===tab)?"block":"none";
    document.getElementById(`tab-${id}`).classList.toggle("active", id===tab);
  });
}
function buyOutfit(item, price) {
  if (purchasedOutfits.has(item)) return showToast("이미 구매한 옷이에요! 👕");
  if (coins < price) return showToast("💸 코인이 부족해요!");
  coins -= price; outfit = item; purchasedOutfits.add(item);
  saveGame(); updateBars(); updateCharacter(); updateShopUI();
  speak("이게 옷이야..?"); showToast("👕 새 옷 구매 완료!");
}
function wearOutfit(item) { outfit = item; saveGame(); updateCharacter(); showToast(item==="none"?"옷을 벗었어요!":"착용 완료!"); }
function buyItem(type, price) {
  if (coins < price) return showToast("💸 코인이 부족해요!");
  coins -= price;
  if (type==="food") food++;
  if (type==="soap") soap++;
  saveGame(); updateBars(); showToast("🛒 아이템 구매 완료!");
}


function updateShopUI() {
  // 옷 부분 기존 코드 유지
  ["hat", "bow"].forEach(item => {
    const el = document.getElementById(`${item}-item`);
    if (!el) return;
    if (purchasedOutfits.has(item)) {
      el.classList.add("bought");
      if (!el.textContent.includes("(구매 완료)")) el.textContent += " (구매 완료)";
    } else {
      el.classList.remove("bought");
      el.textContent = (item === "hat" ? "🧢 모자 - 10코인" : "🎀 리본 - 15코인");
    }
  });
  


/* 내부 배경(상점 전용) */
function applyBackgroundTheme(theme) {
  const c = document.querySelector(".game-container");

  // ① 인라인 background 먼저 제거 (이게 핵심!)
  c.style.background = "";

  // ② 기존 테마 클래스 제거
  c.classList.remove("bg-morning","bg-day","bg-evening","bg-night");

  // ③ 새 테마 클래스 적용
  switch (theme) {
    case "morning": c.classList.add("bg-morning"); break;
    case "day":     c.classList.add("bg-day");     break;
    case "evening": c.classList.add("bg-evening"); break;
    case "night":   c.classList.add("bg-night");   break;
    default:        c.classList.add("bg-day");     // 기본값은 day로
  }
}

  ["morning", "day", "evening", "night"].forEach(bg => {
    const el = document.querySelector(`#bg-shop .item[onclick*="${bg}"]`);
    if (!el) return;
    if (purchasedBackgrounds.has(bg)) {
      el.classList.add("bought");
      if (!el.textContent.includes("(구매 완료)")) el.textContent += " (구매 완료)";
    } else {
      el.classList.remove("bought");
      const name = themeName(bg);
      el.textContent = `🌄 ${name} 배경 - 30코인`;
    }
  });
}


function themeName(theme){
  switch(theme){ case "morning": return "아침"; case "day": return "낮"; case "evening": return "저녁"; case "night": return "밤"; default: return "기본"; }
}


function buyBackground(theme, price = 30) {
  // 이미 구매한 배경이면 바로 적용
  if (purchasedBackgrounds.has(theme)) {
    currentBackground = theme;
    applyBackgroundTheme(theme);
    showToast(`🎨 ${themeName(theme)} 배경으로 변경했어요!`);
    saveGame();
    updateShopUI();
    return;
  }

  // 코인 부족 체크
  if (coins < price) {
    showToast("💸 코인이 부족해요!");
    return;
  }

  // 구매 및 적용
  coins -= price;
  purchasedBackgrounds.add(theme);
  currentBackground = theme;
  applyBackgroundTheme(theme);
  saveGame();
  updateBars();
  updateShopUI();
  showToast(`🎨 ${themeName(theme)} 배경 적용됨!`);
}

/* 설정/사운드/리셋 */
function openSettings(){ document.getElementById("settings-modal").style.display="flex"; }
function closeSettings(){ document.getElementById("settings-modal").style.display="none"; }
function toggleSound(){
  soundOn = !soundOn;
  document.getElementById("sound-status").innerText = soundOn?"켜짐":"꺼짐";
  const bgm = document.getElementById("bgm");
  if (bgm){ if (soundOn) bgm.play().catch(()=>{}); else bgm.pause(); }
  saveGame();
}
function resetData(){ document.getElementById("confirm-modal").style.display="flex"; }

function confirmReset() {
  clearInterval(saveInterval);
  clearInterval(statusInterval);
  clearInterval(coinInterval);

  // 💾 저장 데이터 삭제
  localStorage.removeItem("petGameState");
  localStorage.removeItem("purchasedOutfits");
  localStorage.removeItem("purchasedBackgrounds"); // ✅ 배경 데이터도 삭제

  // 💬 모든 변수 초기화
  hunger = 100;
  clean = 100;
  fun = 100;
  coins = 0;
  outfit = "none";
  food = 10;
  soap = 10;
  soundOn = true;
  playerName = "";
  xp = 0;
  level = 1;
  affinity = 0;
  currentBackground = "night";

  // ✅ 세트도 초기화 (중요)
  purchasedOutfits.clear();
  purchasedBackgrounds.clear();

  applyBackgroundTheme(currentBackground);
  updateBars();
  updateCharacter();
  showToast("🔄 데이터가 초기화되었습니다!");

  document.getElementById("confirm-modal").style.display = "none";
  document.getElementById("settings-modal").style.display = "none";

  setTimeout(() => {
    document.getElementById("name-modal").style.display = "flex";
  }, 400);

  // 루프 재시작
  statusInterval = setInterval(decreaseStatus, 1500);
  coinInterval = setInterval(() => {
    coins++;
    updateBars();
    saveGame();
  }, 30000);
  saveInterval = setInterval(saveGame, 3000);
}


function cancelReset(){ document.getElementById("confirm-modal").style.display="none"; }

/* 이름(인사 없음) */
function askName(){ if (!playerName || playerName.trim()==="") document.getElementById("name-modal").style.display="flex"; }
function saveName(){
  const input = document.getElementById("player-name-input");
  const val = (input?.value || "").trim();
  if (!val) return showToast("이름을 입력해주세요!");
  playerName = val; saveGame(); document.getElementById("name-modal").style.display="none"; updateBars();
}

/* 사운드 */
function playSound(id){
  if (!soundOn) return;
  const s = document.getElementById(id);
  if (s){ s.currentTime = 0; s.play().catch(()=>{}); }
}

/* 상태 감소 & 코인 자동 증가 */
function decreaseStatus(){
  hunger = Math.max(0, hunger - 1);
  clean  = Math.max(0, clean  - 0.5);
  fun    = Math.max(0, fun    - 0.7);
  updateBars(); saveGame();
}

/* 룰렛 */
function openRoulette(){ document.getElementById("roulette-modal").style.display="flex"; }
function closeRoulette(){ document.getElementById("roulette-modal").style.display="none"; }
function playRoulette(){
  if (coins < 50) return showToast("💸 코인이 부족해요!");
  coins -= 50; updateBars();
  const wheel = document.getElementById("roulette-wheel");
  const spin = 360 * 5 + Math.floor(Math.random() * 360);
  wheel.style.transition = "transform 3s ease-out";
  wheel.style.transform = `rotate(${spin}deg)`;
  playSound("click-sound");
  setTimeout(()=>{
    const deg = spin % 360;
    let result;
    // 0~60: lose, 60~240: neutral, 240~360: double (가시적 단순화)
    if (deg>=0 && deg<60) result="lose";
    else if (deg>=60 && deg<240) result="neutral";
    else result="double";
    if (result==="double"){ coins += 100; speak("🎉 2배 당첨!"); showToast("💰 코인 +100!"); }
    else if (result==="neutral"){ coins += 50; speak("😅 원금 유지!"); showToast("🪙 원금 유지!"); }
    else { speak("😭 꽝... 50코인 잃었어요"); showToast("❌ 손실!"); }
    updateBars(); saveGame();
  }, 3100);
}

/* 실행 */
loadGame();
applyBackgroundTheme(currentBackground);
updateBars(); updateCharacter();

statusInterval = setInterval(decreaseStatus, 1500);
coinInterval   = setInterval(()=>{ coins++; updateBars(); saveGame(); }, 30000);
saveInterval   = setInterval(saveGame, 3000);
setInterval(checkLevelUp, 1000);

document.getElementById("sound-status").innerText = soundOn ? "켜짐" : "꺼짐";
const bgm = document.getElementById("bgm"); if (bgm && soundOn) bgm.play().catch(()=>{});
setTimeout(askName, 0);

function applyBackgroundTheme(theme) {
  const c = document.querySelector(".game-container");

  // 모든 배경 클래스 제거
  c.classList.remove("bg-morning", "bg-day", "bg-evening", "bg-night", "dark-theme");

  // 이미지 덮어쓰기 방지
  c.style.background = ""; 

  // 각 테마 적용
  switch (theme) {
    case "morning":
      c.classList.add("bg-morning");
      break;
    case "day":
      c.classList.add("bg-day");
      break;
    case "evening":
      c.classList.add("bg-evening");
      break;
    case "night":
      c.classList.add("bg-night");
      c.style.background = "#000";
      c.style.color = "#fff";
  }
}