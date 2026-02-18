import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue, set, remove, update, get } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

// --- 3. NAVIGATION WITH ANIMATION ---
function smoothNavigate(url) {
    const panel = document.getElementById('mainPanel');
    if (panel) {
        panel.style.transition = "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
        panel.style.transform = "scale(0.9) translateY(20px)";
        panel.style.opacity = "0";
        panel.style.filter = "blur(10px)";
    }
    setTimeout(() => { window.location.href = url; }, 500);
}

// Attach listeners to navigation icons
document.getElementById('trashBinBtn')?.addEventListener('click', () => smoothNavigate('junk.html'));
document.getElementById('navToPortal')?.addEventListener('click', () => smoothNavigate('index.html'));
document.getElementById('navToHistory')?.addEventListener('click', () => smoothNavigate('history.html'));

// --- 4. SELECTION & BULK DELETE LOGIC ---
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
    if (selectedAlbums.size === 0) return alert("Select at least one album.");
    
    const pass = prompt(`Enter Admin Password to move ${selectedAlbums.size} items to Junk:`);
    if (pass === ADMIN_PASSWORD) {
        if (confirm("Move selected albums to Junk?")) {
            for (let name of selectedAlbums) {
                const logsToMove = Object.entries(fullDataBuffer)
                    .filter(([key, val]) => val.studentName === name);

                const trashId = Date.now() + "_" + name.replace(/\s+/g, '_');
                
                // Move to Trash Node
                await set(ref(db, `trash/${trashId}`), {
                    studentName: name,
                    deletedAt: new Date().toLocaleString(),
                    data: logsToMove.map(([key, val]) => ({ key, ...val }))
                });

                // Remove from Attendance
                for (let [key] of logsToMove) {
                    await remove(ref(db, `attendance/${key}`));
                }
            }
            alert("Moved to Junk bin successfully.");
            selectedAlbums.clear();
            isSelectionMode = false;
            if (bulkDeleteBtn) bulkDeleteBtn.style.display = "none";
            processData();
        }
    } else {
        alert("Incorrect Password.");
    }
});

// --- 5. DATA PROCESSING ---
function processData() {
    const attRef = ref(db, 'attendance');
    const historyBody = document.getElementById('historyTable');
    const query = document.getElementById('nameInput')?.value.toLowerCase() || "";

    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        fullDataBuffer = data || {}; 
        if (!historyBody) return;
        historyBody.innerHTML = '';
        
        if (!data) {
            historyBody.innerHTML = '<p style="text-align:center; padding:20px; color:gray;">No scans found.</p>';
            return;
        }

        const albums = {};
        Object.entries(data).forEach(([key, val]) => {
            const sName = val.studentName || "Unknown";
            if (!albums[sName]) albums[sName] = { grade: val.grade, logs: [] };
            albums[sName].logs.push({ key, ...val });
        });

        Object.keys(albums).filter(name => name.toLowerCase().includes(query)).forEach(name => {
            const row = document.createElement('div');
            row.className = 'album-row-wrapper';
            
            const checkboxHTML = isSelectionMode ? 
                `<input type="checkbox" class="album-checkbox" onchange="toggleSelect('${name}')" ${selectedAlbums.has(name) ? 'checked' : ''}>` : '';
            
            row.innerHTML = `
                ${checkboxHTML}
                <div class="student-album">
                    <div class="album-icon"><i class="fa-solid fa-folder"></i></div>
                    <div class="album-name">${name}</div>
                    <div class="album-sub">${albums[name].grade}</div>
                    <div class="total-scans">${albums[name].logs.length} Scans</div>
                </div>
            `;
            
            row.querySelector('.student-album').onclick = () => {
                if (!isSelectionMode) showPopUp(name, albums[name].logs);
            };
            historyBody.appendChild(row);
        });
    });
}

// --- 6. INDIVIDUAL LOG ACTIONS ---
window.showPopUp = (name, logs) => {
    const list = document.getElementById('individualLogs');
    const modalName = document.getElementById('modalStudentName');
    if (modalName) modalName.innerText = name;
    if (!list) return;
    list.innerHTML = '';

    logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'attendance-row popup-grid';
        item.innerHTML = `
            <span>${log.scannedAt}</span>
            <div class="log-actions">
                <button onclick="editLogEntry('${log.key}', '${log.studentName}')"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteLogEntry('${log.key}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        list.appendChild(item);
    });
    document.getElementById('historyModal').style.display = 'flex';
};

window.deleteLogEntry = (key) => {
    if (prompt("ADMIN PASSWORD:") === ADMIN_PASSWORD) {
        remove(ref(db, `attendance/${key}`)).then(() => alert("Deleted."));
    }
};

window.editLogEntry = (key, currentName) => {
    const newName = prompt("New Student Name:", currentName);
    if (newName && prompt("ADMIN PASSWORD:") === ADMIN_PASSWORD) {
        update(ref(db, `attendance/${key}`), { studentName: newName });
    }
};

// --- 7. CLOSING MODAL ---
document.getElementById('closeModal')?.addEventListener('click', () => {
    document.getElementById('historyModal').style.display = 'none';
});

processData();
