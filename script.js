/* ==========================================================================
   EDU VAULT V2 - FULLY MERGED PLATFORM SCRIPT
   ========================================================================== */

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = "https://jkudnrnzlffcgryeaewu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprdWRucm56bGZmY2dyeWVhZXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMDY5NDksImV4cCI6MjEwNDc4Mjk0OX0.GiHyxZg2jLBCtfUSaqmeoMi58DVkSjROs7pDQLad8IY";

let sb = null;
let currentUser = JSON.parse(localStorage.getItem("eduvault_user")) || null;
let currentProfile = null;
let authMode = "login";
let adminSection = "overview";
let currentNote = null;

// --- FALLBACK / DEMO STATE DATA ---
let notesData = JSON.parse(localStorage.getItem("eduvault_notes")) || [
    {
        id: 1,
        title: "Python",
        category: "PY",
        desc: "Comprehensive guide to Red-Black Trees, Graph Traversal Algorithms, and Dynamic Programming.",
        author: "Prof. Kailash Sir",
        date: "2026-08-28",
        topics: [
            {
                title: "Module 1: Red-Black Trees & Graphs",
                pages: [
                    "https://placehold.co/800x1050/151E35/F4F7FF?text=Python+Notes+-+Page+1%0ARed-Black+Tree+Rotations",
                    "https://placehold.co/800x1050/151E35/F4F7FF?text=Python+Notes+-+Page+2%0AGraph+Algorithms+(BFS/DFS)"
                ]
            },
            {
                title: "Module 2: Dynamic Programming",
                pages: [
                    "https://placehold.co/800x1050/151E35/F4F7FF?text=Python+Notes+-+Page+3%0ADynamic+Programming+State+Tables"
                ]
            }
        ]
    },
    {
        id: 2,
        title: "Internet Technology and Web Development",
        category: "ITW",
        desc: "Detailed lecture notes covering OSI Model, Firewall, and Java Script.",
        author: "Prof. Ankita Mam",
        date: "2026-08-30",
        topics: [
            {
                title: "Module 1: Web Protocols & Architecture",
                pages: [
                    "https://placehold.co/800x1050/151E35/F4F7FF?text=ITW+Notes+-+Page+1%0AHTTP/HTTPS+Protocol+Diagrams"
                ]
            },
            {
                title: "Module 2: Frontend & DOM Manipulation",
                pages: [
                    "https://placehold.co/800x1050/151E35/F4F7FF?text=ITW+Notes+-+Page+2%0AJavaScript+Execution+Context"
                ]
            }
        ]
    },
    {
        id: 3,
        title: "Emerging Technology",
        category: "ET",
        desc: "Solutions and notes on Artifical Intelligence and Machine Learning",
        author: "Prof. Vineet Sir",
        date: "2026-08-15",
        topics: [
            {
                title: "Module 1: Quantum Computing Foundations",
                pages: [
                    "https://placehold.co/800x1050/151E35/F4F7FF?text=Emerging+Tech+-+Page+1%0ASchr%C3%B6dinger+Equation"
                ]
            }
        ]
    },
    {
        id: 4,
        title: "Software Engineering",
        category: "SE",
        desc: "SDLC, WATERFALL MODEL, Software Designing methods",
        author: "Prof. Iqbal Sir",
        date: "2026-08-22",
        topics: [
            {
                title: "Module 1: SDLC & Agile Frameworks",
                pages: [
                    "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf"
                ]
            }
        ]
    },
    {
        id: 5,
        title: "Operating System",
        category: "OS",
        desc: "Detailed lecture notes covering Process Scheduling, Deadlocks, and Memory Management.",
        author: "Prof. Rekh Nath Sir",
        date: "2026-08-27",
        topics: [
            {
                title: "Module 1: Process Management & Scheduling",
                pages: [
                    "https://placehold.co/800x1050/151E35/F4F7FF?text=Operating+System+-+Page+1%0AProcess+Control+Blocks"
                ]
            }
        ]
    }
];

let auditLogs = JSON.parse(localStorage.getItem("eduvault_logs")) || [
    { time: "2026-09-01 09:12", user: "STU-8821", action: "User Sign In", status: "Success" },
    { time: "2026-09-01 09:15", user: "ADM-004", action: "Published Note #4", status: "Verified" },
    { time: "2026-09-01 09:30", user: "STU-1042", action: "Downloaded Physics Notes", status: "Success" }
];

// --- HELPER FUNCTIONS ---
function configured() {
    return SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";
}

function $(id) { return document.getElementById(id); }

function esc(v = "") {
    return String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
}

