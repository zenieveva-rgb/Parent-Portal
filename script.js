import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue, set, remove, update } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// --- 1. FIREBASE CONFIGURATION ---
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

// --- 2. GLOBAL STATE ---
const ADMIN_PASSWORD = "1234"; 
let isSelectionMode = false;
let selectedAlbums = new Set();
let fullDataBuffer = {}; 

// --- 3. NAVIGATION (THE UNFREEZE FIX) ---
function smoothNavigate(url) {
    const panel = document.getElementById('mainPanel') || document.getElementById('junkPanel');
    if (panel) {
        panel.style.transition = "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
        panel.style.transform = "scale(0.9) translateY(20px)";
        panel.style.opacity = "0";
        panel.style.filter = "blur(10px)";
        setTimeout(() => { window.location.href = url; }, 500);
    } else {
        window.location.href = url; // Fallback if panel not found
    }
}

// Attach listeners safely
document.getElementById('navToHistory')?.addEventListener('click', () => smoothNavigate('history.html'));
document.getElementById('trashBinBtn')?.addEventListener('click', () => smoothNavigate('junk.html'));
document.getElementById('navToPortal')?.addEventListener('click', () => smoothNavigate('history.html')); 

// --- 4. SEARCH LOGIC ---
document.getElementById('nameInput')?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    processData(searchTerm);
});

// --- 5. SELECTION & DELETE LOGIC ---
const eraserBtn = document.getElementById('toggleDeleteMode');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

eraserBtn?.addEventListener('click', () => {
    isSelectionMode = !isSelectionMode;
    eraserBtn.classList.toggle('active', isSelectionMode);
    if (bulkDeleteBtn) bulkDeleteBtn.style.display = isSelectionMode ? "block" : "none";
    if (!isSelectionMode) selectedAlbums.clear();
    processData(); 
});

window.toggleSelect = (studentName) => {
    if (selectedAlbums.has(studentName)) {
        selectedAlbums.delete(studentName);
    } else {
        selectedAlbums.add(studentName);
    }
};

bulkDeleteBtn?.addEventListener('click', async () => {
    if (selectedAlbums.size === 0) return alert("Select at least one.");
    const pass = prompt(`Enter Password to move ${selectedAlbums.size} items to Junk:`);
    if (pass === ADMIN_PASSWORD) {
        for (let name of selectedAlbums) {
            const logs = Object.entries(fullDataBuffer).filter(([k, v]) => v.studentName === name);
            const trashId = `trash_${Date.now()}_${name.replace(/\s+/g, '_')}`;
            await set(ref(db, `trash/${trashId}`), {
                studentName: name,
                deletedAt: new Date().toLocaleString(),
                logs: logs.map(([key, val]) => ({ key, ...val }))
            });
            for (let [key] of logs) { await remove(ref(db, `attendance/${key}`)); }
        }
        alert("Moved to Junk.");
        selectedAlbums.clear();
        isSelectionMode = false;
        bulkDeleteBtn.style.display = "none";
        processData();
    }
});

// --- 6. DATA RENDERING ---
function processData(filter = "") {
    const attRef = ref(db, 'attendance');
    const table = document.getElementById('attendanceTable') || document.getElementById('historyTable');
    if (!table) return;

    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        fullDataBuffer = data || {}; 
        table.innerHTML = '';
        if (!data) return;

        const albums = {};
        Object.entries(data).forEach(([key, val]) => {
            const sName = val.studentName || "Unknown";
            if (!albums[sName]) albums[sName] = { grade: val.grade, logs: [], lastTime: val.time || val.scannedAt };
            albums[sName].logs.push({ key, ...val });
        });

        Object.keys(albums).filter(name => name.toLowerCase().includes(filter)).forEach(name => {
            const container = document.createElement('div');
            container.className = 'album-row-wrapper';
            const checkboxHTML = isSelectionMode ? `<input type="checkbox" onchange="toggleSelect('${name}')" ${selectedAlbums.has(name) ? 'checked' : ''}>` : '';
            
            // Layout changes if it's the index table vs history table
            const isHistoryPage = !!document.getElementById('historyTable');

            container.innerHTML = isHistoryPage ? `
                ${checkboxHTML}
                <div class="student-album">
                    <div class="album-name">${name}</div>
                    <div class="album-sub">${albums[name].grade}</div>
                    <div class="total-scans">${albums[name].logs.length} Scans</div>
                </div>
            ` : `
                <div class="attendance-row">
                    <span>${name}</span>
                    <span class="text-center">${albums[name].grade}</span>
                    <span class="text-right">${albums[name].lastTime}</span>
                </div>
            `;
            
            const clickable = container.querySelector('.student-album') || container.querySelector('.attendance-row');
            clickable.onclick = () => { if (!isSelectionMode && isHistoryPage) showPopUp(name, albums[name].logs); };
            table.appendChild(container);
        });
    });
}

// --- 7. MODALS ---
window.showPopUp = (name, logs) => {
    const list = document.getElementById('individualLogs');
    document.getElementById('modalStudentName').innerText = name;
    if (!list) return;
    list.innerHTML = '';
    logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'attendance-row popup-grid';
        item.innerHTML = `<span>${log.scannedAt || log.time}</span>
            <div class="log-actions">
                <button onclick="editLogEntry('${log.key}', '${log.studentName}')"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteLogEntry('${log.key}')"><i class="fa-solid fa-trash"></i></button>
            </div>`;
        list.appendChild(item);
    });
    document.getElementById('historyModal').style.display = 'flex';
};

document.getElementById('closeModal')?.addEventListener('click', () => {
    document.getElementById('historyModal').style.display = 'none';
});

processData();
