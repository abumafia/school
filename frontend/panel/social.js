const userId = localStorage.getItem("userId");
const postContainer = document.getElementById("postContainer");
const searchInput = document.getElementById("searchInput");
const likeModal = document.getElementById("likeModal");
const likeList = document.getElementById("likeList");

// Barcha postlarni yuklash
async function fetchPosts() {
  const res = await fetch("/api/social");
  const posts = await res.json();
  postContainer.innerHTML = "";
  posts.reverse().forEach(renderPost);
}

// Har bir postni chiqarish
function renderPost(post) {
  const card = document.createElement("div");
  card.className = "bg-white p-4 rounded-xl shadow";

  const liked = post.likes.includes(userId);
  const likeCount = post.likes.length;

  card.innerHTML = `
    <div class="flex justify-between items-center mb-2">
      <div onclick="goToProfile('${post.userId}')" class="text-purple-600 font-semibold cursor-pointer hover:underline">${post.username}</div>
      <div class="text-sm text-gray-400">${new Date(post.date).toLocaleString()}</div>
    </div>
    <h2 class="text-lg font-bold mb-1">${post.title}</h2>
    <p class="mb-2">${highlightHashtags(post.content)}</p>

    <div class="flex items-center gap-4 text-sm">
      <button onclick="toggleLike('${post.id}')" class="${liked ? 'text-red-500' : 'text-gray-500'}">
        ❤️ ${likeCount}
      </button>
      <button onclick="toggleComments('${post.id}')" class="text-blue-500">💬 Kommentlar</button>
    </div>

    <div id="comments-${post.id}" class="mt-4 hidden">
      <div id="commentList-${post.id}" class="space-y-2 mb-2">
        ${post.comments.map(comment => renderComment(comment, post.id)).join("")}
      </div>
      <input id="commentInput-${post.id}" placeholder="Izoh yozing..." class="w-full p-2 border rounded" />
      <button onclick="addComment('${post.id}')" class="mt-2 bg-blue-500 text-white px-3 py-1 rounded">Yuborish</button>
    </div>
  `;

  postContainer.appendChild(card);
}

// Kommentlar va javoblarni chiqarish
function renderComment(comment, postId) {
  const liked = (comment.likes || []).includes(userId);
  const likeCount = (comment.likes || []).length;

  return `
    <div class="border-t pt-2 mt-2">
      <span onclick="goToProfile('${comment.userId}')" class="text-purple-600 font-medium cursor-pointer hover:underline">${comment.userId}</span>:
      <span>${comment.text}</span>
      
      <div class="flex gap-4 items-center text-sm text-gray-500 ml-4 mt-1">
        <button onclick="toggleCommentLike('${postId}', '${comment.id}')" class="${liked ? 'text-red-500' : ''}">
          ❤️ ${likeCount}
        </button>
      </div>

      <div class="ml-4 mt-2">
        ${(comment.replies || []).map(reply => `
          <div class="ml-4 text-sm">
            ↪ <span onclick="goToProfile('${reply.userId}')" class="text-purple-600 font-medium cursor-pointer hover:underline">${reply.userId}</span>: ${reply.text}
          </div>
        `).join("")}

        <input id="replyInput-${comment.id}" placeholder="Javob yozing..." class="w-full p-1 mt-2 border rounded text-sm" />
        <button onclick="addReply('${postId}', '${comment.id}')" class="mt-1 bg-green-500 text-white px-2 py-1 rounded text-sm">↪ Yuborish</button>
      </div>
    </div>
  `;
}

// Layk tugmasi
async function toggleLike(postId) {
  await fetch(`/api/social/${postId}/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  fetchPosts();
}

// Komment qo‘shish
async function addComment(postId) {
  const input = document.getElementById(`commentInput-${postId}`);
  const text = input.value.trim();
  if (!text) return;

  await fetch(`/api/social/${postId}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, text }),
  });

  input.value = "";
  fetchPosts();
}

// Javob qo‘shish
async function addReply(postId, commentId) {
  const input = document.getElementById(`replyInput-${commentId}`);
  const text = input.value.trim();
  if (!text) return;

  await fetch(`/api/social/${postId}/comment/${commentId}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, text }),
  });

  input.value = "";
  fetchPosts();
}

// Kommentga layk
async function toggleCommentLike(postId, commentId) {
  await fetch(`/api/social/${postId}/comment/${commentId}/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  fetchPosts();
}

// Kommentlarni ochish/yopish
function toggleComments(postId) {
  const section = document.getElementById(`comments-${postId}`);
  section.classList.toggle("hidden");
}

// Layk modalini ko‘rsatish
function showLikeModal(userIds) {
  likeList.innerHTML = userIds.map(id => `
    <li onclick="goToProfile('${id}')" class="cursor-pointer hover:underline">${id}</li>
  `).join("");
  likeModal.classList.remove("hidden");
}

function closeLikeModal() {
  likeModal.classList.add("hidden");
}

// Foydalanuvchi profiliga o‘tish
function goToProfile(uid) {
  window.location.href = `../profile/profile.html?user=${uid}`;
}

// Hashtaglarni ajratish
function highlightHashtags(text) {
  if (!text) return "";
  return text.replace(/#(\w+)/g, '<span class="text-blue-600 font-medium">#$1</span>');
}

// Qidiruv
searchInput.addEventListener("input", async () => {
  const term = searchInput.value.trim().toLowerCase();
  const res = await fetch("/api/social");
  const posts = await res.json();
  const filtered = posts.filter(p =>
    p.title.toLowerCase().includes(term) ||
    p.content.toLowerCase().includes(term) ||
    (p.hashtags || []).some(tag => tag.toLowerCase().includes(term))
  );
  postContainer.innerHTML = "";
  filtered.reverse().forEach(renderPost);
});

// Boshlanish
fetchPosts();