function requireConfig() {
    if (!configured()) {
        showToast("Add your Supabase URL and anon key first.", "error");
        return false;
    }
    return true;
}

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", async () => {
    animateCounters();
    if ($("year")) $("year").textContent = new Date().getFullYear();

    if (configured() && typeof supabase !== "undefined") {
        sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
            await loadSession(session.user);
        } else {
            checkSession();
            await loadPublicNotes();
        }

        sb.auth.onAuthStateChange(async (_event, session) => {
            if (session) {
                await loadSession(session.user);
            } else {
                resetUI();
            }
        });
    } else {
        checkSession();
    }
});

// --- SESSION MANAGEMENT ---
async function loadSession(user) {
    currentUser = { id: user.email || user.id, role: "student" };
    const { data, error } = await sb.from("profiles").select("*").eq("id", user.id).single();
    if (!error && data) {
        currentProfile = data;
        currentUser.role = data.role || "student";
        if (data.status === "banned") {
            await sb.auth.signOut();
            showToast("Your account has been banned.", "error");
            return;
        }
    }
    localStorage.setItem("eduvault_user", JSON.stringify(currentUser));
    await recordVisit("login");
    updateNav();
    checkSession();
}

function resetUI() {
    currentUser = null;
    currentProfile = null;
    localStorage.removeItem("eduvault_user");
    updateNav();
    checkSession();
    loadPublicNotes();
}

function updateNav() {
    const n = $("nav-actions");
    if (!n) return;
    if (!currentUser) {
        n.innerHTML = `<div class="nav-buttons"><button onclick="showAuth('login')">Login</button><button class="primary" onclick="showAuth('signup')">Student Sign Up</button></div>`;
    } else {
        n.innerHTML = `<div class="nav-buttons"><button onclick="scrollToApp()">Dashboard</button><button class="primary" onclick="handleLogout()">Logout</button></div>`;
    }
}

function scrollToApp() {
    if ($("app")) $("app").scrollIntoView({ behavior: "smooth" });
}

// --- AUTH MODALS & TAB NAVIGATION ---
function showAuth(mode = "login") {
    authMode = mode;
    switchAuth(mode);
    if ($("auth-modal")) $("auth-modal").classList.remove("hidden");
}

function closeAuth() {
    if ($("auth-modal")) $("auth-modal").classList.add("hidden");
}

function switchAuth(mode) {
    authMode = mode;
    if ($("login-tab")) $("login-tab").classList.toggle("active", mode === "login");
    if ($("signup-tab")) $("signup-tab").classList.toggle("active", mode === "signup");
    if ($("auth-name")) {
        $("auth-name").classList.toggle("hidden", mode !== "signup");
        $("auth-name").required = mode === "signup";
    }
    if ($("auth-title")) $("auth-title").textContent = mode === "login" ? "Welcome back" : "Create your student account";
    if ($("auth-subtitle")) $("auth-subtitle").textContent = mode === "login" ? "Sign in to access your Edu Vault." : "Student accounts can browse published notes.";
    if ($("auth-submit")) $("auth-submit").textContent = mode === "login" ? "Login" : "Create Account";
}

async function submitAuth(e) {
    e.preventDefault();
    if (!requireConfig()) return;
    const email = $("auth-email").value.trim();
    const password = $("auth-password").value;

    try {
        if (authMode === "signup") {
            const name = $("auth-name").value.trim();
            const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name } } });
            if (error) throw error;
            showToast(data.session ? "Account created!" : "Account created. Check your email if confirmation is required.", "success");
            if (data.session) closeAuth();
        } else {
            const { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
            closeAuth();
            await loadSession(data.user);
        }
    } catch (err) {
        showToast(err.message, "error");
    }
}

function switchLoginTab(role) {
    const tabStudent = $("tab-student");
    const tabAdmin = $("tab-admin");
    const idLabel = $("id-label");
    const idInput = $("login-id");
    const roleInput = $("login-role");

    if (!roleInput) return;
    roleInput.value = role;

    if (role === "student") {
        tabStudent.className = "flex-1 py-3 rounded-xl bg-violet text-white font-bold text-sm transition";
        tabAdmin.className = "flex-1 py-3 rounded-xl text-textmuted font-bold text-sm transition";
        if (idLabel) idLabel.innerText = "Student ID";
        if (idInput) idInput.placeholder = "e.g. STU-8821";
    } else {
        tabAdmin.className = "flex-1 py-3 rounded-xl bg-violet text-white font-bold text-sm transition";
        tabStudent.className = "flex-1 py-3 rounded-xl text-textmuted font-bold text-sm transition";
        if (idLabel) idLabel.innerText = "Faculty Admin Code";
        if (idInput) idInput.placeholder = "e.g. ADM-004";
    }
}

