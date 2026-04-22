const gridElement = document.getElementById('grid');
const minesDisplay = document.getElementById('mines-count');
const timerDisplay = document.getElementById('timer');
const resetBtn = document.getElementById('reset-btn');
const difficultySelect = document.getElementById('difficulty');

// Звуки та UI
const boomSound = document.getElementById('boom-sound');
const winSound = document.getElementById('win-sound');
const loseSound = document.getElementById('lose-sound');
const soundBtn = document.getElementById('sound-btn');
const resultScreen = document.getElementById('result-screen');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const modalResetBtn = document.getElementById('modal-reset-btn');

let width = 9, height = 9, minesCount = 10;
let cells = [], isGameOver = false, flagsUsed = 0, timer = 0, timerInterval = null;
let soundEnabled = true;

const difficulties = {
    easy: { w: 9, h: 9, m: 10 },
    medium: { w: 16, h: 16, m: 40 },
    hard: { w: 20, h: 20, m: 80 },
    hardcore: { w: 25, h: 25, m: 130 }
};

// Управління звуком
soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundBtn.innerText = soundEnabled ? '🔊' : '🔇';
});

function playSound(audioEl) {
    if (soundEnabled) {
        audioEl.currentTime = 0;
        audioEl.play().catch(() => console.log('Аудіо заблоковано браузером до першого кліку'));
    }
}

function stopAllSounds() {
    boomSound.pause(); boomSound.currentTime = 0;
    winSound.pause(); winSound.currentTime = 0;
    loseSound.pause(); loseSound.currentTime = 0;
}

function setDifficulty() {
    const diff = difficulties[difficultySelect.value];
    width = diff.w; height = diff.h; minesCount = diff.m;
    gridElement.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
    init();
}

function init() {
    gridElement.innerHTML = ''; cells = [];
    isGameOver = false; flagsUsed = 0; timer = 0;
    clearInterval(timerInterval); timerInterval = null;
    resultScreen.classList.add('hidden');
    stopAllSounds();
    
    minesDisplay.innerText = minesCount; timerDisplay.innerText = "000";

    let minesArray = Array(minesCount).fill('mine')
        .concat(Array(width * height - minesCount).fill('empty'))
        .sort(() => Math.random() - 0.5);

    for (let i = 0; i < width * height; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell'); cell.dataset.id = i;
        if (minesArray[i] === 'mine') cell.dataset.mine = "true";
        
        cell.addEventListener('click', () => { if(!isGameOver) { startTimer(); click(cell); }});
        cell.oncontextmenu = (e) => { e.preventDefault(); if(!isGameOver) { startTimer(); addFlag(cell); }};

        // Мобільне управління (затиснути для прапорця)
        let touchTimer;
        cell.addEventListener('touchstart', (e) => {
            if(isGameOver) return;
            e.preventDefault(); startTimer();
            touchTimer = setTimeout(() => { addFlag(cell); touchTimer = null; }, 400);
        });
        cell.addEventListener('touchend', (e) => {
            if(isGameOver) return;
            e.preventDefault();
            if (touchTimer) { clearTimeout(touchTimer); click(cell); }
        });

        gridElement.appendChild(cell); cells.push(cell);
    }

    for (let i = 0; i < cells.length; i++) {
        if (cells[i].dataset.mine === "true") continue;
        let total = 0;
        const x = i % width; const y = Math.floor(i / width);
        for (let offY = -1; offY <= 1; offY++) {
            for (let offX = -1; offX <= 1; offX++) {
                let tY = y + offY; let tX = x + offX;
                if (tX >= 0 && tX < width && tY >= 0 && tY < height) {
                    if (cells[tY * width + tX].dataset.mine === "true") total++;
                }
            }
        }
        cells[i].dataset.v = total;
    }
}

function startTimer() {
    if (!timerInterval && !isGameOver) {
        timerInterval = setInterval(() => { timer++; timerDisplay.innerText = timer.toString().padStart(3, '0'); }, 1000);
    }
}

function addFlag(cell) {
    if (isGameOver || cell.classList.contains('opened')) return;
    if (!cell.classList.contains('flag') && flagsUsed < minesCount) {
        cell.classList.add('flag'); flagsUsed++;
    } else if (cell.classList.contains('flag')) {
        cell.classList.remove('flag'); flagsUsed--;
    }
    minesDisplay.innerText = (minesCount - flagsUsed).toString().padStart(2, '0');
    if ('vibrate' in navigator && soundEnabled) navigator.vibrate(50);
}

function click(cell) {
    if (isGameOver || cell.classList.contains('opened') || cell.classList.contains('flag')) return;
    if (cell.dataset.mine === "true") { gameOver(cell); } 
    else {
        let total = cell.dataset.v; cell.classList.add('opened');
        if (total != 0) {
            cell.innerHTML = total; cell.setAttribute('data-v', total);
        } else {
            const id = parseInt(cell.dataset.id);
            const x = id % width; const y = Math.floor(id / width);
            setTimeout(() => {
                for (let offY = -1; offY <= 1; offY++) {
                    for (let offX = -1; offX <= 1; offX++) {
                        let tY = y + offY; let tX = x + offX;
                        if (tX >= 0 && tX < width && tY >= 0 && tY < height) click(cells[tY * width + tX]);
                    }
                }
            }, 10);
        }
        checkWin();
    }
}

function showModal(title, message, isWin) {
    resultTitle.innerText = title;
    resultMessage.innerText = message;
    resultTitle.className = isWin ? 'win-title' : 'lose-title';
    resultScreen.classList.remove('hidden');
}

function checkWin() {
    const revealedCount = cells.filter(c => c.classList.contains('opened')).length;
    if (revealedCount === width * height - minesCount) {
        isGameOver = true; clearInterval(timerInterval);
        playSound(winSound);
        setTimeout(() => showModal('ПЕРЕМОГА! 🎉', `Ти розмінував поле за ${timer} секунд!`, true), 500);
    }
}

function gameOver(current) {
    isGameOver = true; clearInterval(timerInterval);
    
    playSound(boomSound);
    setTimeout(() => playSound(loseSound), 1000); // Сумна музика через секунду після вибуху

    if ('vibrate' in navigator && soundEnabled) navigator.vibrate([300, 100, 300]);

    cells.forEach(cell => {
        if (cell.dataset.mine === "true") {
            setTimeout(() => cell.classList.add('mine', 'opened'), Math.random() * 800);
        }
    });
    current.classList.add('exploded');
    
    setTimeout(() => showModal('ГРА ЗАКІНЧЕНА 💥', 'Ти наступив на міну. Спробуй ще раз!', false), 1500);
}

difficultySelect.addEventListener('change', setDifficulty);
resetBtn.addEventListener('click', init);
modalResetBtn.addEventListener('click', init);
setDifficulty();