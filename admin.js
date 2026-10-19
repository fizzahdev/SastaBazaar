import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, collection, getDocs, getDoc, doc, updateDoc, deleteDoc, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAEiFvS5MshrOVn3iP3DBBcQ1BSSPdZc3c",
  authDomain: "sasta-bazaar-3776b.firebaseapp.com",
  projectId: "sasta-bazaar-3776b",
  storageBucket: "sasta-bazaar-3776b.firebasestorage.app",
  messagingSenderId: "195087913502",
  appId: "1:195087913502:web:51896c8b32e90f24ec940f",
  measurementId: "G-8BR8Z0RWVJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let allReports = [];
let allUsers = [];
let allRates = [];
let allFeed = [];
let allVouchers = [];


const ADMIN_EMAILS = [
    "fizzahfarhan852@gmail.com",
    "f8407882@gmail.com" 
];

const authGuard = document.getElementById("admin-auth-section");
const adminContent = document.getElementById("admin-content");

// Auth Check
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        authGuard.classList.add("hidden");
        adminContent.classList.remove("hidden");
        document.getElementById("admin-email").textContent = user.email;
        document.getElementById("current-date").textContent = new Date().toLocaleDateString('en-US', { 
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
        });
        await loadAllData();
    } else if (user && !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        authGuard.classList.remove("hidden");
        adminContent.classList.add("hidden");
        authGuard.innerHTML = `
            <div class="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center space-y-4">
                <div class="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                    <i class="fa-solid fa-ban"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-800">Access Denied</h3>
                <p class="text-xs text-slate-500">Your account (${user.email}) is not authorized as admin.</p>
                <button onclick="window.location.href='index.html'" class="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition text-sm">
                    <i class="fa-solid fa-arrow-left mr-2"></i>Back to App
                </button>
            </div>`;
    } else {
        authGuard.classList.remove("hidden");
        adminContent.classList.add("hidden");
    }
});

document.getElementById("admin-logout-btn")?.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));

// Load All Data
async function loadAllData() {
    await Promise.all([
        loadReports(),
        loadUsers(),
        loadRates(),
        loadFeed(),
        loadVouchers()
    ]);
    updateStats();
    renderOverview();
}

// Load Reports
async function loadReports() {
    const snap = await getDocs(collection(db, "reports"));
    allReports = [];
    snap.forEach(d => allReports.push({ id: d.id, ...d.data() }));
    allReports.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    document.getElementById("sidebar-reports-count").textContent = allReports.length;
    renderReportsTable();
}

// Load Users
async function loadUsers() {
    const snap = await getDocs(collection(db, "users"));
    allUsers = [];
    snap.forEach(d => allUsers.push({ id: d.id, ...d.data() }));
    allUsers.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    document.getElementById("sidebar-users-count").textContent = allUsers.length;
    renderUsersTable();
}

// Load Rates
async function loadRates() {
    const snap = await getDocs(collection(db, "officialRates"));
    allRates = [];
    snap.forEach(d => allRates.push({ id: d.id, ...d.data() }));
    renderRatesTable();
}

// Load Feed
async function loadFeed() {
    const snap = await getDocs(collection(db, "actionFeed"));
    allFeed = [];
    snap.forEach(d => allFeed.push({ id: d.id, ...d.data() }));
    renderFeedList();
}

// Load Vouchers
async function loadVouchers() {
    try {
        const snap = await getDocs(collection(db, "vouchers"));
        allVouchers = [];
        snap.forEach(d => allVouchers.push({ id: d.id, ...d.data() }));
        renderVouchersList();
    } catch (e) {
        document.getElementById("admin-vouchers-list").innerHTML = `<p class="text-xs text-slate-400 text-center py-4">No vouchers redeemed yet.</p>`;
    }
}

// Update Stats
function updateStats() {
    document.getElementById("stat-total-reports").textContent = allReports.length;
    document.getElementById("stat-total-users").textContent = allUsers.length;
    const pending = allReports.filter(r => r.status === "Under Review").length;
    document.getElementById("stat-pending").textContent = pending;
    const totalPoints = allUsers.reduce((sum, u) => sum + (u.points || 0), 0);
    document.getElementById("stat-total-points").textContent = totalPoints;
}

// Overview - Recent Reports
function renderOverview() {
    const recentReports = allReports.slice(0, 5);
    const recentReportsEl = document.getElementById("overview-recent-reports");
    if (recentReports.length === 0) {
        recentReportsEl.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">No reports yet.</p>`;
    } else {
        recentReportsEl.innerHTML = recentReports.map(r => `
            <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2">
                ${r.photoUrl ? `<img src="${r.photoUrl}" class="w-10 h-10 rounded object-cover">` : `<div class="w-10 h-10 rounded bg-slate-200 flex items-center justify-center"><i class="fa-solid fa-image text-slate-400"></i></div>`}
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-xs text-slate-800 truncate">${r.shopName}</p>
                    <p class="text-[10px] text-slate-500 truncate">${r.location}</p>
                </div>
                <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full ${r.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : r.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}">${r.status}</span>
            </div>
        `).join('');
    }

    const recentFeed = allFeed.slice(0, 5);
    const recentFeedEl = document.getElementById("overview-recent-feed");
    if (recentFeed.length === 0) {
        recentFeedEl.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">No actions yet.</p>`;
    } else {
        recentFeedEl.innerHTML = recentFeed.map(f => `
            <div class="p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                <p class="font-bold text-xs text-slate-800">${f.shopName}</p>
                <p class="text-[10px] text-rose-700 mt-0.5">${f.action}</p>
            </div>
        `).join('');
    }
}

