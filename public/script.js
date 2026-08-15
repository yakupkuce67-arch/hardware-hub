const API_URL = 'http://localhost:3000/api';

// Oyun Veritabanı
const games = [
  { id: "cs2", name: "Counter-Strike 2", minRam: 8, minCores: 4, difficultyScore: 45, baseFps: 140 },
  { id: "valorant", name: "Valorant", minRam: 4, minCores: 2, difficultyScore: 25, baseFps: 200 },
  { id: "gta5", name: "GTA V", minRam: 8, minCores: 4, difficultyScore: 40, baseFps: 90 },
  { id: "cyberpunk", name: "Cyberpunk 2077", minRam: 12, minCores: 6, difficultyScore: 85, baseFps: 60 }
];

let userHardware = { ram: 8, cores: 4, gpu: "Bilinmiyor", gpuScore: 50 };

// 1. Auth İşlemleri
async function register() {
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;

  if (!username || !password) return alert('Kullanıcı adı ve şifre giriniz!');

  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json();
  alert(data.message || data.error);
}

async function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  if (!username || !password) return alert('Kullanıcı adı ve şifre giriniz!');

  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json();

  if (data.token) {
    localStorage.setItem('token', data.token);
    alert('Giriş başarılı! Token kaydedildi.');
  } else {
    alert(data.error);
  }
}

async function getProtectedData() {
  const token = localStorage.getItem('token');

  if (!token) return alert('Önce giriş yapmalısınız!');

  const response = await fetch(`${API_URL}/protected`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();
  if (response.ok) {
    document.getElementById('protected-response').innerText = data.message;
  } else {
    document.getElementById('protected-response').innerText = 'Erişim Engellendi (Geçersiz Token)';
  }
}

// 2. Sekme Yönetimi
function setupTabs() {
  const buttons = document.querySelectorAll(".nav-btn");
  const tabs = document.querySelectorAll(".tab-content");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      tabs.forEach(t => t.classList.remove("active"));

      btn.classList.add("active");
      const targetTab = btn.getAttribute("data-target");
      document.getElementById(targetTab).classList.add("active");

      if (targetTab === "tab-library") renderLibrary();
    });
  });
}

// 3. Donanım Algılama ve Kütüphane
function detectHardware() {
  const ram = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 4;
  userHardware.ram = ram;
  userHardware.cores = cores;

  document.getElementById("user-ram").innerText = `${ram} GB`;
  document.getElementById("user-cpu").innerText = `${cores} Çekirdek`;
  document.getElementById("user-gpu").innerText = "Tespit Edildi";
}

function renderLibrary() {
  const container = document.getElementById("library-list");
  container.innerHTML = "";

  games.forEach(game => {
    const isOk = userHardware.ram >= game.minRam && userHardware.cores >= game.minCores;
    const badge = isOk 
      ? `<span class="game-badge badge-success">✅ Kaldırır (~${game.baseFps} FPS)</span>`
      : `<span class="game-badge badge-fail">❌ Kaldırmaz</span>`;

    const card = document.createElement("div");
    card.className = "game-card";
    card.innerHTML = `<h3>${game.name}</h3><p style="font-size:0.8rem; color:#94a3b8; margin-top:4px;">Min RAM: ${game.minRam}GB</p>${badge}`;
    container.appendChild(card);
  });
}

function populateDropdowns() {
  const drop1 = document.getElementById("game-dropdown-checker");
  const drop2 = document.getElementById("game-dropdown-fps");

  games.forEach(game => {
    drop1.add(new Option(game.name, game.id));
    drop2.add(new Option(game.name, game.id));
  });
}

