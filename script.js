/* ==========================================================================
   TECH TITANS LIBRARY - CONTROLLER WITH FAQ & CONTACT HANDLERS
   ========================================================================== */

const SUPABASE_URL = "https://jkudnrnzlffcgryeaewu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprdWRucm56bGZmY2dyeWVhZXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMDY5NDksImV4cCI6MjEwNDc4Mjk0OX0.GiHyxZg2jLBCtfUSaqmeoMi58DVkSjROs7pDQLad8IY";

let sb = null;
let currentUser = JSON.parse(localStorage.getItem("eduvault_user")) || null;
let currentNote = null;

let managedUsers = JSON.parse(localStorage.getItem("eduvault_managed_users")) || [
    { id: "STU-8821", email: "student@university.edu", role: "student", is_blocked: false },
    { id: "STU-1042", email: "blocked_student@university.edu", role: "student", is_blocked: true }
];

let notesData = JSON.parse(localStorage.getItem("eduvault_notes")) || [
    {
        id: "1",
        title: "Python Core Concepts",
        category: "PY",
        desc: "Comprehensive guide to Red-Black Trees, Graph Traversal, and OOP principles.",
        author: "Prof. Kailash Sir",
        date: "2026-08-28",
        pdf_url: "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf"
    }
];

let auditLogs = JSON.parse(localStorage.getItem("eduvault_logs")) || [
    { time: "2026-09-01 09:12", user: "STU-8821", action: "User Sign In" },
    { time: "2026-09-01 09:15", user: "ADM-004", action: "Published Notes: Python Core Concepts" }
];

function $(id) { return document.getElementById(id); }

document.addEventListener("DOMContentLoaded", async () => {
    if (typeof supabase !== "undefined" && SUPABASE_URL.startsWith("https://")) {
        sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    checkSession();
});

// --- LOGIN & AUTHENTICATION ---
function switchLoginTab(role) {
    $("login-role").value = role;
    $("tab-student").className = role === "student" ? "flex-1 py-3 rounded-xl bg-violet text-white font-bold text-sm transition" : "flex-1 py-3 rounded-xl text-textmuted font-bold text-sm transition";
    $("tab-admin").className = role === "admin" ? "flex-1 py-3 rounded-xl bg-violet text-white font-bold text-sm transition" : "flex-1 py-3 rounded-xl text-textmuted font-bold text-sm transition";
}

async function handleLogin(e) {
    e.preventDefault();
    const role = $("login-role").value;
    const emailOrId = $("login-id").value.trim();

    const existingRecord = managedUsers.find(u => u.email === emailOrId || u.id === emailOrId);
    if (existingRecord && existingRecord.is_blocked) {
        showToast("Your account has been blocked by an Administrator.", "error");
        return;
    }

    if (!existingRecord) {
        managedUsers.push({ id: emailOrId, email: emailOrId, role: role, is_blocked: false });
        localStorage.setItem("eduvault_managed_users", JSON.stringify(managedUsers));
    }

    currentUser = { id: emailOrId, role: role, is_blocked: existingRecord?.is_blocked || false };
    localStorage.setItem("eduvault_user", JSON.stringify(currentUser));

    auditLogs.unshift({
        time: new Date().toISOString().replace('T', ' ').substring(0, 16),
        user: emailOrId,
        action: `Portal Access (${role})`
    });
    localStorage.setItem("eduvault_logs", JSON.stringify(auditLogs));

    showToast(`Welcome back, ${emailOrId}!`, "success");
    checkSession();
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem("eduvault_user");
    showToast("Signed out successfully.", "info");
    checkSession();
}

function checkSession() {
    if (!currentUser) {
        $("login-screen").classList.remove("hidden-section");
        $("dashboard-screen").classList.add("hidden-section");
    } else {
        $("login-screen").classList.add("hidden-section");
        $("dashboard-screen").classList.remove("hidden-section");

        $("user-display-name").innerText = `Welcome, ${currentUser.id}`;
        $("user-display-role").innerText = `Role: ${currentUser.role === 'admin' ? 'Faculty Admin' : 'Student'}`;

        if (currentUser.role === "admin") {
            $("admin-view").classList.remove("hidden-section");
            $("student-view").classList.add("hidden-section");
            renderUserManagement();
            renderAuditLogs();
        } else {
            $("student-view").classList.remove("hidden-section");
            $("admin-view").classList.add("hidden-section");
            renderNotes();
        }
    }
}

// --- USER MANAGEMENT ---
function renderUserManagement() {
    const table = $("user-management-table");
    if (!table) return;

    table.innerHTML = managedUsers.map(user => `
        <tr class="hover:bg-white/5 transition">
            <td class="py-3 font-semibold text-white">${user.id}</td>
            <td class="py-3 text-textmuted text-xs uppercase">${user.role}</td>
            <td class="py-3">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${user.is_blocked ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-mint/10 text-mint border border-mint/20'}">
                    ${user.is_blocked ? 'Blocked' : 'Active'}
                </span>
            </td>
            <td class="py-3 text-right">
                <button onclick="toggleUserBlock('${user.id}')" class="px-3 py-1 rounded-lg text-xs font-bold transition ${user.is_blocked ? 'bg-mint/20 text-mint hover:bg-mint hover:text-ink' : 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'}">
                    ${user.is_blocked ? 'Unblock Download' : 'Block User'}
                </button>
            </td>
        </tr>
    `).join("");
}

function toggleUserBlock(userId) {
    const user = managedUsers.find(u => u.id === userId);
    if (user) {
        user.is_blocked = !user.is_blocked;
        localStorage.setItem("eduvault_managed_users", JSON.stringify(managedUsers));
        showToast(`User ${userId} is now ${user.is_blocked ? 'Blocked' : 'Unblocked'}.`, "info");
        renderUserManagement();
    }
}

// --- PUBLISH NOTES ---
async function handlePublishNote(e) {
    e.preventDefault();
    const title = $("pub-title").value.trim();
    const category = $("pub-category").value;
    const desc = $("pub-desc").value.trim();
    const fileInput = $("pub-file");
    let pdfUrl = $("pub-url").value.trim();

    try {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            if (file.type !== "application/pdf") throw new Error("Only PDF documents are allowed.");

            if (sb) {
                const filePath = `notes/${Date.now()}_${file.name}`;
                const { data, error } = await sb.storage.from("notes").upload(filePath, file);
                if (error) throw error;

                const publicData = sb.storage.from("notes").getPublicUrl(filePath);
                pdfUrl = publicData.data.publicUrl;
            } else {
                pdfUrl = URL.createObjectURL(file);
            }
        }

        if (!pdfUrl) {
            pdfUrl = "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf";
        }

        notesData.unshift({
            id: String(Date.now()),
            title, category, desc,
            author: currentUser ? currentUser.id : "Faculty",
            date: new Date().toISOString().split('T')[0],
            pdf_url: pdfUrl
        });
        localStorage.setItem("eduvault_notes", JSON.stringify(notesData));

        showToast("Note and PDF published successfully!", "success");
        e.target.reset();
        renderNotes();
    } catch (err) {
        showToast(err.message, "error");
    }
}

