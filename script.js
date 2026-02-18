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

// --- 3. NAVIGATION & SEARCH ---
function smoothNavigate(url) {
    const panel = document.getElementById('mainPanel');
    if (panel) {
        panel.style.transition = "all 0.5s ease";
        panel.style.transform = "scale(0.9) translateY(20px)";
        panel.style.opacity = "0";
    }
    setTimeout(() => { window.location.href = url; }, 500);
}

document.getElementById('navToPortal')?.addEventListener('click', () => smoothNavigate('index.html'));
document.getElementById('trashBinBtn')?.addEventListener('click', () => smoothNavigate('junk.html'));
document.getElementById('navToHistory')?.addEventListener('click', () => smoothNavigate('history.html'));

document.getElementById('nameInput')?.addEventListener('input', (e) => {
    processData(e.target.value.toLowerCase());
});

// --- 4. THE EASY DELETE (ERASER LOGIC) ---
const eraserBtn = document.getElementById('toggleDeleteMode');

eraserBtn?.addEventListener('click', async () => {
    // If we are in selection mode AND items are picked, clicking eraser DELETEs
    if (isSelectionMode && selectedAlbums.size > 0) {
        const pass = prompt(`VERIFY: Enter Password to move ${selectedAlbums.size} items to Junk:`);
        
        if (pass === ADMIN_PASSWORD) {
            for (let name of selectedAlbums) {
                const logs = Object.entries(fullDataBuffer).filter(([k, v]) => v.studentName === name);
                const trashId = `trash_${Date.now()}_${name.replace(/\s+/g, '_')}`;

                // Move to Trash Node
                await set(ref(db, `trash/${trashId}`), {
                    studentName: name,
                    deletedAt: new Date().toLocaleString(),
                    logs: logs.map(([key, val]) => ({ key, ...val }))
                });

                // Delete from Active Node
                for (let [key] of logs) { await remove(ref(db, `attendance/${key}`)); }
            }
            alert("Success: Moved to Junk.");
            selectedAlbums.clear();
            isSelectionMode = false;
        } else if (pass !== null) {
            alert("Wrong Password.");
        }
    } else {
        // Otherwise, just toggle selection mode on/off
        isSelectionMode = !isSelectionMode;
        if (!isSelectionMode) selectedAlbums.clear();
    }

    // Toggle red glow
    eraserBtn.classList.toggle('active', isSelectionMode);
    processData();
});

window.toggleSelect = (studentName) => {
    if (selectedAlbums.has(studentName)) selectedAlbums.delete(studentName);
    else selectedAlbums.add(studentName);
};

// --- 5. RENDER DATA ---
function processData(searchTerm = "") {
    const attRef = ref(db, 'attendance');
    const table = document.getElementById('historyTable') || document.getElementById('attendanceTable');
    if (!table) return;

    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        fullDataBuffer = data || {}; 
        table.innerHTML = '';
        if (!data) return;

        const albums = {};
        Object.entries(data).forEach(([key, val]) => {
            const sName = val.studentName || "Unknown";
            if (!albums[sName]) albums[sName] = { grade: val.grade, logs: [] };
            albums[sName].logs.push({ key, ...val });
        });

        Object.keys(albums).filter(name => name.toLowerCase().includes(searchTerm)).forEach(name => {
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
            table.appendChild(wrapper);
        });
    });
}

// --- 6. MODAL ACTIONS ---
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
    if (prompt("ADMIN PASSWORD:") === ADMIN_PASSWORD) remove(ref(db, `attendance/${key}`));
};

window.editLogEntry = (key, currentName) => {
    const newName = prompt("Edit Name:", currentName);
    if (newName && prompt("ADMIN PASSWORD:") === ADMIN_PASSWORD) {
        update(ref(db, `attendance/${key}`), { studentName: newName });
    }
};

document.getElementById('closeModal')?.addEventListener('click', () => {
    document.getElementById('historyModal').style.display = 'none';
});

processData();
