import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, getDocs, getDoc, setDoc, doc, updateDoc, serverTimestamp, query, where, orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Config
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
let map = null;
let markersLayer = null;
let allRates = [];
let isSignUpMode = false;

const authSection = document.getElementById("auth-section");
const dashboardSection = document.getElementById("dashboard-section");
const authNavSection = document.getElementById("auth-nav-section");
const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authToggleBtn = document.getElementById("auth-toggle-btn");
const authToggleText = document.getElementById("auth-toggle-text");

// Toggle Login/Signup
if (authToggleBtn) {
    authToggleBtn.addEventListener("click", () => {
        isSignUpMode = !isSignUpMode;
        authTitle.textContent = isSignUpMode ? "Create SastaBazaar Account" : "Login to SastaBazaar";
        authSubmitBtn.textContent = isSignUpMode ? "Sign Up" : "Login";
        authToggleText.textContent = isSignUpMode ? "Already have an account?" : "Don't have an account?";
        authToggleBtn.textContent = isSignUpMode ? "Login" : "Sign Up";
    });
}

// Auth Submit
if (authForm) {
    authForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = authEmailInput.value;
        const password = authPasswordInput.value;
        try {
            if (isSignUpMode) {
                const userCred = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, "users", userCred.user.uid), {
                    email: email, points: 0, createdAt: serverTimestamp()
                });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (error) {
            alert("Authentication Error: " + error.message);
        }
    });
}

// Auth Observer
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        if (authSection) authSection.classList.add("hidden");
        if (dashboardSection) dashboardSection.classList.remove("hidden");
        if (authNavSection) {
                      // Admin Check
            const ADMIN_EMAILS = ["f8407882@gmail.com"]; // <-- YAHAN APNI EMAIL LIKHEIN
            const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());

            authNavSection.innerHTML = `
                <span class="text-sm font-medium hidden sm:inline"><i class="fa-solid fa-user-circle mr-1"></i>${user.email}</span>
                ${isAdmin ? `<a href="admin.html" class="bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs px-3 py-1.5 rounded-lg transition font-bold shadow"><i class="fa-solid fa-user-shield mr-1"></i>Admin Panel</a>` : ''}
                <button id="logout-btn" class="bg-emerald-800 hover:bg-emerald-900 text-white text-xs px-3 py-1.5 rounded-lg transition font-semibold">Logout</button>
            `;

            document.getElementById("logout-btn").addEventListener("click", () => signOut(auth));
        }
        await loadUserData(user.uid);
        await seedInitialDataIfNeeded();
        loadOfficialRates();
        loadBonusTracker();
        initMap();
        loadReportsForMap();
        loadActionFeed();
        loadMyReports(); // ⭐ NEW
    } else {
        if (authSection) authSection.classList.remove("hidden");
        if (dashboardSection) dashboardSection.classList.add("hidden");
        if (authNavSection) authNavSection.innerHTML = "";
    }
});

// Load User Data
async function loadUserData(uid) {
    const userDocRef = doc(db, "users", uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
        const data = userSnap.data();
        const userDisplay = document.getElementById("user-email-display");
        const pointsDisplay = document.getElementById("user-points-display");
        if (userDisplay) userDisplay.textContent = currentUser.email.split('@')[0];
        if (pointsDisplay) pointsDisplay.textContent = data.points || 0;
    }
}

// Seed Data
async function seedInitialDataIfNeeded() {
    try {
        const ratesSnap = await getDocs(collection(db, "officialRates"));
        if (ratesSnap.empty) {
            const sampleRates = [
                { name: "Potato", category: "Vegetable", unit: "per kg", rate: 80, updated: "2026-10-18" },
                { name: "Tomato", category: "Vegetable", unit: "per kg", rate: 120, updated: "2026-10-18" },
                { name: "Onion", category: "Vegetable", unit: "per kg", rate: 95, updated: "2026-10-18" },
                { name: "Apple (Gacha)", category: "Fruit", unit: "per kg", rate: 250, updated: "2026-10-18" },
                { name: "Banana", category: "Fruit", unit: "per dozen", rate: 150, updated: "2026-10-18" },
                { name: "Broiler Chicken", category: "Poultry", unit: "per kg", rate: 480, updated: "2026-10-18" }
            ];
            for (let item of sampleRates) await addDoc(collection(db, "officialRates"), item);
        }
        const feedSnap = await getDocs(collection(db, "actionFeed"));
        if (feedSnap.empty) {
            const sampleFeed = [
                { shopName: "Al-Madina Vegetables", action: "Fined Rs. 5,000 for overcharging potatoes", date: "Today, 10:30 AM" },
                { shopName: "Fresh Poultry Hub", action: "Shop Sealed due to repeated violations", date: "Yesterday" }
            ];
            for (let feed of sampleFeed) await addDoc(collection(db, "actionFeed"), feed);
        }
    } catch (e) { console.log("Seeding check:", e); }
}

