(() => {
  const $ = (id) => document.getElementById(id);
  const audio = $("audio");
  const grid = $("songGrid");
  const modal = $("adminModal");
  const form = $("uploadForm");
  const STORAGE_KEY = "lim_local_tracks_v1";
  let tracks = [];
  let activeId = null;
  let objectUrls = [];

  // This is a local prototype. Browser file inputs cannot safely persist large
  // audio files after refresh; a real hosted version needs authenticated cloud storage.
  function loadTracks() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      tracks = saved.map(t => ({...t, audioUrl: null, imageUrl: t.imageData || null, unavailable: true}));
    } catch { tracks = []; }
  }
  function escapeHtml(value="") {
    return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }
  function durationText(seconds) {
    if (!Number.isFinite(seconds)) return "—:—";
    return `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,"0")}`;
  }
  function coverHtml(track) {
    return track.imageUrl ? `<img src="${track.imageUrl}" alt="${escapeHtml(track.title)} cover">` : `<div class="cover-placeholder">♫</div>`;
  }
  function render() {
    const query = $("searchInput").value.trim().toLowerCase();
    let shown = tracks.filter(t => `${t.title} ${t.artist} ${t.caption}`.toLowerCase().includes(query));
    const sort = $("sortSelect").value;
    if (sort === "title") shown.sort((a,b)=>a.title.localeCompare(b.title));
    else if (sort === "artist") shown.sort((a,b)=>a.artist.localeCompare(b.artist));
    else shown.sort((a,b)=>b.createdAt-a.createdAt);
    $("songCount").textContent = `${tracks.length} TRACK${tracks.length===1?"":"S"}`;
    $("emptyState").style.display = tracks.length ? "none" : "block";
    grid.innerHTML = "";
    if (!shown.length && tracks.length) { grid.innerHTML = `<div class="no-results">No tracks match your search.</div>`; return; }
    shown.forEach(t => {
      const card = document.createElement("article");
      card.className = "song-card";
      card.innerHTML = `<div class="cover-wrap">${coverHtml(t)}<button class="card-play" aria-label="Play ${escapeHtml(t.title)}" data-play="${t.id}">▶</button></div>
        <h3 title="${escapeHtml(t.title)}">${escapeHtml(t.title)}</h3><p class="song-artist">${escapeHtml(t.artist || "Unknown artist")}</p>
        <p class="song-caption">${escapeHtml(t.caption || "No caption added yet.")}</p>
        <div class="card-bottom"><span>${t.unavailable ? "RE-ADD AUDIO TO PLAY" : "YOUR LIBRARY"}</span><button class="delete-track" data-delete="${t.id}" title="Remove track">Remove</button></div>`;
      grid.appendChild(card);
    });
  }
  function setPlayerTrack(track) {
    if (!track) return;
    if (track.unavailable || !track.audioUrl) {
      alert("This track's audio file is no longer available after a page refresh. Please re-add it, or connect cloud storage for permanent online music.");
      return;
    }
    activeId = track.id;
    audio.src = track.audioUrl;
    $("playerTitle").textContent = track.title;
    $("playerArtist").textContent = track.artist || "Unknown artist";
    $("playerCover").innerHTML = track.imageUrl ? `<img src="${track.imageUrl}" alt="">` : "♫";
    $("playPause").textContent = "Ⅱ";
    audio.play().catch(() => {$("playPause").textContent = "▶";});
  }
  function togglePlay() {
    if (!audio.src) { const first = tracks.find(t=>t.audioUrl && !t.unavailable); if(first) setPlayerTrack(first); else alert("Upload a track first. In this local demo, re-add audio after refreshing."); return; }
    if (audio.paused) audio.play(); else audio.pause();
  }
  grid.addEventListener("click", e => {
    const play = e.target.closest("[data-play]");
    const del = e.target.closest("[data-delete]");
    if (play) { const t=tracks.find(x=>x.id===play.dataset.play); if(t && t.id===activeId && !audio.paused) audio.pause(); else setPlayerTrack(t); }
    if (del) {
      const t=tracks.find(x=>x.id===del.dataset.delete);
      if (!t || !confirm(`Remove "${t.title}" from this browser?`)) return;
      if (t.audioUrl) URL.revokeObjectURL(t.audioUrl);
      if (t.imageUrl && t.imageUrl.startsWith("blob:")) URL.revokeObjectURL(t.imageUrl);
      tracks=tracks.filter(x=>x.id!==t.id);
      persistMetadata(); render();
      if(activeId===t.id){audio.pause();audio.removeAttribute("src");activeId=null;$("playerTitle").textContent="Choose a track";$("playerArtist").textContent="Your next favorite song awaits";}
    }
  });
  function persistMetadata() {
    // Store only small metadata and thumbnail data, never the audio file itself.
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks.map(({id,title,artist,caption,createdAt,imageData})=>({id,title,artist,caption,createdAt,imageData:imageData||null})))); }
    catch { $("formMessage").textContent="Browser storage is full; this demo may not retain all thumbnails."; }
  }
  $("adminOpen").addEventListener("click",()=>{modal.hidden=false;});
  $("emptyUpload").addEventListener("click",()=>{modal.hidden=false;});
  $("adminClose").addEventListener("click",()=>{modal.hidden=true;});
  modal.addEventListener("click",e=>{if(e.target===modal)modal.hidden=true;});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")modal.hidden=true;});
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const title=$("titleInput").value.trim();
    const artist=$("artistInput").value.trim();
    const caption=$("captionInput").value.trim();
    const audioFile=$("audioInput").files[0];
    const imageFile=$("imageInput").files[0];
    if(!audioFile){$("formMessage").textContent="Please select an audio file.";return;}
    if(!audioFile.type.startsWith("audio/") && !/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(audioFile.name)){ $("formMessage").textContent="Please select a supported audio file.";return; }
    let imageUrl=null, imageData=null;
    if(imageFile){
      if(!imageFile.type.startsWith("image/")){$("formMessage").textContent="Please select an image for the thumbnail.";return;}
      imageUrl=URL.createObjectURL(imageFile);
      // Small thumbnail data can be persisted; cap to avoid filling browser storage.
      if(imageFile.size < 450000) {
        imageData=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>resolve(null);reader.readAsDataURL(imageFile);});
      }
    }
    const track={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),title,artist,caption,createdAt:Date.now(),audioUrl:URL.createObjectURL(audioFile),imageUrl,imageData,unavailable:false};
    tracks.unshift(track);
    persistMetadata();
    render();
    $("formMessage").textContent="Track added to this browser's library.";
    form.reset();
    setTimeout(()=>{modal.hidden=true;$("formMessage").textContent="";},800);
  });
  $("searchInput").addEventListener("input",render);
  $("sortSelect").addEventListener("change",render);
  $("playPause").addEventListener("click",togglePlay);
  $("prevBtn").addEventListener("click",()=>playRelative(-1));
  $("nextBtn").addEventListener("click",()=>playRelative(1));
  function playRelative(direction){
    const playable=tracks.filter(t=>t.audioUrl&&!t.unavailable);
    if(!playable.length)return;
    let index=playable.findIndex(t=>t.id===activeId);
    index=(index+direction+playable.length)%playable.length;
    setPlayerTrack(playable[index]);
  }
  audio.addEventListener("play",()=>$("playPause").textContent="Ⅱ");
  audio.addEventListener("pause",()=>$("playPause").textContent="▶");
  audio.addEventListener("loadedmetadata",()=>{$("duration").textContent=durationText(audio.duration);});
  audio.addEventListener("timeupdate",()=>{if(Number.isFinite(audio.duration)){$("seekBar").value=audio.currentTime/audio.duration*100;$("currentTime").textContent=durationText(audio.currentTime);}});
  audio.addEventListener("ended",()=>playRelative(1));
  $("seekBar").addEventListener("input",()=>{if(Number.isFinite(audio.duration))audio.currentTime=(+$("seekBar").value/100)*audio.duration;});
  $("volumeBar").addEventListener("input",()=>audio.volume=+$("volumeBar").value);
  $("year").textContent=new Date().getFullYear();
  loadTracks();
  render();
})();