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
  document.documentElement.lang = currentLang;
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
  document.getElementById('moonPhaseLabel').textContent = DATA.moonPhaseNames[currentLang][moonIdx];
  document.getElementById('moonEmoji').textContent = MOON_EMOJIS[moonIdx];

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
})();