// Load Rates
async function loadOfficialRates() {
    try {
        const querySnapshot = await getDocs(collection(db, "officialRates"));
        allRates = [];
        querySnapshot.forEach((docSnap) => allRates.push(docSnap.data()));
        renderRatesTable(allRates);
    } catch (e) { console.error("Error loading rates:", e); }
}

function renderRatesTable(rates) {
    const tbody = document.getElementById("rates-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (rates.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">No items found.</td></tr>`;
        return;
    }
    rates.forEach(item => {
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-3 font-semibold text-slate-800">${item.name}</td>
                <td class="p-3"><span class="px-2 py-0.5 text-xs rounded-full bg-slate-100 font-medium">${item.category}</span></td>
                <td class="p-3 text-slate-600">${item.unit}</td>
                <td class="p-3 font-bold text-emerald-700">Rs. ${item.rate}</td>
                <td class="p-3 text-slate-400 text-xs">${item.updated}</td>
            </tr>`;
    });
}

const rateSearchInput = document.getElementById("rate-search");
const rateCatFilter = document.getElementById("rate-category-filter");
if (rateSearchInput) rateSearchInput.addEventListener("input", filterRates);
if (rateCatFilter) rateCatFilter.addEventListener("change", filterRates);

function filterRates() {
    const searchVal = rateSearchInput ? rateSearchInput.value.toLowerCase() : "";
    const catVal = rateCatFilter ? rateCatFilter.value : "all";
    const filtered = allRates.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchVal);
        const matchesCat = (catVal === "all" || item.category === catVal);
        return matchesSearch && matchesCat;
    });
    renderRatesTable(filtered);
}

// Bonus Tracker
async function loadBonusTracker() {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        const trackerRef = doc(db, "dailyBonusTracker", todayStr);
        const trackerSnap = await getDoc(trackerRef);
        let count = trackerSnap.exists() ? (trackerSnap.data().count || 0) : 0;
        if (!trackerSnap.exists()) await setDoc(trackerRef, { count: 0 });
        const remaining = Math.max(0, 10 - count);
        const percent = (remaining / 10) * 100;
        const bonusText = document.getElementById("bonus-slots-text");
        const bonusProgress = document.getElementById("bonus-progress-bar");
        if (bonusText) bonusText.textContent = `${remaining} of 10 Daily Bonuses Left for today!`;
        if (bonusProgress) bonusProgress.style.width = `${percent}%`;
    } catch (e) { console.error("Tracker error:", e); }
}

