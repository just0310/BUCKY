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

// ✅ 추가: 감정(GIF) 재생 상태
let isEmoting = false;
let emotionTimer = null;

let purchasedOutfits = new Set(JSON.parse(localStorage.getItem("purchasedOutfits") || "[]"));
let purchasedBackgrounds = new Set(JSON.parse(localStorage.getItem("purchasedBackgrounds") || "[]"));

/* 캐릭터/오버레이 이미지 */
const characterImages = {
  happy:  "https://i.imgur.com/kMpbG7v.jpeg",
  sad:  "https://i.imgur.com/RLf1duM.jpeg",
  grumpy:  "https://i.imgur.com/6A4R3Q0.jpeg",
  eat:  "https://i.imgur.com/BqWvZH2.gif",
  wash:  "https://i.imgur.com/mSoIzHJ.gif",
  brush:  "https://i.imgur.com/uma3T80.gif"
};

const outfitImages = {
  hat: "https://cdn-icons-png.flaticon.com/512/2589/2589175.png",
  bow: "https://cdn-icons-png.flaticon.com/512/9512/9512942.png",
  none: ""
};

/* ✅ 공통: 이미지 교체(모바일/Safari GIF 재생 보장) */
function setCharacterVisual(kind, force = false) {
  const el = document.getElementById("character");
  if (!el) return;

  const src = characterImages[kind];
  if (!src) return;

  const isGif = src.toLowerCase().includes(".gif");
  const current = (el.src || "").split("?")[0];

  // 같은 정지 이미지면 스킵 (불필요한 리렌더 방지)
  if (!force && !isGif && current === src) return;

  if (isGif) {
    // GIF는 캐시 무력화로 매번 새로 재생
    el.src = "";
    void el.offsetWidth; // reflow
    el.src = src + "?t=" + Date.now();
  } else {
    el.src = src;
  }
}

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

/* ✅ 호감도 상태 이미지 반영 (감정 재생 중이면 건너뜀) */
function updateCharacter(force = false) {
  const el = document.getElementById("character");
  if (!el) return;

  // 감정 GIF 재생 중에는 상태 이미지로 덮어쓰지 않음
  if (isEmoting && !force) return;

  let mood = "neutral";
  if (affinity < 30) mood = "grumpy";
  else if (affinity >= 70) mood = "happy";

  setCharacterVisual(mood, true);
  applyOutfitOverlay();
}

/* ✅ 감정(GIF) 재생 → 1.8초 뒤 상태 이미지로 복귀 */
function setEmotion(type) {
  const el = document.getElementById("character");
  if (!el) return;

  // 기존 타이머 정리
  if (emotionTimer) {
    clearTimeout(emotionTimer);
    emotionTimer = null;
  }

  isEmoting = true;
  setCharacterVisual(type, true); // GIF 즉시 재생

  // 1.8초 후 감정 종료 → 상태 이미지 표시
  emotionTimer = setTimeout(() => {
    isEmoting = false;
    updateCharacter(true); // 기존 유지
    applyOutfitOverlay();
  }, 1800);
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
  playSound("eat-sound");
  setEmotion("eat"); // ← GIF 재생
  updateBars(); saveGame();
}
function wash() {
  if (soap <= 0) return showToast("❌ 비누가 부족해요!");
  soap--; clean = Math.min(100, clean + 20);
  coins++; xp += 10; updateAffinity(+0.5);
  const msgList = ["내가 할수 있어...", "보지마..", "내가 더러워..?"];
  speak(msgList[Math.floor(Math.random()*msgList.length)]);
  playSound("click-sound");
  setEmotion("wash"); // ← GIF 재생
  updateBars(); saveGame();
}

let lastBrushTime = 0; // ⏰ 마지막 빗질 시각 저장용 (전역 변수)

