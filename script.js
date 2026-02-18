import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// --- 1. CONFIGURATION (Keep your keys) ---
const firebaseConfig = {
    apiKey: "AIzaSyBdlEvDlQ1qWr8xdL4bV25NW4RgcTajYqM",
    authDomain: "database-98a70.firebaseapp.com",
    databaseURL: "https://database-98a70-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "database-98a70",
    storageBucket: "database-98a70.firebasestorage.app",
    messagingSenderId: "460345885965",
    appId: "1:460345885965:web:8484da766b979a0eaf9c44"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- 2. NAVIGATION & ROTATE ANIMATION ---
// This handles the panel rotation when switching pages
const panel = document.getElementById('mainPanel');

function handleNav(target) {
    if (panel) {
        panel.classList.add('rotate-effect');
        setTimeout(() => { window.location.href = target; }, 500);
    } else {
        window.location.href = target;
    }
}

// Check if buttons exist before adding listeners
document.getElementById('navToHistory')?.addEventListener('click', () => handleNav('history.html'));
document.getElementById('navToPortal')?.addEventListener('click', () => handleNav('index.html'));

// --- 3. SEARCH ICON ANIMATION ---
const searchBtn = document.getElementById('searchBtn');
const searchBox = document.getElementById('searchBox');
const nameInput = document.getElementById('nameInput');

if (searchBtn && searchBox) {
    searchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        searchBox.classList.toggle('active');
        if (searchBox.classList.contains('active')) {
            nameInput?.focus();
        }
    });
}

// --- 4. DATA & ALBUM LOGIC ---
function processData() {
    const attRef = ref(db, 'attendance');
    const logsBody = document.getElementById('attendanceTable');
    const historyBody = document.getElementById('historyTable');

    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const records = Object.values(data);
        const now = Date.now();
        const TWELVE_HOURS = 12 * 60 * 60 * 1000;
        const query = nameInput?.value.toLowerCase() || "";

        // --- PARENT PORTAL (Recent Logs) ---
        if (logsBody) {
            logsBody.innerHTML = '';
            records.filter(r => (now - r.timestamp) < TWELVE_HOURS)
                   .filter(r => r.displayName.toLowerCase().includes(query))
                   .sort((a,b) => b.timestamp - a.timestamp)
                   .forEach(log => {
                        const time = new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                        logsBody.innerHTML += `
                            <div class="attendance-row">
                                <span style="font-weight:bold;">${log.displayName}</span>
                                <span style="text-align:center;">${log.grade}</span>
                                <span style="text-align:right; color:var(--neon-cyan);">${time}</span>
                            </div>`;
                   });
        }

        // --- HISTORY PAGE (Album Logic) ---
        if (historyBody) {
            historyBody.innerHTML = '';
            const albums = {};

            // Group scans by Name
            records.forEach(log => {
                if (!albums[log.displayName]) {
                    albums[log.displayName] = { grade: log.grade, allLogs: [] };
                }
                albums[log.displayName].allLogs.push(log);
            });

            // Filter albums by search query and display
            Object.keys(albums)
                .filter(name => name.toLowerCase().includes(query))
                .forEach(name => {
                    const card = document.createElement('div');
                    card.className = 'student-album';
                    card.innerHTML = `
                        <div class="album-icon"><i class="fa-solid fa-folder-open"></i></div>
                        <div class="album-name">${name}</div>
                        <div style="font-size:10px; color:#888;">${albums[name].grade}</div>
                    `;
                    card.onclick = () => showPopUp(name, albums[name].allLogs);
                    historyBody.appendChild(card);
                });
        }
    });
}

// --- 5. POP-UP (MODAL) LOGIC ---
function showPopUp(name, logs) {
    const modal = document.getElementById('historyModal');
    const list = document.getElementById('individualLogs');
    const modalTitle = document.getElementById('modalStudentName');

    if (modal && list) {
        modalTitle.innerText = name;
        list.innerHTML = '';
        
        // Sort logs by newest first
        logs.sort((a,b) => b.timestamp - a.timestamp).forEach(log => {
            const dateObj = new Date(log.timestamp);
            list.innerHTML += `
                <div class="attendance-row popup-grid" style="display:grid; grid-template-columns:1fr 1fr; border-bottom:1px solid rgba(255,255,255,0.1); padding:10px 0;">
                    <span>${dateObj.toLocaleDateString()}</span>
                    <span style="text-align:right; color:var(--neon-cyan)">${dateObj.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </div>`;
        });
        modal.style.display = 'flex';
    }
}

// Close Modal Event
document.getElementById('closeModal')?.addEventListener('click', () => {
    document.getElementById('historyModal').style.display = 'none';
});

// Run everything
if (nameInput) nameInput.addEventListener('input', processData);
processData();
