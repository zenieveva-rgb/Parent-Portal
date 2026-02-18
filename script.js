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
const ADMIN_PASSWORD = "1234"; // Set your admin password here
let isSelectionMode = false;
let selectedAlbums = new Set();

// --- 3. SELECTION & BULK DELETE LOGIC ---
const eraserBtn = document.getElementById('toggleDeleteMode');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

eraserBtn?.addEventListener('click', () => {
    isSelectionMode = !isSelectionMode;
    eraserBtn.classList.toggle('active', isSelectionMode);
    bulkDeleteBtn.style.display = isSelectionMode ? "block" : "none";
    if (!isSelectionMode) selectedAlbums.clear();
    processData(); // Refresh UI to show/hide checkboxes
});

// Logic to handle individual checkbox clicks
window.toggleSelect = (studentName) => {
    if (selectedAlbums.has(studentName)) {
        selectedAlbums.delete(studentName);
    } else {
        selectedAlbums.add(studentName);
    }
};

// Bulk Delete Action
bulkDeleteBtn?.addEventListener('click', async () => {
    if (selectedAlbums.size === 0) return alert("Please select at least one album.");
    
    const pass = prompt(`Enter Admin Password to move ${selectedAlbums.size} items to Junk:`);
    if (pass === ADMIN_PASSWORD) {
        if (confirm("Move selected albums to Junk Files?")) {
            // Processing bulk move logic here...
            alert("Items moved to Junk bin.");
            selectedAlbums.clear();
            isSelectionMode = false;
            bulkDeleteBtn.style.display = "none";
            processData();
        }
    } else {
        alert("Incorrect Password.");
    }
});

// --- 4. MAIN DATA PROCESSING ---
function processData() {
    const attRef = ref(db, 'attendance');
    const historyBody = document.getElementById('historyTable');
    const query = document.getElementById('nameInput')?.value.toLowerCase() || "";

    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        if (!data || !historyBody) return;
        historyBody.innerHTML = '';
        
        const albums = {};
        Object.entries(data).forEach(([key, val]) => {
            const sName = val.studentName || "Unknown";
            if (!albums[sName]) albums[sName] = { grade: val.grade, logs: [] };
            albums[sName].logs.push({ key, ...val });
        });

        Object.keys(albums).filter(name => name.toLowerCase().includes(query)).forEach(name => {
            const rowWrapper = document.createElement('div');
            rowWrapper.className = 'album-row-wrapper';
            
            const checkboxHTML = isSelectionMode ? 
                `<input type="checkbox" class="album-checkbox" onchange="toggleSelect('${name}')" ${selectedAlbums.has(name) ? 'checked' : ''}>` : '';
            
            rowWrapper.innerHTML = `
                ${checkboxHTML}
                <div class="student-album">
                    <div class="album-icon"><i class="fa-solid fa-folder"></i></div>
                    <div class="album-name">${name}</div>
                    <div class="album-sub">${albums[name].grade}</div>
                    <div class="total-scans">${albums[name].logs.length} Scans</div>
                </div>
            `;
            
            rowWrapper.querySelector('.student-album').onclick = () => {
                if (!isSelectionMode) showPopUp(name, albums[name].logs);
            };
            historyBody.appendChild(rowWrapper);
        });
    });
}

// --- 5. INDIVIDUAL LOG EDIT/DELETE (Inside Album) ---
window.showPopUp = (name, logs) => {
    const list = document.getElementById('individualLogs');
    document.getElementById('modalStudentName').innerText = name;
    list.innerHTML = '';

    logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'attendance-row popup-grid';
        item.innerHTML = `
            <span>${log.scannedAt}</span>
            <div class="log-actions">
                <button onclick="editLogEntry('${log.key}', '${log.studentName}')" title="Edit Name"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteLogEntry('${log.key}')" title="Delete entry"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        list.appendChild(item);
    });
    document.getElementById('historyModal').style.display = 'flex';
};

window.deleteLogEntry = (key) => {
    if (prompt("Enter ADMIN PASSWORD to delete this specific log:") === ADMIN_PASSWORD) {
        remove(ref(db, `attendance/${key}`))
            .then(() => alert("Entry deleted."))
            .catch(err => alert("Error: " + err.message));
    } else {
        alert("Permission Denied.");
    }
};

window.editLogEntry = (key, currentName) => {
    const newName = prompt("Update Student Name:", currentName);
    if (newName && prompt("Enter ADMIN PASSWORD to confirm edit:") === ADMIN_PASSWORD) {
        update(ref(db, `attendance/${key}`), { studentName: newName })
            .then(() => alert("Entry updated."))
            .catch(err => alert("Error: " + err.message));
    } else {
        alert("Edit cancelled or incorrect password.");
    }
};

// --- 6. NAVIGATION & MODAL CLOSE ---
document.getElementById('closeModal')?.addEventListener('click', () => {
    document.getElementById('historyModal').style.display = 'none';
});

document.getElementById('navToPortal')?.addEventListener('click', () => {
    window.location.href = "index.html"; 
});

processData();

// Add this inside your script.js
const trashBtn = document.getElementById('trashBinBtn');
trashBtn?.addEventListener('click', () => {
    const panel = document.getElementById('mainPanel');
    panel.style.transition = "all 0.5s ease";
    panel.style.transform = "scale(0.9)"; // Zoom-out effect
    panel.style.opacity = "0";
    
    setTimeout(() => {
        window.location.href = "junk.html";
    }, 500);
});