// Report Form Submit
const reportForm = document.getElementById("report-form");
if (reportForm) {
    reportForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const shopName = document.getElementById("report-shop-name").value;
        const location = document.getElementById("report-location").value;
        const category = document.getElementById("report-category").value;
        const chargedPrice = parseFloat(document.getElementById("report-charged-price").value);
        const comments = document.getElementById("report-comments").value;
        const photoFile = document.getElementById("report-photo").files[0];

        if (!photoFile) { alert("Please upload a photo proof."); return; }

        const submitBtn = document.getElementById("submit-report-btn");
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting Report...";

        try {
            const photoUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(photoFile);
            });

            const todayStr = new Date().toISOString().split('T')[0];
            const trackerRef = doc(db, "dailyBonusTracker", todayStr);
            const trackerSnap = await getDoc(trackerRef);
            let currentCount = trackerSnap.exists() ? (trackerSnap.data().count || 0) : 0;
            let earnedBonus = false;

            if (currentCount < 10) {
                if (!trackerSnap.exists()) await setDoc(trackerRef, { count: 1 });
                else await updateDoc(trackerRef, { count: currentCount + 1 });
                const userDocRef = doc(db, "users", currentUser.uid);
                const userSnap = await getDoc(userDocRef);
                const currentPoints = userSnap.exists() ? (userSnap.data().points || 0) : 0;
                await updateDoc(userDocRef, { points: currentPoints + 50 });
                earnedBonus = true;
            }

            await addDoc(collection(db, "reports"), {
                shopName, location, category, chargedPrice, comments, photoUrl,
                userId: currentUser.uid,
                userEmail: currentUser.email,
                status: "Under Review",
                lat: 25.3960 + (Math.random() - 0.5) * 0.03,
                lng: 68.3578 + (Math.random() - 0.5) * 0.03,
                createdAt: serverTimestamp()
            });

            reportForm.reset();
            loadBonusTracker();
            loadUserData(currentUser.uid);
            loadReportsForMap();
            loadMyReports(); 
            
            // refresh list

            alert(earnedBonus 
                ? "Report submitted successfully! 🎉 You earned +50 Bonus Points!" 
                : "Report submitted successfully! (Daily bonus limit reached for today)");

        } catch (error) {
            console.error("Submission error:", error);
            alert("Error submitting report: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Report & Claim Bonus";
        }
    });
}

// Map Init
function initMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement || map) return;
    map = L.map('map').setView([25.3960, 68.3578], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
}

// Load Reports for Map 
async function loadReportsForMap() {
    if (!markersLayer) return;
    markersLayer.clearLayers();
    try {
        const querySnapshot = await getDocs(collection(db, "reports"));
        querySnapshot.forEach((docSnap) => {
            const report = docSnap.data();
            if (report.lat && report.lng) {
                const marker = L.marker([report.lat, report.lng]);
                marker.bindPopup(`
                    <div style="min-width: 220px; font-family: sans-serif;">
                        <h5 style="margin:0 0 6px; font-weight:bold; color:#e11d48;">${report.shopName}</h5>
                        ${report.photoUrl ? `
                            <img src="${report.photoUrl}" alt="Proof" 
                                 style="width:100%; max-height:120px; object-fit:cover; border-radius:8px; margin-bottom:6px; border:1px solid #e2e8f0;">
                        ` : ''}
                        <p style="margin:2px 0; font-size:11px;"><strong>Location:</strong> ${report.location}</p>
                        <p style="margin:2px 0; font-size:11px;"><strong>Charged:</strong> Rs. ${report.chargedPrice}</p>
                        <p style="margin:2px 0; font-size:11px;"><strong>Status:</strong> <span style="color:#d97706; font-weight:600;">${report.status}</span></p>
                        ${report.photoUrl ? `<a href="${report.photoUrl}" target="_blank" style="font-size:11px; color:#2563eb; display:block; margin-top:4px;">Open Full Photo ↗</a>` : ''}
                    </div>
                `);
                markersLayer.addLayer(marker);
            }
        });
    } catch (e) { console.error("Map error:", e); }
}