// --- PREDEFINED VALID PASSKEYS ---
const STUDENT_KEY = "BCA2026";
const ADMIN_KEY = "ADMIN2026";

function handleLogin(e) {
    e.preventDefault(); // Prevents page refresh

    const role = document.getElementById("login-role").value;
    const nameOrId = document.getElementById("login-id").value.trim();
    const enteredKey = document.getElementById("login-pass").value.trim();

    // 1. Verify Passkey based on Role
    if (role === "student" && enteredKey !== STUDENT_KEY) {
        showToast("Invalid Student Passkey!", "error");
        return;
    }

    if (role === "admin" && enteredKey !== ADMIN_KEY) {
        showToast("Invalid Admin Passkey!", "error");
        return;
    }

    // 2. Set current user session
    currentUser = { 
        id: nameOrId, 
        role: role 
    };
    localStorage.setItem("eduvault_user", JSON.stringify(currentUser));

    // 3. Add to system audit log
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    auditLogs.unshift({
        time: now,
        user: nameOrId,
        action: role === 'admin' ? "Admin Access Granted" : "Student Portal Access",
        status: "Success"
    });
    localStorage.setItem("eduvault_logs", JSON.stringify(auditLogs));

    showToast(`Welcome, ${nameOrId}!`, "success");

    // 4. Update the screen view automatically
    checkSession();
}

async function handleLogout() {
    if (sb) await sb.auth.signOut();
    currentUser = null;
    currentProfile = null;
    localStorage.removeItem("eduvault_user");
    showToast("Signed out successfully.", "info");
    checkSession();
}

// --- UI DASHBOARD CONTROL ---
function checkSession() {
    const loginScreen = $("login-screen");
    const dashboardScreen = $("dashboard-screen");
    const studentView = $("student-view");
    const adminView = $("admin-view");

    if (!loginScreen || !dashboardScreen) return;

    if (!currentUser) {
        loginScreen.classList.remove("hidden-section");
        dashboardScreen.classList.add("hidden-section");
    } else {
        loginScreen.classList.add("hidden-section");
        dashboardScreen.classList.remove("hidden-section");

        if ($("user-display-name")) $("user-display-name").innerText = `Welcome, ${currentUser.id}`;
        if ($("user-display-role")) $("user-display-role").innerText = `Role: ${currentUser.role === 'admin' ? 'Faculty Admin' : 'Student Scholar'}`;

        if (currentUser.role === "admin") {
            if (adminView) adminView.classList.remove("hidden-section");
            if (studentView) studentView.classList.add("hidden-section");
            renderAuditLogs();
        } else {
            if (studentView) studentView.classList.remove("hidden-section");
            if (adminView) adminView.classList.add("hidden-section");
            renderNotes();
        }
    }
}

// --- VISUAL UI EFFECTS ---
function toggleMobileMenu() {
    const menu = $("mobile-menu");
    const icon = $("hamburger-icon");
    if (!menu || !icon) return;
    menu.classList.toggle("hidden");
    icon.className = menu.classList.contains("hidden") ? "fa-solid fa-bars" : "fa-solid fa-xmark";
}

function animateCounters() {
    const counters = document.querySelectorAll(".stat-counter");
    counters.forEach(counter => {
        const target = +counter.getAttribute("data-target");
        let count = 0;
        const speed = Math.max(1, target / 40);

        const update = () => {
            count += speed;
            if (count < target) {
                counter.innerText = Math.ceil(count);
                setTimeout(update, 30);
            } else {
                counter.innerText = target + (target === 99 ? "%" : "+");
            }
        };
        update();
    });
}

function showToast(message, type = "info") {
    const container = $("toast-container") || $("toast");
    if (!container) return;
    const toastEl = document.createElement("div");

    let icon = "fa-info-circle";
    let borderColor = "border-violet";
    if (type === "success") { icon = "fa-circle-check"; borderColor = "border-mint"; }
    if (type === "error") { icon = "fa-circle-exclamation"; borderColor = "border-red-400"; }

    toastEl.className = `toast glass border-l-4 ${borderColor} px-5 py-4 rounded-xl text-sm font-semibold flex items-center gap-3 shadow-2xl`;
    toastEl.innerHTML = `<i class="fa-solid ${icon} text-purple"></i> <span>${esc(message)}</span>`;

    container.appendChild(toastEl);
    setTimeout(() => { toastEl.remove(); }, 3500);
}

