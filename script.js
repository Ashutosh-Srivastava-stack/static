/* ==========================================================================
   TECH TITANS LIBRARY - FIREBOOK CONTROLLER
   ========================================================================== */

const MASTER_KEY = "NOTES2026";

const GITHUB_USERNAME = "Ashutosh-Srivastava-stack";
const GITHUB_REPO = "eduvault-pdf-storage";
const GITHUB_PAT = "YOUR_FINE_GRAINED_TOKEN_HERE"; // Fine-grained Personal Access Token

async function uploadPdfToGitHub(file) {
    // 1. Convert file to base64
    const reader = new FileReader();
    const base64Promise = new Promise((resolve) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
    });
    const base64Content = await base64Promise;

    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

    // 2. Call your secure Vercel Serverless Function
    const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            fileName,
            base64Content
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Failed to upload PDF via serverless function.");
    }

    // 3. Return the public Raw URL
    return data.pdfUrl;
}

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
    },
    {
        id: "2",
        title: "Internet Technology and Web Development",
        category: "ITW",
        desc: "Detailed lecture notes covering OSI Model, Firewall, and JavaScript.",
        author: "Prof. Ankita Mam",
        date: "2026-08-30",
        pdf_url: "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf"
    },
    {
        id: "3",
        title: "Emerging Technology",
        category: "ET",
        desc: "Solutions and notes on Artificial Intelligence and Machine Learning.",
        author: "Prof. Vineet Sir",
        date: "2026-08-15",
        pdf_url: "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf"
    },
    {
        id: "4",
        title: "Software Engineering",
        category: "SE",
        desc: "SDLC, Waterfall Model, and Software Design methods.",
        author: "Prof. Iqbal Sir",
        date: "2026-08-22",
        pdf_url: "https://github.com/Ashutosh-Srivastava-stack/eduvault-pdf-storage/raw/refs/heads/main/start%20to%20sprial.zip"
    },
    {
        id: "5",
        title: "Operating System",
        category: "OS",
        desc: "Detailed lecture notes covering Process Scheduling, Deadlocks, and Memory Management.",
        author: "Prof. Rekh Nath Sir",
        date: "2026-08-27",
        pdf_url: "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf"
    }
];

let auditLogs = JSON.parse(localStorage.getItem("eduvault_logs")) || [
    { time: "2026-09-01 09:12", user: "STU-8821", action: "User Sign In" },
    { time: "2026-09-01 09:15", user: "ADM-004", action: "Published Notes: Python Core Concepts" }
];

function $(id) { return document.getElementById(id); }

document.addEventListener("DOMContentLoaded", () => {
    checkSession();
});

// --- REGISTRATION ---
async function handleRegister() {
    const nameElem = $("regName");
    const keyElem = $("regKey");
    const res = $("regResult");

    const name = nameElem ? nameElem.value.trim() : "";
    const key = keyElem ? keyElem.value.trim() : "";

    if (!res) return;

    if (key !== MASTER_KEY) {
        res.className = "error text-red-400 font-semibold text-xs mt-2";
        res.innerText = "Invalid Invitation Key!";
        return;
    }
    if (!name) {
        res.className = "error text-red-400 font-semibold text-xs mt-2";
        res.innerText = "Please enter your name.";
        return;
    }

    const generatedPassword = Math.random().toString(36).slice(-8);

    try {
        res.className = "success text-mint font-semibold text-xs mt-2";
        res.innerHTML = `<p>Registration Successful! Your Passkey: <strong>${generatedPassword}</strong></p>`;
    } catch (err) {
        res.className = "error text-red-400 font-semibold text-xs mt-2";
        res.innerText = "Error: " + err.message;
    }
}

// --- LOGIN & AUTHENTICATION ---
function switchLoginTab(role) {
    const roleInput = $("login-role");
    const tabStudent = $("tab-student");
    const tabAdmin = $("tab-admin");

    if (roleInput) roleInput.value = role;
    if (tabStudent) {
        tabStudent.className = role === "student" 
            ? "flex-1 py-3 rounded-xl bg-violet text-white font-bold text-sm transition" 
            : "flex-1 py-3 rounded-xl text-textmuted font-bold text-sm transition";
    }
    if (tabAdmin) {
        tabAdmin.className = role === "admin" 
            ? "flex-1 py-3 rounded-xl bg-violet text-white font-bold text-sm transition" 
            : "flex-1 py-3 rounded-xl text-textmuted font-bold text-sm transition";
    }
}

async function handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();

    const role = $("login-role") ? $("login-role").value : "student";
    const nameInput = $("loginName") || $("login-id");
    const passInput = $("loginPass");
    const res = $("loginResult");

    const name = nameInput ? nameInput.value.trim() : "";
    const pass = passInput ? passInput.value.trim() : "";

    if (!name) {
        showToast("Please enter a valid Name / ID.", "error");
        return;
    }

    try {
        // Check local block list fallback
        const existingRecord = managedUsers.find(u => u.email === name || u.id === name);
        if (existingRecord && existingRecord.is_blocked) {
            showToast("Your account has been blocked by an Administrator.", "error");
            return;
        }

        if (!existingRecord) {
            managedUsers.push({ id: name, email: name, role: role, is_blocked: false });
            localStorage.setItem("eduvault_managed_users", JSON.stringify(managedUsers));
        }

        currentUser = { id: name, role: role, is_blocked: existingRecord?.is_blocked || false };
        localStorage.setItem("eduvault_user", JSON.stringify(currentUser));

        auditLogs.unshift({
            time: new Date().toISOString().replace('T', ' ').substring(0, 16),
            user: name,
            action: `Portal Access (${role})`
        });
        localStorage.setItem("eduvault_logs", JSON.stringify(auditLogs));

        showToast(`Welcome back, ${name}!`, "success");
        checkSession();

    } catch (err) {
        if (res) res.innerText = "Login error: " + err.message;
        showToast("Login error: " + err.message, "error");
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem("eduvault_user");
    showToast("Signed out successfully.", "info");
    checkSession();
}