// Render Reports Grid
function renderReportsTable() {
    const container = document.getElementById("admin-reports-list");
    const searchVal = document.getElementById("admin-report-search")?.value.toLowerCase() || "";
    const filterVal = document.getElementById("admin-report-filter")?.value || "all";

    let filtered = allReports.filter(r => {
        const matchSearch = r.shopName?.toLowerCase().includes(searchVal) || r.location?.toLowerCase().includes(searchVal);
        const matchFilter = filterVal === "all" || r.status === filterVal;
        return matchSearch && matchFilter;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400 text-sm"><i class="fa-solid fa-inbox text-3xl mb-2 block"></i>No reports found.</div>`;
        return;
    }

    container.innerHTML = filtered.map(r => {
        const dateStr = r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleString() : "N/A";
        const statusClass = r.status === "Approved" ? "bg-emerald-100 text-emerald-700" : r.status === "Rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700";
        return `
            <div class="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                ${r.photoUrl ? `<img src="${r.photoUrl}" class="w-full h-32 object-cover border-b border-slate-200">` : `<div class="w-full h-32 bg-slate-200 flex items-center justify-center border-b border-slate-200"><i class="fa-solid fa-image text-3xl text-slate-400"></i></div>`}
                <div class="p-3 space-y-1.5">
                    <div class="flex justify-between items-start gap-2">
                        <h4 class="font-bold text-sm text-slate-800">${r.shopName}</h4>
                        <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${statusClass}">${r.status}</span>
                    </div>
                    <p class="text-[11px] text-slate-500"><i class="fa-solid fa-location-dot mr-1"></i>${r.location}</p>
                    <div class="flex justify-between text-[11px] pt-1 border-t border-slate-200">
                        <span class="text-slate-500">${r.category}</span>
                        <span class="font-bold text-emerald-700">Rs. ${r.chargedPrice}</span>
                    </div>
                    ${r.comments ? `<p class="text-[10px] text-slate-600 italic">"${r.comments}"</p>` : ''}
                    <p class="text-[9px] text-slate-400">${dateStr}</p>
                    <div class="flex gap-1.5 pt-1">
                        ${r.status !== 'Approved' ? `<button onclick="approveReport('${r.id}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 rounded transition"><i class="fa-solid fa-check mr-1"></i>Approve</button>` : ''}
                        ${r.status !== 'Rejected' ? `<button onclick="rejectReport('${r.id}')" class="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold py-1.5 rounded transition"><i class="fa-solid fa-xmark mr-1"></i>Reject</button>` : ''}
                        <button onclick="deleteReport('${r.id}')" class="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold py-1.5 px-2 rounded transition"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// Render Users Table
function renderUsersTable() {
    const tbody = document.getElementById("admin-users-table");
    if (allUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">No users yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = allUsers.map((u, i) => {
        const joined = u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : "N/A";
        return `
            <tr class="hover:bg-slate-50">
                <td class="p-3 text-slate-500">${i + 1}</td>
                <td class="p-3 font-semibold text-slate-800">${u.email}</td>
                <td class="p-3"><span class="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full text-[10px]">${u.points || 0} pts</span></td>
                <td class="p-3 text-slate-500">${joined}</td>
            </tr>`;
    }).join('');
}

// Render Rates Table
function renderRatesTable() {
    const tbody = document.getElementById("admin-rates-table");
    if (allRates.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">No rates yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = allRates.map(r => `
        <tr class="hover:bg-slate-50">
            <td class="p-3 font-semibold text-slate-800">${r.name}</td>
            <td class="p-3"><span class="bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">${r.category}</span></td>
            <td class="p-3 text-slate-600">${r.unit}</td>
            <td class="p-3 font-bold text-emerald-700">Rs. ${r.rate}</td>
            <td class="p-3 text-slate-400 text-[10px]">${r.updated || 'N/A'}</td>
            <td class="p-3 text-right">
                <button onclick="editRate('${r.id}')" class="text-emerald-600 hover:text-emerald-700 mr-2"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteRate('${r.id}')" class="text-rose-600 hover:text-rose-700"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`).join('');
}

// Render Feed List
function renderFeedList() {
    const container = document.getElementById("admin-feed-list");
    if (allFeed.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">No feed entries.</p>`;
        return;
    }
    container.innerHTML = allFeed.map(f => `
        <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-start gap-2">
            <div class="flex-1">
                <p class="font-bold text-xs text-slate-800">${f.shopName}</p>
                <p class="text-[11px] text-rose-700 mt-1">${f.action}</p>
                <p class="text-[10px] text-slate-400 mt-1">${f.date || 'Recent'}</p>
            </div>
            <button onclick="deleteFeed('${f.id}')" class="text-rose-600 hover:text-rose-700 px-2"><i class="fa-solid fa-trash text-xs"></i></button>
        </div>`).join('');
}

// Render Vouchers
function renderVouchersList() {
    const container = document.getElementById("admin-vouchers-list");
    if (allVouchers.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">No vouchers redeemed yet.</p>`;
        return;
    }
    container.innerHTML = allVouchers.map(v => `
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p class="font-mono font-bold text-emerald-700 text-sm">${v.code || 'N/A'}</p>
            <p class="text-[11px] text-slate-500">${v.userEmail || 'Unknown user'}</p>
        </div>`).join('');
}

// Actions
window.approveReport = async (id) => {
    if (!confirm("Approve this report? User will be notified.")) return;
    await updateDoc(doc(db, "reports", id), { status: "Approved" });
    await addDoc(collection(db, "actionFeed"), {
        shopName: allReports.find(r => r.id === id)?.shopName || "Shop",
        action: "Report approved and forwarded for action",
        date: "Today"
    });
    await loadReports();
    await loadFeed();
    updateStats();
    renderOverview();
};

window.rejectReport = async (id) => {
    if (!confirm("Reject this report?")) return;
    await updateDoc(doc(db, "reports", id), { status: "Rejected" });
    await loadReports();
    updateStats();
    renderOverview();
};

window.deleteReport = async (id) => {
    if (!confirm("Delete this report permanently?")) return;
    await deleteDoc(doc(db, "reports", id));
    await loadReports();
    updateStats();
    renderOverview();
};

window.editRate = (id) => {
    const rate = allRates.find(r => r.id === id);
    if (!rate) return;
    document.getElementById("rate-edit-id").value = id;
    document.getElementById("rate-name").value = rate.name;
    document.getElementById("rate-category").value = rate.category;
    document.getElementById("rate-unit").value = rate.unit;
    document.getElementById("rate-value").value = rate.rate;
    document.getElementById("rate-modal-title").textContent = "Edit Rate";
    document.getElementById("rate-modal").classList.remove("hidden");
    document.getElementById("rate-modal").classList.add("flex");
};

window.deleteRate = async (id) => {
    if (!confirm("Delete this rate?")) return;
    await deleteDoc(doc(db, "officialRates", id));
    await loadRates();
};

window.deleteFeed = async (id) => {
    if (!confirm("Delete this feed entry?")) return;
    await deleteDoc(doc(db, "actionFeed", id));
    await loadFeed();
    renderOverview();
};

window.openAddRateModal = () => {
    document.getElementById("rate-edit-id").value = "";
    document.getElementById("rate-form").reset();
    document.getElementById("rate-modal-title").textContent = "Add New Rate";
    document.getElementById("rate-modal").classList.remove("hidden");
    document.getElementById("rate-modal").classList.add("flex");
};

window.closeRateModal = () => {
    document.getElementById("rate-modal").classList.add("hidden");
    document.getElementById("rate-modal").classList.remove("flex");
};

window.openAddFeedModal = () => {
    document.getElementById("feed-form").reset();
    document.getElementById("feed-modal").classList.remove("hidden");
    document.getElementById("feed-modal").classList.add("flex");
};

window.closeFeedModal = () => {
    document.getElementById("feed-modal").classList.add("hidden");
    document.getElementById("feed-modal").classList.remove("flex");
};

// Rate Form Submit
document.getElementById("rate-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("rate-edit-id").value;
    const data = {
        name: document.getElementById("rate-name").value,
        category: document.getElementById("rate-category").value,
        unit: document.getElementById("rate-unit").value,
        rate: parseFloat(document.getElementById("rate-value").value),
        updated: new Date().toISOString().split('T')[0]
    };
    if (editId) {
        await updateDoc(doc(db, "officialRates", editId), data);
    } else {
        await addDoc(collection(db, "officialRates"), data);
    }
    closeRateModal();
    await loadRates();
});

// Feed Form Submit
document.getElementById("feed-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "actionFeed"), {
        shopName: document.getElementById("feed-shop-name").value,
        action: document.getElementById("feed-action").value,
        date: "Today"
    });
    closeFeedModal();
    await loadFeed();
    renderOverview();
});

// Tab Switching
document.querySelectorAll('[data-tab]').forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const tab = link.dataset.tab;
        document.querySelectorAll('[data-tab]').forEach(l => l.classList.remove("active"));
        link.classList.add("active");
        document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
        document.getElementById(`tab-${tab}`).classList.remove("hidden");
        document.getElementById("page-title").textContent = link.querySelector("span").textContent;
        const subtitles = {
            overview: "Welcome back, Admin!",
            reports: "Manage all citizen reports",
            users: "View registered community members",
            rates: "Manage official government rates",
            feed: "Government enforcement actions",
            vouchers: "Redeemed discount vouchers"
        };
        document.getElementById("page-subtitle").textContent = subtitles[tab] || "";
    });
});

// Search/Filter listeners
document.getElementById("admin-report-search")?.addEventListener("input", renderReportsTable);
document.getElementById("admin-report-filter")?.addEventListener("change", renderReportsTable);