// --- PUBLIC & STUDENT NOTES RENDERING ---
async function loadPublicNotes() {
    if (!sb) return;
    let q = sb.from("notes").select("*").eq("published", true).order("created_at", { ascending: false });
    const search = $("public-search") ? $("public-search").value.trim() : "";
    const subject = $("public-subject") ? $("public-subject").value : "";
    if (search) q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    if (subject) q = q.eq("subject", subject);
    
    const { data, error } = await q;
    if (!error && data && data.length > 0) {
        notesData = data.map(n => ({
            id: n.id,
            title: n.title,
            category: n.subject,
            desc: n.description,
            author: n.created_by || "Faculty",
            date: new Date(n.created_at).toISOString().split('T')[0],
            topics: [{ title: "Module 1: Complete PDF Resource", pages: [n.file_url] }]
        }));
        if ($("stat-notes")) $("stat-notes").textContent = data.length;
    }
    renderNotes();
}

async function renderNotes() {
    const grid = $("notes-grid") || $("student-notes");
    if (!grid) return;

    const searchInput = $("notes-search") || $("student-search");
    const filterInput = $("notes-filter") || $("student-subject");

    const search = searchInput ? searchInput.value.toLowerCase() : "";
    const filter = filterInput ? filterInput.value : "ALL";

    const filtered = notesData.filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(search) || (note.desc && note.desc.toLowerCase().includes(search));
        const matchesCategory = filter === "ALL" || filter === "" || note.category === filter;
        return matchesSearch && matchesCategory;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 glass rounded-2xl text-textmuted">
                <i class="fa-solid fa-folder-open text-4xl mb-3 text-purple"></i>
                <p>No matching academic notes found.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(note => `
        <div onclick="openResourceModal('${note.id}')" class="glass rounded-2xl p-6 note-card border border-white/5 flex flex-col justify-between cursor-pointer group">
            <div>
                <div class="flex justify-between items-center mb-3">
                    <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet/20 text-purple border border-violet/30">
                        ${esc(note.category)}
                    </span>
                    <span class="text-xs text-textmuted">${esc(note.date)}</span>
                </div>
                <h4 class="font-bold text-lg mb-2 text-white group-hover:text-purple transition">${esc(note.title)}</h4>
                <p class="text-textmuted text-sm leading-relaxed mb-4">${esc(note.desc || 'Comprehensive study materials and lecture documents.')}</p>
            </div>
            <div class="pt-4 border-t border-white/5 flex items-center justify-between">
                <span class="text-xs text-textmuted italic">By ${esc(note.author)}</span>
                <button onclick="event.stopPropagation(); openResourceModal('${note.id}')" class="px-4 py-2 rounded-xl bg-violet/20 hover:bg-violet text-purple hover:text-white font-semibold text-xs transition flex items-center gap-2">
                    <i class="fa-solid fa-book-open"></i> Access
                </button>
            </div>
        </div>
    `).join("");
}

// --- RESOURCE MODAL & SUPABASE PDF READER ---
function openResourceModal(noteId) {
    currentNote = notesData.find(n => String(n.id) === String(noteId));
    if (!currentNote) return;

    if ($("modal-badge")) $("modal-badge").innerText = currentNote.category;
    if ($("modal-title")) $("modal-title").innerText = currentNote.title;

    const topicListContainer = $("modal-topic-list");
    if (topicListContainer) {
        if (currentNote.topics && currentNote.topics.length > 0) {
            topicListContainer.innerHTML = currentNote.topics.map((topic, index) => `
                <button onclick="selectTopic(${index})" id="topic-btn-${index}" class="w-full text-left px-4 py-3 rounded-xl border text-sm transition ${index === 0 ? 'bg-violet/20 border-violet text-white font-bold' : 'border-white/5 hover:bg-panel text-textmuted'}">
                    <i class="fa-solid fa-file-pdf mr-2 text-purple"></i> ${esc(topic.title)}
                </button>
            `).join("");
            selectTopic(0);
        } else {
            topicListContainer.innerHTML = `<div class="text-xs text-textmuted p-2">No topics available.</div>`;
            $("modal-image-container").innerHTML = `<div class="text-textmuted text-center py-12">No document previews attached.</div>`;
        }
    }

    if ($("resource-modal")) $("resource-modal").classList.remove("hidden-section");
}

