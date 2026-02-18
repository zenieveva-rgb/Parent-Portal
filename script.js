import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

const tableBody = document.getElementById('attendanceTable');
const nameInput = document.getElementById('nameInput');
const searchBtn = document.getElementById('searchBtn');
const searchBox = document.getElementById('searchBox');

// --- 1. SEARCH ANIMATION LOGIC ---

searchBtn.addEventListener('click', () => {
    if (!searchBox.classList.contains('active')) {
        searchBox.classList.add('active');
        nameInput.focus();
    } else {
        // If it's already open, clear and close it
        closeSearch();
    }
});

// Auto-hide if user clicks away and input is empty
nameInput.addEventListener('blur', () => {
    if (nameInput.value.trim() === "") {
        setTimeout(closeSearch, 200);
    }
});

function closeSearch() {
    searchBox.classList.remove('active');
    nameInput.value = '';
    performSearch(); // Refresh list to show all
}

// --- 2. DATA FETCHING LOGIC ---

function performSearch() {
    const queryName = nameInput.value.trim().toLowerCase();
    const attRef = ref(db, 'attendance');

    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        tableBody.innerHTML = ''; 

        if (data) {
            const records = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
            
            records.filter(r => r.displayName.toLowerCase().includes(queryName))
            .forEach(log => {
                const time = new Date(log.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });

                const row = document.createElement('div');
                row.className = 'attendance-row';
                row.innerHTML = `
                    <span class="col-name">${log.displayName}</span>
                    <span class="col-grade">${log.grade || 'N/A'}</span>
                    <span class="col-time">${time}</span>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<p style="text-align:center; color:white; opacity:0.5; padding:20px;">No records yet.</p>';
        }
    });
}

nameInput.addEventListener('input', performSearch);
performSearch();