// --- NOTES DISPLAY & DOWNLOAD ---
function renderNotes() {
    const grid = $("notes-grid");
    if (!grid) return;

    const search = $("notes-search").value.toLowerCase();
    const filter = $("notes-filter").value;

    const filtered = notesData.filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(search) || n.desc.toLowerCase().includes(search);
        const matchesCat = filter === "ALL" || n.category === filter;
        return matchesSearch && matchesCat;
    });

    grid.innerHTML = filtered.map(n => `
        <div onclick="openResourceModal('${n.id}')" class="glass rounded-2xl p-6 note-card border border-white/5 flex flex-col justify-between cursor-pointer">
            <div>
                <div class="flex justify-between items-center mb-3">
                    <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-violet/20 text-purple border border-violet/30">${n.category}</span>
                    <span class="text-xs text-textmuted">${n.date}</span>
                </div>
                <h4 class="font-bold text-lg mb-2 text-white">${n.title}</h4>
                <p class="text-textmuted text-sm mb-4">${n.desc}</p>
            </div>
            <button class="w-full py-2.5 rounded-xl bg-violet/20 hover:bg-violet text-purple hover:text-white font-bold text-xs transition">View Note</button>
        </div>
    `).join("");
}

function openResourceModal(noteId) {
    currentNote = notesData.find(n => n.id === noteId);
    if (!currentNote) return;

    $("modal-badge").innerText = currentNote.category;
    $("modal-title").innerText = currentNote.title;
    $("modal-image-container").innerHTML = `<iframe src="${currentNote.pdf_url}" class="w-full h-full rounded-xl border border-white/10"></iframe>`;

    $("resource-modal").classList.remove("hidden-section");
}

function closeResourceModal() {
    $("resource-modal").classList.add("hidden-section");
}

function handleDownloadPDF() {
    if (!currentUser) {
        showToast("Please sign in to download materials.", "error");
        return;
    }

    const userRecord = managedUsers.find(u => u.id === currentUser.id || u.email === currentUser.id);
    if (userRecord && userRecord.is_blocked) {
        showToast("Access Denied: Download permissions for your account are blocked.", "error");
        return;
    }

    if (currentNote && currentNote.pdf_url) {
        window.open(currentNote.pdf_url, "_blank");
        showToast("Downloading notes...", "success");
    }
}

// --- FAQ TOGGLE HANDLER ---
function toggleFaq(id) {
    const ans = $(`faq-ans-${id}`);
    const icon = $(`faq-icon-${id}`);

    if (ans.classList.contains("hidden-section")) {
        ans.classList.remove("hidden-section");
        icon.style.transform = "rotate(180deg)";
    } else {
        ans.classList.add("hidden-section");
        icon.style.transform = "rotate(0deg)";
    }
}

// --- CONTACT FORM HANDLER ---
function handleContactSubmit(e) {
    e.preventDefault();
    const name = $("contact-name").value.trim();
    showToast(`Thank you ${name}! Your inquiry has been sent to administration.`, "success");
    e.target.reset();
}

function renderAuditLogs() {
    const table = $("audit-log-table");
    if (!table) return;

    table.innerHTML = auditLogs.map(log => `
        <tr class="hover:bg-white/5 transition">
            <td class="py-2.5 text-textmuted text-xs">${log.time}</td>
            <td class="py-2.5 font-semibold text-white">${log.user}</td>
            <td class="py-2.5 text-textmuted">${log.action}</td>
        </tr>
    `).join("");
}

function showToast(msg, type = "info") {
    const container = $("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast glass border-l-4 ${type === 'error' ? 'border-red-400' : 'border-mint'} px-4 py-3 rounded-xl text-sm font-semibold shadow-xl`;
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}