function checkSession() {
    const loginScreen = $("login-screen");
    const dashboardScreen = $("dashboard-screen");

    if (!currentUser) {
        if (loginScreen) loginScreen.classList.remove("hidden-section");
        if (dashboardScreen) dashboardScreen.classList.add("hidden-section");
    } else {
        if (loginScreen) loginScreen.classList.add("hidden-section");
        if (dashboardScreen) dashboardScreen.classList.remove("hidden-section");

        const nameElem = $("user-display-name") || $("userDisplayName");
        const roleElem = $("user-display-role");
        if (nameElem) nameElem.innerText = currentUser.id;
        if (roleElem) roleElem.innerText = `Role: ${currentUser.role === 'admin' ? 'Faculty Admin' : 'Student'}`;

        const adminView = $("admin-view");
        const studentView = $("student-view");

        if (currentUser.role === "admin") {
            if (adminView) adminView.classList.remove("hidden-section");
            if (studentView) studentView.classList.add("hidden-section");
            renderUserManagement();
            renderAuditLogs();
        } else {
            if (studentView) studentView.classList.remove("hidden-section");
            if (adminView) adminView.classList.add("hidden-section");
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

// --- PUBLISH NOTE ---
// --- PUBLISH NOTE WITH GITHUB UPLOAD ---
async function handlePublishNote(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    const title = $("pub-title") ? $("pub-title").value.trim() : "";
    const category = $("pub-category") ? $("pub-category").value : "GEN";
    const desc = $("pub-desc") ? $("pub-desc").value.trim() : "";
    const fileInput = $("pub-file");
    let pdfUrl = $("pub-url") ? $("pub-url").value.trim() : "";

    const submitBtn = e.target ? e.target.querySelector('button[type="submit"]') : null;
    const originalBtnText = submitBtn ? submitBtn.innerText : "Publish";

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "Uploading to GitHub...";
        }

        // Upload PDF directly to GitHub Repository via API
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            const file = fileInput.files[0];

            if (file.type !== "application/pdf") {
                throw new Error("Only PDF documents are allowed.");
            }

            // Calls your GitHub upload function!
            pdfUrl = await uploadPdfToGitHub(file);
        }

        if (!pdfUrl) {
            throw new Error("Please select a PDF file or enter an external PDF link.");
        }

        const newNote = {
            id: String(Date.now()),
            title: title || "Untitled Note",
            category,
            desc,
            author: currentUser ? currentUser.id : "Faculty",
            date: new Date().toISOString().split('T')[0],
            pdf_url: pdfUrl
        };

        notesData.unshift(newNote);
        localStorage.setItem("eduvault_notes", JSON.stringify(notesData));

        showToast("Note published and PDF uploaded to GitHub!", "success");
        if (e.target && typeof e.target.reset === "function") e.target.reset();
        
        renderNotes();

    } catch (err) {
        console.error("Publish Error:", err);
        showToast(err.message || "Failed to publish notes.", "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        }
    }
}
// --- NOTES DISPLAY & DOWNLOAD ---
function renderNotes() {
    const grid = $("notes-grid");
    if (!grid) return;

    const searchElem = $("notes-search");
    const filterElem = $("notes-filter");

    const search = searchElem ? searchElem.value.toLowerCase() : "";
    const filter = filterElem ? filterElem.value : "ALL";

    const filtered = notesData.filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(search) || n.desc.toLowerCase().includes(search);
        const matchesCat = filter === "ALL" || n.category === filter;
        return matchesSearch && matchesCat;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center text-textmuted py-8">No matching notes found.</div>`;
        return;
    }

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
    currentNote = notesData.find(n => String(n.id) === String(noteId));
    if (!currentNote) return;

    const modalBadge = $("modal-badge");
    const modalTitle = $("modal-title");
    const modalImageContainer = $("modal-image-container");

    if (modalBadge) modalBadge.innerText = currentNote.category;
    if (modalTitle) modalTitle.innerText = currentNote.title;
    if (modalImageContainer) {
        modalImageContainer.innerHTML = `<iframe src="${currentNote.pdf_url}" class="w-full h-full rounded-xl border border-white/10" style="min-height: 400px;"></iframe>`;
    }

    const modal = $("resource-modal");
    if (modal) modal.classList.remove("hidden-section");
}

function closeResourceModal() {
    const modal = $("resource-modal");
    if (modal) modal.classList.add("hidden-section");
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

    if (ans) {
        if (ans.classList.contains("hidden-section")) {
            ans.classList.remove("hidden-section");
            if (icon) icon.style.transform = "rotate(180deg)";
        } else {
            ans.classList.add("hidden-section");
            if (icon) icon.style.transform = "rotate(0deg)";
        }
    }
}

// --- CONTACT FORM HANDLER ---
function handleContactSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const nameElem = $("contact-name");
    const name = nameElem ? nameElem.value.trim() : "Student";
    showToast(`Thank you ${name}! Your inquiry has been sent to administration.`, "success");
    if (e.target && typeof e.target.reset === "function") e.target.reset();
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
    if (!container) return;
    
    const toast = document.createElement("div");
    toast.className = `toast glass border-l-4 ${type === 'error' ? 'border-red-400' : 'border-mint'} px-4 py-3 rounded-xl text-sm font-semibold shadow-xl my-2`;
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