function checkSystem() {
  const selectedId = document.getElementById("game-dropdown-checker").value;
  const game = games.find(g => g.id === selectedId);
  const resultCard = document.getElementById("result-card-checker");

  resultCard.classList.remove("hidden", "success", "fail");

  if (userHardware.ram >= game.minRam) {
    resultCard.classList.add("success");
    document.getElementById("result-title-checker").innerText = "✅ Kaldırır";
    document.getElementById("result-details-checker").innerText = "Sisteminiz bu oyun için yeterli.";
  } else {
    resultCard.classList.add("fail");
    document.getElementById("result-title-checker").innerText = "❌ Kaldırmaz";
    document.getElementById("result-details-checker").innerText = `Yetersiz RAM (${userHardware.ram} GB / Gerekli: ${game.minRam} GB)`;
  }
}

function calculateFPS() {
  const selectedId = document.getElementById("game-dropdown-fps").value;
  const game = games.find(g => g.id === selectedId);
  const resultCard = document.getElementById("result-card-fps");

  resultCard.classList.remove("hidden", "success", "fail");

  if (userHardware.ram < game.minRam) {
    resultCard.classList.add("fail");
    document.getElementById("result-title-fps").innerText = "❌ FPS Hesaplaması Yapılamaz";
    document.getElementById("result-details-fps").innerText = "Cihazınız bu oyunu çalıştırmak için zayıf.";
  } else {
    resultCard.classList.add("success");
    document.getElementById("result-title-fps").innerText = `⚡ Tahmini FPS: ~${game.baseFps} FPS`;
    document.getElementById("result-details-fps").innerText = "1080p çözünürlükte akıcı performans alabilirsiniz.";
  }
}

// Ağ Hızı & Ping Ölçüm Fonksiyonu
async function measurePing() {
  const resultText = document.getElementById("ping-result");
  resultText.innerText = "Ölçülüyor...";

  const startTime = performance.now();
  try {
    // Sunucuya hafif bir istek atarak gecikmeyi hesaplıyoruz
    await fetch(`${API_URL}/protected`, { method: 'HEAD' });
    const duration = Math.round(performance.now() - startTime);

    let status = "🟢 Mükemmel";
    if (duration > 80) status = "🟡 Orta";
    if (duration > 150) status = "🔴 Yüksek Gecikme";

    resultText.innerText = `Gecikme (Ping): ${duration} ms - ${status}`;
  } catch (error) {
    resultText.innerText = "Sunucu bağlantı hatası! Sunucunun çalıştığından emin olun.";
  }
}

function calculateSystem() {
    const cpu = document.getElementById('cpu-select');
    const gpu = document.getElementById('gpu-select');
    const ram = document.getElementById('ram-select');
    const ssd = document.getElementById('ssd-select');

    // Fiyat Hesaplama
    const totalPrice = parseInt(cpu.value) + parseInt(gpu.value) + parseInt(ram.value) + parseInt(ssd.value);
    document.getElementById('total-price').innerText = totalPrice.toLocaleString('tr-TR') + ' TL';

    // FPS Hesaplama Tabana Ekran Kartı ve İşlemci Gücünü Alıyoruz
    const cpuFps = parseInt(cpu.options[cpu.selectedIndex].getAttribute('data-fps') || 0);
    const gpuFps = parseInt(gpu.options[gpu.selectedIndex].getAttribute('data-fps') || 0);

    if (cpuFps === 0 || gpuFps === 0) {
        document.getElementById('fps-cs').innerText = '0 FPS';
        document.getElementById('fps-gta').innerText = '0 FPS';
        document.getElementById('fps-cyberpunk').innerText = '0 FPS';
        return;
    }

    const baseFps = cpuFps + gpuFps;

    // Oyun Bazlı FPS Oranları
    document.getElementById('fps-cs').innerText = Math.round(baseFps * 2.2) + ' FPS';
    document.getElementById('fps-gta').innerText = Math.round(baseFps * 1.2) + ' FPS';
    document.getElementById('fps-cyberpunk').innerText = Math.round(baseFps * 0.65) + ' FPS';
}

// Başlatıcı
window.addEventListener("DOMContentLoaded", () => {
  detectHardware();
  setupTabs();
  populateDropdowns();
});