function brush() {
  const now = Date.now();
  const cooldown = 60 * 1000; // 1분(60초)
  
  // 아직 1분이 안 지났으면 대기 메시지 출력
  if (now - lastBrushTime < cooldown) {
    const remain = Math.ceil((cooldown - (now - lastBrushTime)) / 1000);
    showToast(`⏳ 아직 ${remain}초 남았어요!`);
    speak("당분간 다가오지마..");
    return;
  }

  // ✅ 1분 지났으면 실행
  lastBrushTime = now;

  clean = Math.min(100, clean + 10);
  fun = Math.min(100, fun + 15);
  coins += 2; xp += 8;
  updateAffinity(+0.3);

  const msgList = [
    "너무 세게 하지 마...",
    "뭐하는거야..?",
    "이런 건 익숙하지 않은데..."
  ];
  speak(msgList[Math.floor(Math.random() * msgList.length)]);
  playSound("click-sound");

  // 빗질 애니메이션
  if (characterImages.brush) setEmotion("brush");
  else setEmotion("wash");

  updateBars();
  saveGame();
}




/* 캐릭터 클릭 대화 */
document.getElementById("character")?.addEventListener("click", () => {
  const cuteTalk = [`...${playerName}`, "응..?할말있어?", "뭐해..?"];
  const neutralTalk = ["넌 다른 핸들러들과는 다른 것 같아..","왜..", "너 이름이 뭐라고..?"];
  const grumpyTalk = ["...죽인다", "손대지 마.", "너 누군데"];
  const messages = affinity < 30 ? grumpyTalk : affinity >= 70 ? cuteTalk : neutralTalk;

  speak(messages[Math.floor(Math.random()*messages.length)]);
  fun = Math.min(100, fun + 5); coins++; xp += 5;
  updateAffinity(+0.1); playSound("click-sound");
  updateBars(); saveGame();
});

/* ✅ 호감도 변경 시 즉시 상태 이미지 반영 (감정 중이면 감정 끝나고 반영) */
function updateAffinity(delta = 0) {
  affinity = Math.max(0, Math.min(100, affinity + delta));
  updateBars();
  if (!isEmoting) updateCharacter(true); // 감정 중이 아니면 즉시
  saveGame();
}

/* 게임 */
function openGameHub() {
  document.getElementById("gamehub-modal").style.display = "flex";
}
function closeGameHub() {
  document.getElementById("gamehub-modal").style.display = "none";
}

function openMiniGame() {
  const modal = document.getElementById("minigame-modal");
  modal.style.display = "flex";
  showToast('업데이트 중');
}

function closeMiniGame() {
  const modal = document.getElementById("minigame-modal");
  modal.style.display = "none";
  miniGameRunning = false;
}

function startMiniGame() {
  const canvas = document.getElementById("minigame-canvas");
  const ctx = canvas.getContext("2d");
  miniGameRunning = true;
  miniGameScore = 0;

  player = { x: 40, y: 320, w: 30, h: 30, color: "#3b82f6" };
  obstacles = [];
  gravity = 0.6;
  jumpPower = -10;
  yVelocity = 0;

  // 점프 입력 (키보드 + 터치)
  const jump = () => {
    if (player.y >= 320) yVelocity = jumpPower;
  };
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") jump();
  });
  canvas.addEventListener("click", jump);
  canvas.addEventListener("touchstart", jump);

  const interval = setInterval(() => {
    if (!miniGameRunning) return clearInterval(interval);
    updateMiniGame(ctx, canvas);
  }, 30);
}

