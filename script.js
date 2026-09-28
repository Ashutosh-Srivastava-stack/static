/* ==========================================================================
   TECH TITANS LIBRARY - FIREBOOK CONTROLLER
   ========================================================================== */

const STUDENT_MASTER_KEY = "NOTES2026";
const ADMIN_MASTER_KEY = "ADMIN2026";

async function uploadPdfToGitHub(file) {
    const base64Content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });

    const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fileName: file.name,
            base64Content: base64Content
        })
    });

    const contentType = response.headers.get("content-type");
    if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            throw new Error(errorData.error || "GitHub upload failed.");
        } else {
            const errorText = await response.text();
            throw new Error(`Upload server error: ${response.status}`);
        }
    }

    const data = await response.json();
    return data.url;
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
        pdf_urls: [
            "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf"
        ]
    },
    {
        id: "2",
        title: "Internet Technology and Web Development",
        category: "ITW",
        desc: "Detailed lecture notes covering OSI Model, Firewall, and JavaScript.",
        author: "Prof. Ankita Mam",
        date: "2026-08-30",
        pdf_urls: [
            "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf",
            "https://github.com/Ashutosh-Srivastava-stack/eduvault-pdf-storage/blob/670898ca998964198e35908d3299c66ccedf6ff7/uploads/1790588893998_unit_1_ITWT-compressed.pdf"
        ]
    },
    {
        id: "3",
        title: "Emerging Technology",
        category: "ET",
        desc: "Solutions and notes on Artificial Intelligence and Machine Learning.",
        author: "Prof. Vineet Sir",
        date: "2026-08-15",
        pdf_urls: [
            "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf"
        ]
    },
    {
        id: "4",
        title: "Software Engineering",
        category: "SE",
        desc: "SDLC, Waterfall Model, and Software Design methods.",
        author: "Prof. Iqbal Sir",
        date: "2026-08-22",
        pdf_urls: [
            "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf",
            "https://github.com/Ashutosh-Srivastava-stack/eduvault-pdf-storage/blob/670898ca998964198e35908d3299c66ccedf6ff7/uploads/1790525490903_start_to_sprial-compressed.pdf"
        ]
    },
    {
        id: "5",
        title: "Operating System",
        category: "OS",
        desc: "Detailed lecture notes covering Process Scheduling, Deadlocks, and Memory Management.",
        author: "Prof. Rekh Nath Sir",
        date: "2026-08-27",
        pdf_urls: [
            "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf"
        ]
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

// --- LOGIN & AUTHENTICATION WITH DUAL MASTER KEYS ---
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
    const nameInput = $("loginName") \vert{}\vert{} $("login-id");
    const passInput = $("loginPass");

    const name = nameInput ? nameInput.value.trim() : "";
    const pass = passInput ? passInput.value.trim() : "";

    if (!name) {
        showToast("Please enter a valid Name / ID.", "error");
        return;
    }

    // Role-specific Master Key Validation
    if (role === "admin") {
        if (pass !== ADMIN_MASTER_KEY) {
            showToast("Invalid Admin Key! Please enter the correct admin password.", "error");
            return;
        }
    } else {
        if (pass !== STUDENT_MASTER_KEY) {
            showToast("Invalid Student Key! Please enter the correct access code.", "error");
            return;
        }
    }

    try {
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

        const nameElem = $("user-display-name") \vert{}\vert{} $("userDisplayName");
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
        }
        renderNotes();
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

// --- PUBLISH OR APPEND NOTE TO EXISTING SUBJECT BOX ---
async function handlePublishNote(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    const title = $("pub-title") ? $("pub-title").value.trim() : "";
    const category = $("pub-category") ? $("pub-category").value.trim().toUpperCase() : "GEN";
    const desc = $("pub-desc") ? $("pub-desc").value.trim() : "";
    const fileInput = $("pub-file");
    const rawUrlInput = $("pub-url") ? $("pub-url").value.trim() : "";

    const submitBtn = e.target ? e.target.querySelector('button[type="submit"]') : null;
    const originalBtnText = submitBtn ? submitBtn.innerText : "Publish";

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "Uploading...";
        }

        let collectedUrls = [];

        if (rawUrlInput) {
            const parsedUrls = rawUrlInput.split(/[\n,]+/).map(u => u.trim()).filter(u => u.length > 0);
            collectedUrls.push(...parsedUrls);
        }

        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            if (file.type !== "application/pdf") {
                throw new Error("Only PDF documents are allowed.");
            }
            
            const uploadedUrl = await uploadPdfToGitHub(file);
            collectedUrls.push(uploadedUrl);
        }

        if (collectedUrls.length === 0) {
            throw new Error("Please upload a PDF file or enter at least one PDF link.");
        }

        // Match card category case-insensitively
        let existingNoteIndex = notesData.findIndex(n => String(n.category).trim().toUpperCase() === category);

        if (existingNoteIndex !== -1) {
            let existingNote = notesData[existingNoteIndex];

            if (!Array.isArray(existingNote.pdf_urls)) {
                existingNote.pdf_urls = existingNote.pdf_url ? [existingNote.pdf_url] : [];
            }

            existingNote.pdf_urls.push(...collectedUrls);
            if (desc) existingNote.desc = desc;
            existingNote.date = new Date().toISOString().split('T')[0];

            showToast(`Added link to ${existingNote.title}!`, "success");
        } else {
            const newNote = {
                id: String(Date.now()),
                title: title || `${category} Module Notes`,
                category: category,
                desc: desc || "Uploaded resource documents.",
                author: currentUser ? currentUser.id : "Faculty",
                date: new Date().toISOString().split('T')[0],
                pdf_urls: collectedUrls
            };

            notesData.unshift(newNote);
            showToast("Created new subject card with uploaded PDF!", "success");
        }

        localStorage.setItem("eduvault_notes", JSON.stringify(notesData));

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

