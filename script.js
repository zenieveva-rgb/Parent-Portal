import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

document.getElementById('searchBtn').onclick = () => {
    const lrn = document.getElementById('lrnInput').value.trim();
    const table = document.getElementById('attendanceTable');

    if(!lrn) return alert("Enter LRN");

    const attRef = query(ref(db, 'attendance'), orderByChild('lrn'), equalTo(lrn));

    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        table.innerHTML = ''; // Clear previous

        if(data) {
            Object.values(data).forEach(log => {
                const time = new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                table.innerHTML += `
                    <div class="attendance-row">
                        <span>${log.displayName}</span>
                        <span>${log.grade || 'N/A'}</span>
                        <span>${time}</span>
                    </div>
                `;
            });
        } else {
            table.innerHTML = '<p style="text-align:center; font-size:12px; color:red;">No record found.</p>';
        }
    });
};