function updateMiniGame(ctx, canvas) {
  yVelocity += gravity;
  player.y += yVelocity;
  if (player.y > 320) player.y = 320;

  // 장애물 생성 (바닥 또는 공중)
  if (Math.random() < 0.03) {
    const type = Math.random() < 0.6 ? "ground" : "air";
    const y = type === "ground" ? 340 : 250;
    const h = type === "ground" ? 20 : 20;
    const w = 25 + Math.random() * 30;
    obstacles.push({ x: 300, y, w, h, color: "#ef4444" });
  }

  // 이동 및 충돌 검사
  obstacles.forEach((o) => (o.x -= 4));
  obstacles = obstacles.filter((o) => o.x + o.w > 0);

  for (const o of obstacles) {
    if (
      player.x < o.x + o.w &&
      player.x + player.w > o.x &&
      player.y < o.y + o.h &&
      player.y + player.h > o.y
    ) {
      miniGameRunning = false;
      endMiniGame();
      return;
    }
  }

  // 점수 및 화면 그리기
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f1f1f1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 땅
  ctx.fillStyle = "#333";
  ctx.fillRect(0, 360, canvas.width, 40);

  // 캐릭터
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x + 15, player.y + 15, 15, 0, Math.PI * 2);
  ctx.fill();

  // 장애물
  obstacles.forEach((o) => {
    ctx.fillStyle = o.color;
    ctx.fillRect(o.x, o.y, o.w, o.h);
  });

  // 점수
  miniGameScore++;
  ctx.fillStyle = "#000";
  ctx.font = "16px Arial";
  ctx.fillText(`Score: ${miniGameScore}`, 10, 25);
}


/* 레벨업 */
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
  function applyBackgroundThemeInShop(theme) {
    const c = document.querySelector(".game-container");
    c.style.background = "";
    c.classList.remove("bg-morning","bg-day","bg-evening","bg-night");
    switch (theme) {
      case "morning": c.classList.add("bg-morning"); break;
      case "day":     c.classList.add("bg-day");     break;
      case "evening": c.classList.add("bg-evening"); break;
      case "night":   c.classList.add("bg-night");   break;
      default:        c.classList.add("bg-day");
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
  switch(theme){ case "morning": return "설산"; case "day": return "연구실"; case "evening": return "훈련실"; case "night": return "검은"; default: return "기본"; }
}

function buyBackground(theme, price = 30) {
  if (purchasedBackgrounds.has(theme)) {
    currentBackground = theme;
    applyBackgroundTheme(theme);
    showToast(`🎨 ${themeName(theme)} 배경으로 변경했어요!`);
    saveGame();
    updateShopUI();
    return;
  }
  if (coins < price) {
    showToast("💸 코인이 부족해요!");
    return;
  }
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

  localStorage.removeItem("petGameState");
  localStorage.removeItem("purchasedOutfits");
  localStorage.removeItem("purchasedBackgrounds");

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

  purchasedOutfits.clear();
  purchasedBackgrounds.clear();

  applyBackgroundTheme(currentBackground);
  updateBars();
  updateCharacter(true);
  showToast("🔄 데이터가 초기화되었습니다!");

  document.getElementById("confirm-modal").style.display = "none";
  document.getElementById("settings-modal").style.display = "none";

  setTimeout(() => {
    document.getElementById("name-modal").style.display = "flex";
  }, 400);

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
updateBars();
updateCharacter(true);

statusInterval = setInterval(decreaseStatus, 1500);
coinInterval   = setInterval(()=>{ coins++; updateBars(); saveGame(); }, 30000);
saveInterval   = setInterval(saveGame, 3000);
setInterval(checkLevelUp, 1000);

document.getElementById("sound-status").innerText = soundOn ? "켜짐" : "꺼짐";
const bgm = document.getElementById("bgm"); if (bgm && soundOn) bgm.play().catch(()=>{});
setTimeout(askName, 0);

/* 배경 테마 적용 */
function applyBackgroundTheme(theme) {
  const c = document.querySelector(".game-container");
  c.classList.remove("bg-morning", "bg-day", "bg-evening", "bg-night", "dark-theme");
  c.style.background = "";
  switch (theme) {
    case "morning":
      c.classList.add("bg-morning"); 
      break;
      
    case "day":     
      c.classList.add("bg-day");
      c.style.color = "#fff"
      break;
      
    case "evening": 
      c.classList.add("bg-evening"); 
      c.style.color = "#fff"
      break;
      
    case "night":
      c.classList.add("bg-night");
      c.style.background = "#000";
      c.style.color = "#fff";
      break;
  }
}

loadGame();
applyBackgroundTheme(currentBackground);
updateBars();
updateCharacter(true);

// ✅ 로드 후 호감도 상태 다시 반영
if (affinity !== 0) {
  updateAffinity(0);
}