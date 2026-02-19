import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue, remove, update } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// 1. FIREBASE CONFIG
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

// 2. STATE & CONSTANTS
const ADMIN_PASSWORD = "1234"; 
let isSelectionMode = false;
let selectedAlbums = new Set();
let fullDataBuffer = {}; 

// 3. UI ANIMATION HELPER
function animateIcon(element) {
    if (!element) return;
    element.classList.add('icon-pop');
    setTimeout(() => element.classList.remove('icon-pop'), 400);
}

// 4. NAVIGATION & UI EVENTS
document.addEventListener('DOMContentLoaded', () => {
    // Navigation Map
    const routes = {
        'navToHistory': 'history.html',
        'trashBinBtn': 'junk.html',
        'navToPortal': 'index.html'
    };

    Object.keys(routes).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.onclick = (e) => {
                animateIcon(e.currentTarget);
                // Delay jump so animation can be seen
                setTimeout(() => window.location.href = routes[id], 250); 
            };
        }
    });

    // Search Box Toggle Logic
    const searchTrigger = document.querySelector('.search-trigger');
    const searchBox = document.getElementById('searchBox');
    const nameInput = document.getElementById('nameInput');

    if (searchTrigger && searchBox) {
        searchTrigger.onclick = (e) => {
            animateIcon(e.currentTarget);
            searchBox.classList.toggle('active');
            if (searchBox.classList.contains('active')) nameInput?.focus();
        };
    }

    // Real-time search filter
    nameInput?.addEventListener('input', (e) => processData(e.target.value.toLowerCase()));
});

// 5. DATA PROCESSING & RENDERING
function processData(searchTerm = "") {
    onValue(ref(db, 'attendance'), (snapshot) => {
        const data = snapshot.val();
        fullDataBuffer = data || {}; 
        const portalTable = document.getElementById('attendanceTable'); 
        const historyTable = document.getElementById('historyTable');   
        
        if (portalTable) {
            portalTable.innerHTML = '';
            Object.entries(fullDataBuffer)
                .filter(([k, v]) => (v.studentName || "").toLowerCase().includes(searchTerm))
                .reverse()
                .forEach(([key, val]) => {
                    const row = document.createElement('div');
                    row.className = 'attendance-row';
                    row.innerHTML = `
                        <span>${val.studentName || 'Unknown Name'}</span>
                        <span class="text-center">${val.grade || 'N/A'}</span>
                        <span class="text-right">${val.time || val.scannedAt || '--:--'}</span>
                    `;
                    portalTable.appendChild(row);
                });
        }

        if (historyTable) {
            historyTable.innerHTML = '';
            const albums = {};
            Object.entries(fullDataBuffer).forEach(([key, val]) => {
                const sName = val.studentName || "Unknown Student";
                if (!albums[sName]) {
                    albums[sName] = { grade: val.grade || 'N/A', logs: [] };
                }
                albums[sName].logs.push({ key, ...val });
            });

            Object.keys(albums)
                .filter(n => n.toLowerCase().includes(searchTerm))
                .forEach(name => {
                    const studentLogs = albums[name].logs;
                    const wrapper = document.createElement('div');
                    wrapper.className = 'album-row-wrapper';
                    wrapper.innerHTML = `
                        <div class="student-album">
                            <div class="album-icon"><i class="fa-solid fa-folder-open"></i></div>
                            <div class="album-info-meta">
                                <div class="album-name">${name}</div>
                                <div class="album-sub">Grade: ${albums[name].grade}</div>
                            </div>
                            <div class="total-scans">${studentLogs.length} Logs</div>
                        </div>`;
                    
                    wrapper.querySelector('.student-album').onclick = () => showPopUp(name, studentLogs);
                    historyTable.appendChild(wrapper);
                });
        }
    });
}

// 6. POPUP & DELETE LOGIC
window.showPopUp = (name, logs) => {
    const modal = document.getElementById('historyModal');
    if (!modal) return;
    document.getElementById('modalStudentName').innerText = name;
    const list = document.getElementById('individualLogs');
    list.innerHTML = '';
    logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'attendance-row popup-grid';
        item.innerHTML = `
            <span>${log.scannedAt || log.time}</span>
            <button class="delete-log-btn" style="background:none; border:none; color:white; cursor:pointer;">
                <i class="fa-solid fa-trash"></i>
            </button>`;
        
        item.querySelector('button').onclick = (e) => {
            animateIcon(e.currentTarget);
            if (prompt("Admin Password:") === ADMIN_PASSWORD) {
                remove(ref(db, `attendance/${log.key}`));
            }
        };
        list.appendChild(item);
    });
    modal.style.display = 'flex';
};

// Start data fetching
processData();
