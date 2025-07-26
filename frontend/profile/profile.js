const currentUser = JSON.parse(localStorage.getItem("user"));
if (!currentUser) {
  window.location.href = "/frontend/login/student-login.html";
}

const viewedUserId = new URLSearchParams(location.search).get("user") || currentUser.id;
const editBtn = document.getElementById("editBtn");
const editModal = document.getElementById("editModal");
const cancelEdit = document.getElementById("cancelEdit");
const editForm = document.getElementById("editForm");
let viewedUser = null;

// Faqat o‘z profilida "Tahrirlash" tugmasi ko‘rinadi
if (viewedUserId === currentUser.id) {
  editBtn?.classList.remove("hidden");
}

async function loadUserProfile() {
  try {
    const res = await fetch("http://localhost:3000/api/users");
    const users = await res.json();
    viewedUser = users.find(u => u.id == viewedUserId);

    if (!viewedUser) {
      document.getElementById("profileInfo").innerHTML = "Foydalanuvchi topilmadi.";
      return;
    }

    // UI ni to‘ldirish
    document.getElementById('coin-count').innerText = viewedUser.coins ?? 0;
    document.getElementById("name").textContent = viewedUser.name || '';
    document.getElementById("surname").textContent = viewedUser.surname || '';
    document.getElementById("school").textContent = viewedUser.school || '';
    document.getElementById("role").textContent = viewedUser.role;
    document.getElementById("email").textContent = viewedUser.email || '';
    document.getElementById("bio").textContent = viewedUser.bio || '';
    document.getElementById("badge").innerText = getUserBadge(viewedUser.coins || 0);
  } catch (err) {
    console.error("Xatolik:", err);
  }
}

editBtn?.addEventListener("click", () => {
  editModal?.classList.remove("hidden");
  ["name", "surname", "school", "email", "bio"].forEach(key => {
    editForm[key].value = viewedUser[key] || '';
  });
});

cancelEdit?.addEventListener("click", () => {
  editModal?.classList.add("hidden");
});

window.addEventListener("click", (e) => {
  if (e.target === editModal) {
    editModal.classList.add("hidden");
  }
});

editForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(editForm);
  const data = Object.fromEntries(formData.entries());

  try {
    const res = await fetch(`http://localhost:3000/api/users/${currentUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (result.success) {
      localStorage.setItem("user", JSON.stringify(result.user));
      viewedUser = result.user;
      editModal.classList.add("hidden");
      await loadUserProfile();
    } else {
      alert("❌ Saqlashda xatolik.");
    }
  } catch (err) {
    console.error("Saqlash xatoligi:", err);
  }
});

// ================== Coin va Badge ==================

function getUserBadge(coins) {
  if (coins >= 100) return '🏅 Gold';
  if (coins >= 50) return '🥈 Silver';
  if (coins >= 10) return '🥉 Bronze';
  return '👤 Beginner';
}

function openCoinModal() {
  document.getElementById('coinModal')?.classList.remove('hidden');
}

function closeCoinModal() {
  document.getElementById('coinModal')?.classList.add('hidden');
}

function sendCoinRequest() {
  const userId = currentUser.id;
  const amount = parseInt(document.getElementById('coin-amount').value);
  if (!amount || amount <= 0) return alert('Iltimos, coin miqdorini to‘g‘ri kiriting');

  fetch('/api/coin/request', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ userId, amount })
  })
  .then(res => res.json())
  .then(data => {
    alert(data.success ? 'So‘rov yuborildi!' : 'Xatolik!');
    closeCoinModal();
  });
}

function useCoins(amount, reason) {
  const userId = currentUser.id;

  fetch('/api/coins/use', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ userId, amount, reason })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert(`${amount} coin ishlatildi!`);
      loadUserProfile();
    } else {
      alert(data.message || 'Xatolik yuz berdi!');
    }
  });
}

fetch(`/api/coins/history/${viewedUserId}`)
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById('coin-history');
    container.innerHTML = '';
    data.history.forEach(entry => {
      const div = document.createElement('div');
      div.className = "text-sm text-gray-600 border-b py-1";
      div.innerText = `${entry.date} - ${entry.reason} (${entry.amount > 0 ? '+' : ''}${entry.amount} coin)`;
      container.appendChild(div);
    });
  });

// ================== CHAT QISMI ==================

const socket = io('http://localhost:3000');
const userId = currentUser.id;
const targetUserId = viewedUserId;

socket.emit('register', userId);

document.getElementById("sendBtn")?.addEventListener("click", sendMessage);

function sendMessage() {
  const fileInput = document.getElementById('fileInput');
  const textInput = document.getElementById('messageInput');
  const file = fileInput?.files[0];
  const text = textInput?.value;

  if (file) {
    const formData = new FormData();
    formData.append('file', file);

    fetch('/api/chat/upload', {
      method: 'POST',
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      socket.emit('privateMessage', {
        from: userId,
        to: targetUserId,
        content: data.url,
        type: file.type.startsWith('audio') ? 'audio' :
              file.type.startsWith('video') ? 'video' :
              file.type.startsWith('image') ? 'image' : 'file'
      });
    });
  } else if (text.trim()) {
    socket.emit('privateMessage', {
      from: userId,
      to: targetUserId,
      content: text,
      type: 'text'
    });
    textInput.value = '';
  }
}

socket.on('message', (msg) => {
  const div = document.createElement('div');
  div.className = "my-2";

  if (msg.type === 'text') {
    div.innerText = msg.content;
  } else if (msg.type === 'image') {
    div.innerHTML = `<img src="${msg.content}" class="w-48 rounded" />`;
  } else if (msg.type === 'audio') {
    div.innerHTML = `<audio controls src="${msg.content}" class="w-full"></audio>`;
  } else if (msg.type === 'video') {
    div.innerHTML = `<video controls width="250" src="${msg.content}" class="rounded"></video>`;
  } else {
    div.innerHTML = `<a href="${msg.content}" download class="text-blue-500 underline">Faylni yuklab olish</a>`;
  }

  document.getElementById('chatBox')?.appendChild(div);
});

const user = JSON.parse(localStorage.getItem("loggedInUser"));
if (user && user.coin !== undefined) {
  document.getElementById("coin-count").innerText = user.coin;
} else {
  document.getElementById("coin-count").innerText = 0;
}

// Boshlanish
loadUserProfile();