function selectTopic(index) {
    if (!currentNote || !currentNote.topics[index]) return;

    currentNote.topics.forEach((_, i) => {
        const btn = $(`topic-btn-${i}`);
        if (btn) {
            btn.className = i === index 
                ? "w-full text-left px-4 py-3 rounded-xl bg-violet/20 border border-violet text-white font-bold text-sm transition"
                : "w-full text-left px-4 py-3 rounded-xl border border-white/5 hover:bg-panel text-textmuted text-sm transition";
        }
    });

    const topic = currentNote.topics[index];
    if ($("active-topic-title")) $("active-topic-title").innerText = topic.title;

    const container = $("modal-image-container");
    if (container) {
        container.innerHTML = topic.pages.map(pdfUrl => `
            <div class="glass rounded-2xl p-4 border border-white/10 shadow-2xl flex flex-col items-center h-[75vh]">
                <div class="w-full flex justify-between items-center text-xs text-textmuted mb-3 px-2">
                    <span>PDF Viewer</span>
                    <a href="${esc(pdfUrl)}" target="_blank" rel="noopener" class="text-purple hover:underline flex items-center gap-1">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Open External
                    </a>
                </div>
                <iframe src="${esc(pdfUrl)}" class="w-full h-full rounded-xl border border-white/5"></iframe>
            </div>
        `).join("");
    }
}

function closeResourceModal() {
    if ($("resource-modal")) $("resource-modal").classList.add("hidden-section");
}

// --- ADMIN PUBLISHING & SUPABASE UPLOAD ---
async function handlePublishNote(e) {
    e.preventDefault();
    const title = $("pub-title").value.trim();
    const category = $("pub-category").value.trim();
    const desc = $("pub-desc").value.trim();
    const fileInput = $("pub-file");
    
    let pdfUrl = $("pub-url") ? $("pub-url").value.trim() : null;

    try {
        if (fileInput && fileInput.files[0]) {
            const file = fileInput.files[0];
            if (file.type !== "application/pdf") throw new Error("Only PDF files are supported.");
            if (file.size > 10 * 1024 * 1024) throw new Error("PDF file must be 10MB or smaller.");

            if (sb) {
                const path = `${currentUser.id || 'admin'}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
                const up = await sb.storage.from("notes").upload(path, file, { contentType: "application/pdf", upsert: false });
                if (up.error) throw up.error;
                const pub = sb.storage.from("notes").getPublicUrl(path);
                pdfUrl = pub.data.publicUrl;
            }
        }

        if (!pdfUrl) {
            pdfUrl = "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf";
        }

        const newNote = {
            id: Date.now(),
            title,
            category,
            desc,
            author: currentUser ? currentUser.id : "Faculty Admin",
            date: new Date().toISOString().split('T')[0],
            topics: [
                {
                    title: "Module 1: General Notes",
                    pages: [pdfUrl]
                }
            ]
        };

        if (sb) {
            await sb.from("notes").insert({
                title,
                subject: category,
                description: desc,
                file_url: pdfUrl,
                published: true,
                created_by: currentUser ? currentUser.id : null
            });
        }

        notesData.unshift(newNote);
        localStorage.setItem("eduvault_notes", JSON.stringify(notesData));

        auditLogs.unshift({
            time: new Date().toISOString().replace('T', ' ').substring(0, 16),
            user: currentUser ? currentUser.id : "Admin",
            action: `Published '${title}'`,
            status: "Verified"
        });
        localStorage.setItem("eduvault_logs", JSON.stringify(auditLogs));

        showToast("Note published successfully!", "success");
        e.target.reset();
        renderAuditLogs();
        renderNotes();
    } catch (err) {
        showToast(err.message, "error");
    }
}

// --- AUDIT LOGS & EXTRA UI PANELS ---
function renderAuditLogs() {
    const table = $("audit-log-table");
    if (!table) return;
    table.innerHTML = auditLogs.map(log => `
        <tr class="hover:bg-white/5 transition">
            <td class="py-3 text-textmuted text-xs">${esc(log.time)}</td>
            <td class="py-3 font-semibold text-white">${esc(log.user)}</td>
            <td class="py-3 text-textmuted">${esc(log.action)}</td>
            <td class="py-3">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-mint/10 text-mint border border-mint/20">
                    ${esc(log.status)}
                </span>
            </td>
        </tr>
    `).join("");
}

function toggleFaq(element) {
    const answer = element.querySelector("p");
    const icon = element.querySelector("i");
    if (answer) answer.classList.toggle("hidden");
    if (icon) icon.classList.toggle("rotate-180");
}

function handleContactSubmit(e) {
    e.preventDefault();
    showToast("Thank you! Your message has been sent to faculty support.", "success");
    e.target.reset();
}

async function recordVisit(action = "page_view") {
    if (!sb) return;
    try {
        await sb.from("visit_logs").insert({
            user_id: currentUser?.id || null,
            action,
            page: location.hash || "home"
        });
    } catch (e) {
        console.warn("Log activity error:", e);
    }
}