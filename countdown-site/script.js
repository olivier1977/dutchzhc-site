// Countdown Timer Application

let countdownInterval = null;
let totalTime = 3600; // 1 hour in seconds
let currentTime = totalTime;
let isRunning = false;

const countdownDisplay = document.getElementById('countdown');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');

function updateDisplay() {
    const hours = Math.floor(currentTime / 3600);
    const minutes = Math.floor((currentTime % 3600) / 60);
    const seconds = currentTime % 60;

    const h = String(hours).padStart(2, '0');
    const m = String(minutes).padStart(2, '0');
    const s = String(seconds).padStart(2, '0');

    countdownDisplay.textContent = `${h}:${m}:${s}`;

    // Update CSS variable for percentage of progress
    const percentage = (currentTime / totalTime) * 100;
    countdownDisplay.style.background = `linear-gradient(90deg, #00ff88 ${percentage}%, #333 ${percentage}%)`;
    countdownDisplay.style.webkitBackgroundClip = 'text';
    countdownDisplay.style.webkitTextFillColor = 'transparent';
    countdownDisplay.style.backgroundClip = 'text';
}

function startCountdown() {
    if (isRunning) return;

    isRunning = true;
    countdownDisplay.classList.remove('flashing');

    startBtn.disabled = true;
    stopBtn.disabled = false;
    resetBtn.disabled = true;

    countdownInterval = setInterval(() => {
        currentTime--;

        if (currentTime < 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            countdownDisplay.classList.add('flashing');
            stopBtn.disabled = true;
            isRunning = false;
        }

        updateDisplay();
    }, 1000);
}

function stopCountdown() {
    if (!isRunning) return;

    clearInterval(countdownInterval);
    countdownInterval = null;
    isRunning = false;

    startBtn.disabled = false;
    stopBtn.disabled = true;
}

function resetCountdown() {
    clearInterval(countdownInterval);
    countdownInterval = null;
    isRunning = false;
    currentTime = totalTime;

    countdownDisplay.classList.remove('flashing');
    updateDisplay();

    startBtn.disabled = false;
    stopBtn.disabled = true;
    resetBtn.disabled = true;
}

// Event listeners
startBtn.addEventListener('click', startCountdown);
stopBtn.addEventListener('click', stopCountdown);
resetBtn.addEventListener('click', resetCountdown);

// Initial display
updateDisplay();