// --- NOTES DISPLAY ---
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

    const isAdmin = currentUser && currentUser.role === "admin";

    grid.innerHTML = filtered.map(n => `
        <div class="glass rounded-2xl p-6 note-card border border-white/5 flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-center mb-3">
                    <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-violet/20 text-purple border border-violet/30">${n.category}</span>
                    
                    <div class="flex items-center gap-3">
                        <span class="text-xs text-textmuted">${n.date}</span>
                        ${isAdmin ? `
                        <!-- DELETE CARD (ADMIN ONLY) -->
                        <button onclick="event.stopPropagation(); deleteNoteCard('${n.id}')" title="Delete Card" class="text-textmuted hover:text-red-400 transition p-1">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
                <h4 class="font-bold text-lg mb-2 text-white">${n.title}</h4>
                <p class="text-textmuted text-sm mb-4">${n.desc}</p>
            </div>
            
            <button onclick="openResourceModal('${n.id}')" class="w-full py-2.5 rounded-xl bg-violet/20 hover:bg-violet text-purple hover:text-white font-bold text-xs transition">View Note</button>
        </div>
    `).join("");
}

// --- DELETE A SUBJECT CARD ---
function deleteNoteCard(noteId) {
    if (!currentUser || currentUser.role !== "admin") {
        showToast("Admin access required to delete cards.", "error");
        return;
    }

    if (!confirm("Are you sure you want to delete this subject card?")) {
        return;
    }

    notesData = notesData.filter(n => String(n.id) !== String(noteId));
    localStorage.setItem("eduvault_notes", JSON.stringify(notesData));
    
    showToast("Subject card removed successfully.", "success");
    renderNotes();
}

// --- OPEN RESOURCE MODAL WITH DOWNLOAD LINKS ---
function openResourceModal(noteId) {
    currentNote = notesData.find(n => String(n.id) === String(noteId));
    if (!currentNote) return;

    const modalBadge = $("modal-badge");
    const modalTitle = $("modal-title");
    const modalDesc = $("modal-desc");
    const linksContainer = $("pdf-links-container");

    if (modalBadge) modalBadge.innerText = currentNote.category;
    if (modalTitle) modalTitle.innerText = currentNote.title;
    if (modalDesc) modalDesc.innerText = currentNote.desc || "Select a document below to download directly.";

    let urlsList = [];
    if (Array.isArray(currentNote.pdf_urls)) {
        urlsList = currentNote.pdf_urls;
    } else if (currentNote.pdf_url) {
        urlsList = [currentNote.pdf_url];
    }

    if (linksContainer) {
        if (urlsList.length === 0) {
            linksContainer.innerHTML = `<p class="text-textmuted text-sm py-4">No download links available for this module.</p>`;
        } else {
            linksContainer.innerHTML = urlsList.map((url, index) => {
                const fileName = url.split('/').pop().split('?')[0] || `Document Part ${index + 1}`;
                
                return `
                    <div class="glass p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-4 hover:border-violet/40 transition">
                        <div class="flex items-center gap-3 overflow-hidden">
                            <div class="w-10 h-10 rounded-xl bg-violet/20 text-purple flex items-center justify-center shrink-0">
                                <i class="fa-solid fa-file-pdf text-lg"></i>
                            </div>
                            <div class="truncate">
                                <div class="text-sm font-bold text-white truncate">Part ${index + 1}: ${fileName}</div>
                                <div class="text-[11px] text-textmuted truncate">${url}</div>
                            </div>
                        </div>
                        <button onclick="downloadSinglePdf('${encodeURIComponent(url)}')" class="shrink-0 px-4 py-2.5 rounded-xl bg-mint/20 hover:bg-mint text-mint hover:text-ink font-bold text-xs transition flex items-center gap-2 border border-mint/30">
                            <i class="fa-solid fa-download"></i> Download PDF
                        </button>
                    </div>
                `;
            }).join("");
        }
    }

    const modal = $("resource-modal");
    if (modal) modal.classList.remove("hidden-section");
}

// --- SINGLE FILE DOWNLOAD HANDLER ---
function downloadSinglePdf(encodedUrl) {
    if (!currentUser) {
        showToast("Please sign in to download materials.", "error");
        return;
    }

    const userRecord = managedUsers.find(u => u.id === currentUser.id || u.email === currentUser.id);
    if (userRecord && userRecord.is_blocked) {
        showToast("Access Denied: Download permissions for your account are blocked.", "error");
        return;
    }

    const url = decodeURIComponent(encodedUrl);
    window.open(url, "_blank");
    showToast("Opening document download link...", "success");
}

function closeResourceModal() {
    const modal = $("resource-modal");
    if (modal) modal.classList.add("hidden-section");
}

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
