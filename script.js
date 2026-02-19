import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue, remove, update } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// 1. CONFIG
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

// 2. ANIMATION HELPER
function animateIcon(element) {
    if (!element) return;
    element.classList.add('icon-pop');
    setTimeout(() => element.classList.remove('icon-pop'), 400);
}

// 3. NAVIGATION & UI EVENTS
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
                setTimeout(() => window.location.href = routes[id], 250);
            };
        }
    });

    // Search Box Logic
    const searchTrigger = document.querySelector('.search-trigger');
    const searchBox = document.getElementById('searchBox');
    if (searchTrigger && searchBox) {
        searchTrigger.onclick = (e) => {
            animateIcon(e.currentTarget);
            searchBox.classList.toggle('active');
        };
    }
});

// 4. DATA PROCESSING (Your existing Firebase Logic)
// ... [Place your processData and showPopUp functions here] ...
