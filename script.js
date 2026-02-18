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

// --- 3. NAVIGATION ---
function smoothNavigate(url) {
    const panel = document.getElementById('mainPanel');
    if (panel) {
        panel.style.transition = "all 0.5s ease";
        panel.style.transform = "scale(0.9) opacity(0)";
    }
    setTimeout(() => { window.location.href = url; }, 500);
}

document.getElementById('navToHistory')?.addEventListener('click', () => smoothNavigate('history.html'));
document.getElementById('trashBinBtn')?.addEventListener('click', () => smoothNavigate('junk.html'));
document.getElementById('navToPortal')?.addEventListener('click', () => smoothNavigate('index.html'));

// Search Input Logic
document.getElementById('nameInput')?.addEventListener('input', (e) => {
    processData(e.target.value.toLowerCase());
});

// --- 4. IMPROVED DELETE (ERASER) LOGIC ---
const eraserBtn = document.getElementById('toggleDeleteMode');

eraserBtn?.addEventListener('click', async () => {
    if (isSelectionMode && selectedAlbums.size > 0) {
        const pass = prompt(`Enter Password to move ${selectedAlbums.size} items to Junk:`);
        
        if (pass === ADMIN_PASSWORD) {
            // We use a "For...Of" loop with await to ensure Firebase finishes each step
            for (let name of selectedAlbums) {
                const logsEntries = Object.entries(fullDataBuffer).filter(([k, v]) => v.studentName === name);
                
                if (logsEntries.length > 0) {
                    const trashId = `trash_${Date.now()}_${name.replace(/\s+/g, '_')}`;

                    // 1. Move to Junk Bin First
                    await set(ref(db, `trash/${trashId}`), {
                        studentName: name,
                        deletedAt: new Date().toLocaleString(),
                        logs: logsEntries.map(([key, val]) => ({ key, ...val }))
                    });

                    // 2. ONLY THEN Delete from active attendance
                    for (let [key] of logsEntries) {
                        await remove(ref(db, `attendance/${key}`));
                    }
                }
            }
            alert("Moved to Junk Bin successfully.");
            selectedAlbums.clear();
            isSelectionMode = false;
            eraserBtn.classList.remove('active');
            processData();
        } else if (pass !== null) {
            alert("Incorrect Password.");
        }
    } else {
        isSelectionMode = !isSelectionMode;
        if (!isSelectionMode) selectedAlbums.clear();
        eraserBtn?.classList.toggle('active', isSelectionMode);
        processData();
    }
});

// --- 5. RENDER DATA (FIXED FOR PORTAL VS HISTORY) ---
function processData(searchTerm = "") {
    const attRef = ref(db, 'attendance');
    const portalTable = document.getElementById('attendanceTable'); // For index.html
    const historyTable = document.getElementById('historyTable');   // For history.html
    
    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        fullDataBuffer = data || {}; 
        
        // --- LOGIC FOR MAIN PARENT PORTAL (index.html) ---
        if (portalTable) {
            portalTable.innerHTML = '';
            if (!data) return;

            Object.entries(data)
                .filter(([key, val]) => val.studentName?.toLowerCase().includes(searchTerm))
                .reverse() // Latest scans at the top
                .forEach(([key, val]) => {
                    const row = document.createElement('div');
                    row.className = 'attendance-row';
                    row.innerHTML = `
                        <span>${val.studentName || "Unknown"}</span>
                        <span class="text-center">${val.grade || "N/A"}</span>
                        <span class="text-right">${val.time || val.scannedAt || "No Time"}</span>
                    `;
                    portalTable.appendChild(row);
                });
        }

        // --- LOGIC FOR SCAN HISTORY (history.html) ---
        if (historyTable) {
            historyTable.innerHTML = '';
            if (!data) return;

            const albums = {};
            Object.entries(data).forEach(([key, val]) => {
                const sName = val.studentName || "Unknown";
                if (!albums[sName]) albums[sName] = { grade: val.grade, logs: [] };
                albums[sName].logs.push({ key, ...val });
            });

            Object.keys(albums)
                .filter(name => name.toLowerCase().includes(searchTerm))
                .forEach(name => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'album-row-wrapper';
                    
                    const checkboxHTML = isSelectionMode ? 
                        `<input type="checkbox" class="album-checkbox" onchange="toggleSelect('${name}')" ${selectedAlbums.has(name) ? 'checked' : ''}>` : '';

                    wrapper.innerHTML = `
                        ${checkboxHTML}
                        <div class="student-album">
                            <div class="album-icon"><i class="fa-solid fa-folder"></i></div>
                            <div class="album-name">${name}</div>
                            <div class="album-sub">${albums[name].grade}</div>
                            <div class="total-scans">${albums[name].logs.length} Total</div>
                        </div>
                    `;
                    
                    wrapper.querySelector('.student-album').onclick = () => {
                        if (!isSelectionMode) showPopUp(name, albums[name].logs);
                    };
                    historyTable.appendChild(wrapper);
                });
        }
    });
}

window.toggleSelect = (studentName) => {
    if (selectedAlbums.has(studentName)) selectedAlbums.delete(studentName);
    else selectedAlbums.add(studentName);
};

// --- 6. POPUP LOGIC ---
window.showPopUp = (name, logs) => {
    document.getElementById('modalStudentName').innerText = name;
    const list = document.getElementById('individualLogs');
    list.innerHTML = '';
    logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'attendance-row popup-grid';
        item.innerHTML = `
            <span>${log.scannedAt || log.time}</span>
            <div class="log-actions">
                <button onclick="editLogEntry('${log.key}', '${log.studentName}')"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteLogEntry('${log.key}')"><i class="fa-solid fa-trash"></i></button>
            </div>`;
        list.appendChild(item);
    });
    document.getElementById('historyModal').style.display = 'flex';
};

window.deleteLogEntry = (key) => {
    if (prompt("VERIFY ADMIN:") === ADMIN_PASSWORD) remove(ref(db, `attendance/${key}`));
};

window.editLogEntry = (key, currentName) => {
    const newName = prompt("Edit Name:", currentName);
    if (newName && prompt("VERIFY ADMIN:") === ADMIN_PASSWORD) {
        update(ref(db, `attendance/${key}`), { studentName: newName });
    }
};

document.getElementById('closeModal')?.addEventListener('click', () => {
    document.getElementById('historyModal').style.display = 'none';
});

processData();
