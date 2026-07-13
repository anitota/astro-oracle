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
function formatDateBG(d){
  const months = ['януари','февруари','март','април','май','юни','юли','август','септември','октомври','ноември','декември'];
  const days = ['неделя','понеделник','вторник','сряда','четвъртък','петък','събота'];
  return days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}
function moonPhase(date){
  const lp = 2551443; // seconds in synodic month
  const newMoonRef = new Date(Date.UTC(2000,0,6,18,14,0)).getTime()/1000;
  const phase = ((date.getTime()/1000) - newMoonRef) % lp;
  const normalized = (phase < 0 ? phase + lp : phase) / lp;
  const idx = Math.floor(normalized*8 + 0.5) % 8;
  const names = ['Новолуние','Растяща луна (сърп)','Първа четвърт','Растяща луна (изпъкнала)','Пълнолуние','Намаляваща луна (изпъкнала)','Последна четвърт','Намаляваща луна (сърп)'];
  const emojis = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
  return {name:names[idx], emoji:emojis[idx]};
}

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

/* ---------------- app ---------------- */
let DATA = null;

async function loadData(){
  const res = await fetch('data.json');
  DATA = await res.json();
}

function renderZodiacGrid(){
  const zodiacGrid = document.getElementById('zodiacGrid');
  DATA.signs.forEach(s=>{
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
  const sign = DATA.signs.find(s=>s.id===signId);
  document.getElementById('onboarding').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  document.getElementById('profileLabel').textContent = `${sign.glyph} ${sign.name}`;

  const dKey = todayKey();
  const dateObj = new Date();

  const cardIdx = hashStr(dKey+'|tarot|'+signId) % DATA.cards.length;
  const reversed = (hashStr(dKey+'|orientation|'+signId) % 2) === 1;
  const card = DATA.cards[cardIdx];

  document.getElementById('cardGlyph').textContent = card.glyph;
  document.getElementById('cardName').textContent = card.name;
  document.getElementById('cardOrientation').textContent = reversed ? 'обърната' : 'изправена';
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
    const list = appendHistory({date:dKey, card:card.name+(reversed?' (обърната)':''), sign:sign.name});
    renderHistory(list);
  };

  const love = DATA.horoscopeLove[hashStr(dKey+'|love|'+signId) % DATA.horoscopeLove.length];
  const work = DATA.horoscopeWork[hashStr(dKey+'|work|'+signId) % DATA.horoscopeWork.length];
  const energy = DATA.horoscopeEnergy[hashStr(dKey+'|energy|'+signId) % DATA.horoscopeEnergy.length];
  document.getElementById('horoscopeText').innerHTML = `${love}</p><p>${work}</p><p>${energy}`;

  const astro = DATA.astroGlobal[hashStr(dKey+'|astro') % DATA.astroGlobal.length];
  document.getElementById('astroText').textContent = astro;
  const moon = moonPhase(dateObj);
  document.getElementById('moonPhaseLabel').textContent = moon.name;
  document.getElementById('moonEmoji').textContent = moon.emoji;

  renderHistory(getHistory());
}

function renderHistory(list){
  const el = document.getElementById('historyList');
  el.innerHTML = '';
  if(!list.length){
    el.innerHTML = '<div class="history-item"><span>все още няма записи</span><span></span></div>';
    return;
  }
  list.forEach(item=>{
    const row = document.createElement('div');
    row.className = 'history-item';
    row.innerHTML = `<span>${item.date}</span><span>${item.card}</span>`;
    el.appendChild(row);
  });
}

/* ---------------- init ---------------- */
(async function init(){
  document.getElementById('dateLine').textContent = formatDateBG(new Date());

  await loadData();
  renderZodiacGrid();

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
