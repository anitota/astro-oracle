/* ---------------- starfield ---------------- */
(function(){
  const container = document.getElementById('stars');
  const n = 70;
  for(let i=0;i<n;i++){
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random()*2 + 1;
    s.style.width = size+'px';
    s.style.height = size+'px';
    s.style.left = Math.random()*100+'%';
    s.style.top = Math.random()*100+'%';
    s.style.animationDelay = (Math.random()*4)+'s';
    container.appendChild(s);
  }
})();

/* ---------------- helpers ---------------- */
function hashStr(str){
  let h = 0;
  for(let i=0;i<str.length;i++){
    h = (h*31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}
function todayKey(){
  const d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
const DATE_LOCALE = { bg:'bg-BG', en:'en-US', fr:'fr-FR' };
function formatDate(d, lang){
  return d.toLocaleDateString(DATE_LOCALE[lang] || 'en-US', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}
function moonPhaseIndex(date){
  const lp = 2551443; // seconds in synodic month
  const newMoonRef = new Date(Date.UTC(2000,0,6,18,14,0)).getTime()/1000;
  const phase = ((date.getTime()/1000) - newMoonRef) % lp;
  const normalized = (phase < 0 ? phase + lp : phase) / lp;
  return Math.floor(normalized*8 + 0.5) % 8;
}
const MOON_EMOJIS = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];

/* ---------------- storage (browser localStorage) ---------------- */
function getProfile(){
  try{
    const raw = localStorage.getItem('oracle:profile');
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function setProfile(signId){
  try{ localStorage.setItem('oracle:profile', JSON.stringify({signId})); }catch(e){}
}
function getLang(){
  try{ return localStorage.getItem('oracle:lang') || 'bg'; }catch(e){ return 'bg'; }
}
function setLang(lang){
  try{ localStorage.setItem('oracle:lang', lang); }catch(e){}
}
function getRevealed(key){
  try{ return localStorage.getItem('oracle:revealed:'+key) === '1'; }catch(e){ return false; }
}
function setRevealed(key){
  try{ localStorage.setItem('oracle:revealed:'+key, '1'); }catch(e){}
}
function appendHistory(entry){
  try{
    let list = [];
    const raw = localStorage.getItem('oracle:history');
    if(raw) list = JSON.parse(raw);
    list = list.filter(x=>x.date !== entry.date);
    list.unshift(entry);
    list = list.slice(0,7);
    localStorage.setItem('oracle:history', JSON.stringify(list));
    return list;
  }catch(e){ return []; }
}
function getHistory(){
  try{
    const raw = localStorage.getItem('oracle:history');
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}

/* ---------------- app state ---------------- */
let DATA = null;
let currentLang = 'bg';

async function loadData(){
  const res = await fetch('data.json');
  DATA = await res.json();
}

function applyUiText(){
  const t = DATA.ui[currentLang];
  document.getElementById('eyebrow').textContent = t.eyebrow;
  document.getElementById('title').textContent = t.title;
  document.getElementById('wheelIntro').textContent = t.intro;
  document.getElementById('changeSign').textContent = t.changeSign;
  document.getElementById('cardOfDayLabel').textContent = t.cardOfDay;
  document.getElementById('cardHint').textContent = t.cardHint;
  document.getElementById('horoscopeHeading').textContent = t.horoscopeTitle;
  document.getElementById('astroHeading').textContent = t.astroTitle;
  document.getElementById('historyToggle').textContent = t.historyToggle;
  document.getElementById('footerText').textContent = t.footer;
  document.getElementById('crystalHeading').textContent = t.crystalTitle;
  document.getElementById('ritualHeading').textContent = t.ritualTitle;
  document.documentElement.lang = currentLang;
}

function renderFeatureMenu(){
  const t = DATA.ui[currentLang];
  const menu = document.getElementById('featureMenu');
  menu.innerHTML = '';
  const items = [
    {icon:'🌙', label:t.menuDraw, action:()=>goToSection('cardStage')},
    {icon:'♈', label:t.menuCrystal, action:()=>goToSection('crystalCard')},
    {icon:'🌕', label:t.menuMoon, action:toggleMoonReveal},
    {icon:'✨', label:t.menuRitual, action:()=>goToSection('ritualCard')}
  ];
  items.forEach(it=>{
    const btn = document.createElement('button');
    btn.className = 'feature-btn';
    btn.innerHTML = `<span class="feature-icon">${it.icon}</span><span class="feature-label">${it.label}</span>`;
    btn.addEventListener('click', it.action);
    menu.appendChild(btn);
  });
}

function goToSection(elId){
  const profile = getProfile();
  if(!profile || !profile.signId){
    document.getElementById('onboarding').scrollIntoView({behavior:'smooth', block:'start'});
    return;
  }
  const el = document.getElementById(elId);
  if(el){ el.scrollIntoView({behavior:'smooth', block:'center'}); }
}

function toggleMoonReveal(){
  const box = document.getElementById('moonReveal');
  const t = DATA.ui[currentLang];
  if(box.style.display === 'block'){
    box.style.display = 'none';
    return;
  }
  const dateObj = new Date();
  const idx = moonPhaseIndex(dateObj);
  box.innerHTML = `
    <button class="moon-close" id="moonCloseBtn">${t.moonRevealClose}</button>
    <span class="moon-big">${MOON_EMOJIS[idx]}</span>
    <div class="moon-name">${DATA.moonPhaseNames[currentLang][idx]}</div>
    <div class="moon-date">${formatDate(dateObj, currentLang)}</div>
  `;
  box.style.display = 'block';
  document.getElementById('moonCloseBtn').addEventListener('click', ()=>{ box.style.display = 'none'; });
  box.scrollIntoView({behavior:'smooth', block:'center'});
}

function renderZodiacGrid(){
  const zodiacGrid = document.getElementById('zodiacGrid');
  zodiacGrid.innerHTML = '';
  DATA.signs[currentLang].forEach(s=>{
    const btn = document.createElement('button');
    btn.className = 'sign-btn';
    btn.innerHTML = `<span class="sign-glyph">${s.glyph}</span><span class="sign-name">${s.name}</span><span class="sign-dates">${s.dates}</span>`;
    btn.addEventListener('click', ()=> selectSign(s.id));
    zodiacGrid.appendChild(btn);
  });
}

function selectSign(signId){
  setProfile(signId);
  showDashboard(signId);
}

function showDashboard(signId){
  const signIdx = DATA.signs[currentLang].findIndex(s=>s.id===signId);
  const sign = DATA.signs[currentLang][signIdx];
  document.getElementById('onboarding').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  document.getElementById('profileLabel').textContent = `${sign.glyph} ${sign.name}`;

  const dKey = todayKey();
  const dateObj = new Date();
  const t = DATA.ui[currentLang];

  const cardIdx = hashStr(dKey+'|tarot|'+signId) % DATA.cards[currentLang].length;
  const reversed = (hashStr(dKey+'|orientation|'+signId) % 2) === 1;
  const card = DATA.cards[currentLang][cardIdx];

  document.getElementById('cardGlyph').textContent = card.glyph;
  document.getElementById('cardName').textContent = card.name;
  document.getElementById('cardOrientation').textContent = reversed ? t.reversed : t.upright;
  document.getElementById('cardMeaning').textContent = reversed ? card.rev : card.up;
  const cardFront = document.getElementById('cardFront');
  cardFront.classList.toggle('reversed', reversed);

  const cardInner = document.getElementById('cardInner');
  const cardStage = document.getElementById('cardStage');
  const cardHint = document.getElementById('cardHint');
  const cardMeaning = document.getElementById('cardMeaning');

  const alreadyRevealed = getRevealed(dKey+'|'+signId);
  if(alreadyRevealed){
    cardInner.classList.add('flipped');
    cardHint.style.display = 'none';
    cardMeaning.style.display = 'block';
  } else {
    cardInner.classList.remove('flipped');
    cardHint.style.display = 'block';
    cardMeaning.style.display = 'none';
  }

  cardStage.onclick = ()=>{
    if(cardInner.classList.contains('flipped')) return;
    cardInner.classList.add('flipped');
    cardHint.style.display = 'none';
    setTimeout(()=>{ cardMeaning.style.display = 'block'; }, 450);
    setRevealed(dKey+'|'+signId);
    const list = appendHistory({date:dKey, card:card.name+(reversed?' ('+t.reversed+')':''), sign:sign.name});
    renderHistory(list);
  };

  const love = DATA.horoscopeLove[currentLang][hashStr(dKey+'|love|'+signId) % DATA.horoscopeLove[currentLang].length];
  const work = DATA.horoscopeWork[currentLang][hashStr(dKey+'|work|'+signId) % DATA.horoscopeWork[currentLang].length];
  const energy = DATA.horoscopeEnergy[currentLang][hashStr(dKey+'|energy|'+signId) % DATA.horoscopeEnergy[currentLang].length];
  document.getElementById('horoscopeText').innerHTML = `${love}</p><p>${work}</p><p>${energy}`;

  const astro = DATA.astroGlobal[currentLang][hashStr(dKey+'|astro') % DATA.astroGlobal[currentLang].length];
  document.getElementById('astroText').textContent = astro;
  const moonIdx = moonPhaseIndex(dateObj);
  document.getElementById('moonPhaseLabelDash').textContent = DATA.moonPhaseNames[currentLang][moonIdx];
  document.getElementById('moonEmojiDash').textContent = MOON_EMOJIS[moonIdx];

  const crystal = DATA.crystals[currentLang][signIdx];
  document.getElementById('crystalStone').textContent = crystal.stone;
  document.getElementById('crystalDesc').textContent = crystal.desc;

  const ritual = DATA.rituals[currentLang][hashStr(dKey+'|ritual|'+signId) % DATA.rituals[currentLang].length];
  document.getElementById('ritualText').textContent = ritual;

  renderHistory(getHistory());
}

function renderHistory(list){
  const el = document.getElementById('historyList');
  const t = DATA.ui[currentLang];
  el.innerHTML = '';
  if(!list.length){
    el.innerHTML = `<div class="history-item"><span>${t.historyEmpty}</span><span></span></div>`;
    return;
  }
  list.forEach(item=>{
    const row = document.createElement('div');
    row.className = 'history-item';
    row.innerHTML = `<span>${item.date}</span><span>${item.card}</span>`;
    el.appendChild(row);
  });
}

function renderLangSwitch(){
  const wrap = document.getElementById('langSwitch');
  wrap.innerHTML = '';
  const langs = [{code:'bg', label:'БГ'}, {code:'en', label:'EN'}, {code:'fr', label:'FR'}];
  langs.forEach(l=>{
    const btn = document.createElement('button');
    btn.className = 'lang-btn' + (l.code===currentLang ? ' active' : '');
    btn.textContent = l.label;
    btn.addEventListener('click', ()=> changeLang(l.code));
    wrap.appendChild(btn);
  });
}

function changeLang(lang){
  if(lang === currentLang) return;
  currentLang = lang;
  setLang(lang);
  document.getElementById('dateLine').textContent = formatDate(new Date(), currentLang);
  applyUiText();
  renderZodiacGrid();
  renderLangSwitch();
  renderFeatureMenu();
  const profile = getProfile();
  if(profile && profile.signId){
    showDashboard(profile.signId);
  }
}

/* ---------------- init ---------------- */
(async function init(){
  currentLang = getLang();
  await loadData();

  document.getElementById('dateLine').textContent = formatDate(new Date(), currentLang);
  applyUiText();
  renderZodiacGrid();
  renderLangSwitch();
  renderFeatureMenu();

  document.getElementById('changeSign').addEventListener('click', ()=>{
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('onboarding').style.display = 'block';
  });
  document.getElementById('historyToggle').addEventListener('click', ()=>{
    document.getElementById('historyList').classList.toggle('open');
  });

  const profile = getProfile();
  if(profile && profile.signId){
    showDashboard(profile.signId);
  }

  initLikeShare();
  trackVisit();
  checkOwnerStats();
  initTheme();
})();

/* ---------------- THEME (light / dark) ---------------- */
function initTheme(){
  const btn = document.getElementById('themeToggle');
  const saved = localStorage.getItem('oracle:theme') || 'dark';
  applyTheme(saved);
  btn.addEventListener('click', ()=>{
    const current = document.body.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });
}
function applyTheme(theme){
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('oracle:theme', theme);
  const btn = document.getElementById('themeToggle');
  btn.textContent = theme === 'dark' ? '☀' : '☾';
}

/* ---------------- VISIT COUNTER (silent, owner-only view) ---------------- */
function trackVisit(){
  // fire-and-forget, doesn't block or show anything to regular visitors
  fetch(`https://api.countapi.xyz/hit/${LIKE_NAMESPACE}/views`).catch(()=>{});
}

const OWNER_SECRET = 'orakul2026';

async function checkOwnerStats(){
  const params = new URLSearchParams(window.location.search);
  if(params.get('stats') !== OWNER_SECRET) return;

  let views = '—', likes = '—';
  try{
    const v = await fetch(`https://api.countapi.xyz/get/${LIKE_NAMESPACE}/views`);
    const vd = await v.json();
    views = vd && typeof vd.value === 'number' ? vd.value : '—';
  }catch(e){}
  try{
    const l = await fetch(`https://api.countapi.xyz/get/${LIKE_NAMESPACE}/likes`);
    const ld = await l.json();
    likes = ld && typeof ld.value === 'number' ? ld.value : '—';
  }catch(e){}

  const panel = document.createElement('div');
  panel.className = 'owner-stats';
  panel.innerHTML = `
    <button class="owner-stats-close" aria-label="close">✕</button>
    <div class="owner-stats-title">Само за теб</div>
    <div class="owner-stats-row"><span>👁 Посещения</span><strong>${views}</strong></div>
    <div class="owner-stats-row"><span>♥ Харесвания</span><strong>${likes}</strong></div>
  `;
  document.body.appendChild(panel);
  panel.querySelector('.owner-stats-close').addEventListener('click', ()=> panel.remove());
}

/* ---------------- LIKE (shared counter across all visitors) ---------------- */
const LIKE_NAMESPACE = 'dneven-orakul-anitota';

async function initLikeShare(){
  const likeBtn = document.getElementById('likeBtn');
  const likeIcon = document.getElementById('likeIcon');
  const likeCount = document.getElementById('likeCount');
  const shareBtn = document.getElementById('shareBtn');
  const toast = document.getElementById('shareToast');

  const alreadyLiked = localStorage.getItem('oracle:liked') === '1';
  if(alreadyLiked){
    likeBtn.classList.add('liked');
    likeIcon.textContent = '♥';
  }

  try{
    const res = await fetch(`https://api.countapi.xyz/get/${LIKE_NAMESPACE}/likes`);
    const data = await res.json();
    likeCount.textContent = data && typeof data.value === 'number' ? data.value : '';
  }catch(e){
    likeCount.textContent = '';
  }

  likeBtn.addEventListener('click', async ()=>{
    if(localStorage.getItem('oracle:liked') === '1'){
      showToast(toast, 'Вече си харесал/а страницата 💛');
      return;
    }
    likeBtn.classList.add('liked');
    likeIcon.textContent = '♥';
    localStorage.setItem('oracle:liked', '1');
    try{
      const res = await fetch(`https://api.countapi.xyz/hit/${LIKE_NAMESPACE}/likes`);
      const data = await res.json();
      likeCount.textContent = data && typeof data.value === 'number' ? data.value : '';
    }catch(e){
      likeCount.textContent = '';
    }
  });

  shareBtn.addEventListener('click', async ()=>{
    const shareData = {
      title: 'Дневен Оракул',
      text: 'Всеки ден нова таро карта, хороскоп и астро прогноза — пробвай и ти.',
      url: window.location.href
    };
    if(navigator.share){
      try{ await navigator.share(shareData); }catch(e){ /* user cancelled */ }
    } else {
      try{
        await navigator.clipboard.writeText(window.location.href);
        showToast(toast, 'Линкът е копиран!');
      }catch(e){
        showToast(toast, window.location.href);
      }
    }
  });
}

function showToast(toast, msg){
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(()=>{ toast.classList.remove('show'); }, 2200);
}