// Load My Reports
async function loadMyReports() {
    const container = document.getElementById("my-reports-list");
    const countBadge = document.getElementById("my-reports-count");
    if (!container || !currentUser) return;

    container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400 text-sm"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2 block"></i> Loading your reports...</div>`;

    try {
        const q = query(collection(db, "reports"), where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        const reports = [];
        querySnapshot.forEach((docSnap) => {
            reports.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Sort by createdAt desc (client-side)
        reports.sort((a, b) => {
            const ta = a.createdAt?.seconds || 0;
            const tb = b.createdAt?.seconds || 0;
            return tb - ta;
        });

        if (countBadge) countBadge.textContent = reports.length;

        if (reports.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-10 text-slate-400 text-sm">
                    <i class="fa-solid fa-inbox text-4xl mb-3 block text-slate-300"></i>
                    <p class="font-semibold text-slate-500">No reports yet</p>
                    <p class="text-xs mt-1">Submit your first report to see it here!</p>
                </div>`;
            return;
        }

        container.innerHTML = "";
        reports.forEach((report) => {
            const statusClass = report.status === "Approved" ? "badge-approved" 
                              : report.status === "Rejected" ? "badge-rejected" 
                              : "badge-pending";
            const dateStr = report.createdAt?.seconds 
                ? new Date(report.createdAt.seconds * 1000).toLocaleString() 
                : "Just now";

            container.innerHTML += `
                <div class="report-card bg-slate-50 border border-slate-200 rounded-xl overflow-hidden fade-in">
                    ${report.photoUrl ? `
                        <img src="${report.photoUrl}" alt="Proof" class="w-full h-32 object-cover border-b border-slate-200">
                    ` : `
                        <div class="w-full h-32 bg-slate-100 flex items-center justify-center border-b border-slate-200">
                            <i class="fa-solid fa-image text-3xl text-slate-300"></i>
                        </div>
                    `}
                    <div class="p-3 space-y-1.5">
                        <div class="flex items-start justify-between gap-2">
                            <h4 class="font-bold text-sm text-slate-800 line-clamp-1">${report.shopName}</h4>
                            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${statusClass}">${report.status}</span>
                        </div>
                        <p class="text-xs text-slate-500 line-clamp-1"><i class="fa-solid fa-location-dot mr-1"></i>${report.location}</p>
                        <div class="flex justify-between items-center text-xs pt-1 border-t border-slate-200 mt-2">
                            <span class="text-slate-500">${report.category}</span>
                            <span class="font-bold text-emerald-700">Rs. ${report.chargedPrice}</span>
                        </div>
                        <p class="text-[10px] text-slate-400 pt-1"><i class="fa-regular fa-clock mr-1"></i>${dateStr}</p>
                        ${report.comments ? `<p class="text-[11px] text-slate-600 italic line-clamp-2 pt-1">"${report.comments}"</p>` : ''}
                    </div>
                </div>
            `;
        });
    } catch (e) {
        console.error("My Reports error:", e);
        container.innerHTML = `<div class="col-span-full text-center py-8 text-rose-500 text-sm"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Error loading reports: ${e.message}</div>`;
    }
}

// Refresh button
const refreshBtn = document.getElementById("refresh-my-reports-btn");
if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
        refreshBtn.innerHTML = `<i class="fa-solid fa-rotate-right fa-spin mr-1"></i> Loading...`;
        loadMyReports().then(() => {
            refreshBtn.innerHTML = `<i class="fa-solid fa-rotate-right mr-1"></i> Refresh`;
        });
    });
}

// Action Feed
async function loadActionFeed() {
    const feedContainer = document.getElementById("action-feed");
    if (!feedContainer) return;
    feedContainer.innerHTML = "";
    try {
        const querySnapshot = await getDocs(collection(db, "actionFeed"));
        if (querySnapshot.empty) {
            feedContainer.innerHTML = `<p class="text-xs text-slate-400">No action updates yet.</p>`;
            return;
        }
        querySnapshot.forEach((docSnap) => {
            const item = docSnap.data();
            feedContainer.innerHTML += `
                <div class="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-xs text-slate-800">${item.shopName}</span>
                        <span class="text-[10px] text-slate-400">${item.date || 'Recent'}</span>
                    </div>
                    <p class="text-xs text-rose-700 font-medium"><i class="fa-solid fa-circle-exclamation mr-1"></i>${item.action}</p>
                </div>`;
        });
    } catch (e) { console.error("Feed error:", e); }
}

// Redeem Modal
window.openRedeemModal = function() {
    const modal = document.getElementById("redeem-modal");
    if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
        document.getElementById("voucher-result").classList.add("hidden");
    }
}

window.closeRedeemModal = function() {
    const modal = document.getElementById("redeem-modal");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    }
}

window.generateVoucher = async function() {
    if (!currentUser) return;
    const userDocRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userDocRef);
    const points = userSnap.exists() ? (userSnap.data().points || 0) : 0;
    if (points < 100) {
        alert("You need at least 100 points to generate a discount voucher. Submit more valid reports to earn points!");
        return;
    }
    await updateDoc(userDocRef, { points: points - 100 });
    loadUserData(currentUser.uid);
    const voucherCode = "SB-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    document.getElementById("voucher-code-text").textContent = voucherCode;
    document.getElementById("voucher-result").classList.remove("hidden");
}