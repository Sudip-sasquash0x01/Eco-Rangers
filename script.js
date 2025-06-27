// Game State - Optimized for performance
let gameState = {
    score: 0,
    level: 1,
    timeLeft: 60,
    streak: 0,
    maxStreak: 0,
    currentItems: [],
    gameTimer: null,
    itemsCollected: 0,
    totalItems: 0,
    powerUps: [],
    specialMode: false,
    comboMultiplier: 1,
    levelStartTime: Date.now(),
    currentBinTypes: ['plastic', 'paper', 'glass', 'organic'],
    gameMode: 'adventure', // adventure, zen, timeattack, challenge
    soundEnabled: true,
    isDailyChallenge: false,
    isPaused: false,
    timeBonusCount: 0 // Track how many time bonuses awarded in daily challenge
};

// Save Game State (In-memory for demo - would use localStorage in real app)
let savedGameState = null;

function saveGameProgress() {
    // NOTE: This uses in-memory storage for the web demo
    // In a real mobile app, you would replace this with:
    // localStorage.setItem('ecoRangersGameSave', JSON.stringify(gameState));
    // or native device storage for persistent saves
    
    savedGameState = {
        ...gameState,
        currentItems: [...gameState.currentItems],
        gameTimer: null, // Don't save timer reference
        savedAt: Date.now()
    };
    
    showSaveStatus('Game Saved! 💾');
}

function loadGameProgress() {
    // NOTE: In a real app, this would be:
    // const saved = localStorage.getItem('ecoRangersGameSave');
    // return saved ? JSON.parse(saved) : null;
    
    if (savedGameState) {
        // Restore game state
        gameState = {
            ...savedGameState,
            gameTimer: null,
            isPaused: false
        };
        return true;
    }
    return false;
}

function clearSavedGame() {
    // NOTE: In a real app, this would be:
    // localStorage.removeItem('ecoRangersGameSave');
    
    savedGameState = null;
    updateResumeButton();
}

function showSaveStatus(message) {
    const existingStatus = document.querySelector('.save-status');
    if (existingStatus) existingStatus.remove();
    
    const status = document.createElement('div');
    status.className = 'save-status';
    status.textContent = message;
    document.body.appendChild(status);
    
    setTimeout(() => status.remove(), 3000);
}

function updateResumeButton() {
    const resumeNotice = document.getElementById('resumeNotice');
    const resumeBtn = document.getElementById('resumeBtn');
    
    if (savedGameState) {
        resumeNotice.classList.remove('hidden');
        resumeBtn.classList.remove('hidden');
        
        // Update resume notice with save info
        const saveDate = new Date(savedGameState.savedAt);
        const timeAgo = Math.floor((Date.now() - savedGameState.savedAt) / 60000);
        resumeNotice.innerHTML = `
            🎮 Saved Game Found!<br>
            Level ${savedGameState.level} - ${savedGameState.gameMode} mode<br>
            <small>Saved ${timeAgo < 1 ? 'just now' : timeAgo + ' minutes ago'}</small>
        `;
    } else {
        resumeNotice.classList.add('hidden');
        resumeBtn.classList.add('hidden');
    }
}

// Sound System using Web Audio API
let audioContext;
let sounds = {};

function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        createSounds();
    } catch (e) {
        console.log('Audio not supported');
        gameState.soundEnabled = false;
    }
}

function createSounds() {
    // Create pleasant sound effects using oscillators
    sounds.correctSort = createSound([523.25, 659.25, 783.99], 0.3, 'sine'); // C-E-G chord
    sounds.wrongSort = createSound([246.94], 0.5, 'sawtooth'); // Low B
    sounds.levelComplete = createSound([523.25, 587.33, 659.25, 698.46, 783.99], 0.6, 'sine'); // C major scale
    sounds.goldenItem = createSound([880, 1108.73, 1318.51], 0.4, 'triangle'); // Golden chimes
    sounds.streak = createSound([659.25, 783.99, 987.77], 0.3, 'sine'); // Streak sound
    sounds.buttonClick = createSound([440], 0.1, 'triangle'); // Simple click
    sounds.ambient = createAmbientSound(); // Gentle background
}

function createSound(frequencies, duration, type = 'sine') {
    return {
        play: () => {
            if (!gameState.soundEnabled || !audioContext) return;
            
            frequencies.forEach((freq, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                oscillator.type = type;
                
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                
                oscillator.start(audioContext.currentTime + index * 0.1);
                oscillator.stop(audioContext.currentTime + duration + index * 0.1);
            });
        }
    };
}

function createAmbientSound() {
    return {
        start: () => {
            if (!gameState.soundEnabled || !audioContext) return;
            // Gentle nature-like ambient sound
            const playAmbient = () => {
                if (!gameState.soundEnabled) return;
                
                const frequencies = [261.63, 329.63, 392]; // C-E-G soft chord
                frequencies.forEach((freq, index) => {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                    oscillator.type = 'sine';
                    
                    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0.02, audioContext.currentTime + 1);
                    gainNode.gain.linearRampToValueAtTime(0.02, audioContext.currentTime + 8);
                    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 10);
                    
                    oscillator.start(audioContext.currentTime + index * 0.5);
                    oscillator.stop(audioContext.currentTime + 10);
                });
                
                setTimeout(playAmbient, 15000); // Play every 15 seconds
            };
            playAmbient();
        }
    };
}

function playSound(soundName) {
    if (sounds[soundName]) {
        sounds[soundName].play();
    }
}

function toggleSound() {
    gameState.soundEnabled = !gameState.soundEnabled;
    const toggle = document.getElementById('soundToggle');
    toggle.textContent = gameState.soundEnabled ? '🔊' : '🔇';
    
    if (gameState.soundEnabled && audioContext) {
        audioContext.resume();
        playSound('buttonClick');
    }
}

// Game Mode Functions
function selectMode(mode) {
    // Reset button styles
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    
    // COMPLETELY RESET mode-specific state when switching modes
    gameState.gameMode = mode;
    gameState.isDailyChallenge = false; // Always reset this
    gameState.level = 1; // Reset level when switching modes
    gameState.timeBonusCount = 0; // Reset time bonus count
    
    // Set the active button
    document.getElementById(mode === 'adventure' ? 'adventureBtn' : 
                            mode === 'zen' ? 'zenBtn' : 
                            mode === 'timeattack' ? 'timeAttackBtn' : 'challengeBtn').classList.add('active');
    
    playSound('buttonClick');
    
    // Update start button text based on mode
    const startBtn = document.querySelector('.start-btn');
    const modeTexts = {
        adventure: '🚀 START EPIC ADVENTURE',
        zen: '🧘 START ZEN JOURNEY',
        timeattack: '⚡ START TIME ATTACK',
        challenge: '🔥 START DAILY CHALLENGE'
    };
    startBtn.textContent = modeTexts[mode];
    
    // Show level info for daily challenge - but DON'T change the actual level yet
    const resumeNotice = document.getElementById('resumeNotice');
    if (mode === 'challenge' && !savedGameState) {
        const challengeLevel = getDailyChallengeLevel();
        resumeNotice.classList.remove('hidden');
        resumeNotice.innerHTML = `
            🔥 Today's Challenge: Level ${challengeLevel}<br>
            <small>Special difficulty with time bonuses!</small>
        `;
    } else if (mode !== 'challenge') {
        // Hide challenge notice if switching away from challenge mode
        if (!savedGameState) {
            resumeNotice.classList.add('hidden');
        }
    }
}

function applyGameMode() {
    const gameScreen = document.getElementById('gameScreen');
    
    // Remove existing mode classes
    gameScreen.classList.remove('zen-mode', 'challenge-mode');
    
    // DO NOT RESET LEVEL HERE - this was causing the bug!
    // Level should only be reset when starting new games
    
    switch (gameState.gameMode) {
        case 'zen':
            gameScreen.classList.add('zen-mode');
            // Zen mode: No timer, peaceful gameplay
            gameState.timeLeft = 999;
            break;
            
        case 'timeattack':
            // Time Attack: Shorter time, more points
            const level = levels[gameState.level - 1];
            gameState.timeLeft = Math.max(30, level.time - 20);
            break;
            
        case 'challenge':
            gameScreen.classList.add('challenge-mode');
            gameState.isDailyChallenge = true;
            // Daily challenge level is set in startGame()
            break;
            
        default: // adventure
            // Normal gameplay
            gameState.isDailyChallenge = false;
            break;
    }
}

// Navigation Functions
function goBackToMenu() {
    playSound('buttonClick');
    
    // Pause the game if it's running
    if (gameState.gameTimer) {
        clearInterval(gameState.gameTimer);
        gameState.gameTimer = null;
    }
    
    // Hide all screens
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('completeScreen').classList.add('hidden');
    document.getElementById('pauseMenu').classList.add('hidden');
    
    // Remove any mode classes and badges
    const gameScreen = document.getElementById('gameScreen');
    gameScreen.classList.remove('zen-mode', 'challenge-mode');
    const existingBadge = document.querySelector('.daily-badge');
    if (existingBadge) existingBadge.remove();
    
    // Show start screen
    document.getElementById('startScreen').classList.remove('hidden');
    
    // Update resume button visibility
    updateResumeButton();
}

function pauseGame() {
    if (gameState.isPaused) return;
    
    playSound('buttonClick');
    gameState.isPaused = true;
    
    // Pause timer
    if (gameState.gameTimer) {
        clearInterval(gameState.gameTimer);
    }
    
    // Show pause menu
    document.getElementById('pauseMenu').classList.remove('hidden');
}

function resumeFromPause() {
    playSound('buttonClick');
    gameState.isPaused = false;
    
    // Hide pause menu
    document.getElementById('pauseMenu').classList.add('hidden');
    
    // Resume timer if not in zen mode
    if (gameState.gameMode !== 'zen' && gameState.timeLeft > 0) {
        startTimer();
    }
}

function saveAndQuit() {
    playSound('buttonClick');
    
    // Save current progress
    saveGameProgress();
    
    // Go back to menu
    goBackToMenu();
}

function restartLevel() {
    playSound('buttonClick');
    
    // Hide pause menu
    document.getElementById('pauseMenu').classList.add('hidden');
    gameState.isPaused = false;
    
    // Reset level progress but keep level number and game mode
    gameState.itemsCollected = 0;
    gameState.streak = 0;
    gameState.comboMultiplier = 1;
    
    // Don't reset timeBonusCount for daily challenge continuation
    // Don't change the level number - just restart current level
    
    // Reinitialize the current level
    applyGameMode();
    initializeLevel();
}

function resumeGame() {
    playSound('buttonClick');
    
    if (loadGameProgress()) {
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameScreen').classList.remove('hidden');
        
        // Apply the saved game mode
        applyGameMode();
        
        // Restore the level state
        updateDisplay();
        updateLevelBackground();
        generateBins();
        updateAnimals();
        
        // Restore trash items
        const container = document.getElementById('trashItems');
        container.innerHTML = '';
        gameState.currentItems.forEach((itemData, index) => {
            const item = document.createElement('div');
            item.className = `trash-item ${itemData.type}${itemData.golden ? ' golden' : ''}`;
            item.textContent = itemData.emoji;
            item.draggable = true;
            item.dataset.type = itemData.type;
            item.dataset.id = index;
            item.dataset.golden = itemData.golden;
            item.ondragstart = drag;
            item.onclick = () => touchSort(item);
            container.appendChild(item);
        });
        
        // Add daily challenge badge if needed
        if (gameState.isDailyChallenge) {
            const badge = document.createElement('div');
            badge.className = 'daily-badge';
            badge.innerHTML = `
                🏆 Daily Challenge<br>
                <small>⚡ 5-streak = Time Bonus!</small>
            `;
            document.getElementById('gameScreen').appendChild(badge);
        }
        
        // Resume timer if needed
        if (gameState.gameMode !== 'zen' && gameState.timeLeft > 0) {
            startTimer();
        }
        
        // Clear saved game since we've resumed
        clearSavedGame();
        
        showSuccessAnimation('🎮 Game Resumed!');
    }
}

// Level definitions - 100 levels with varied challenges
const levels = [
    // Levels 1-3: Tutorial levels (easy)
    { location: "🏞️ Forest Park", description: "Learn to sort! Help clean this beautiful forest!", bg: "linear-gradient(to bottom, #87CEEB 0%, #98FB98 70%, #90EE90 100%)", items: 6, time: 90, types: ['plastic', 'paper'], special: null, animals: ['🐻', '🦌', '🐿️'] },
    { location: "🌳 Nature Trail", description: "Great job! Now try with more items!", bg: "linear-gradient(to bottom, #98FB98 0%, #90EE90 50%, #8FBC8F 100%)", items: 8, time: 85, types: ['plastic', 'paper', 'glass'], special: null, animals: ['🦝', '🐸', '🦎'] },
    { location: "🌲 Pine Forest", description: "You're getting good at this!", bg: "linear-gradient(to bottom, #228B22 0%, #32CD32 50%, #98FB98 100%)", items: 10, time: 80, types: ['plastic', 'paper', 'glass', 'organic'], special: null, animals: ['🐺', '🦉', '🐿️'] },
    
    // Levels 4-20: Basic challenges
    { location: "🏖️ Sunny Beach", description: "Save the marine life!", bg: "linear-gradient(to bottom, #87CEEB 0%, #F0E68C 50%, #DEB887 100%)", items: 12, time: 75, types: ['plastic', 'glass', 'organic'], special: null, animals: ['🐠', '🦀', '🐙'] },
    { location: "🏔️ Mountain Peak", description: "Keep the mountains clean!", bg: "linear-gradient(to bottom, #87CEEB 0%, #D3D3D3 50%, #F5F5F5 100%)", items: 14, time: 70, types: ['plastic', 'paper', 'glass', 'organic'], special: null, animals: ['🦅', '🐐', '🦌'] },
    { location: "🌆 City Park", description: "Urban cleanup mission!", bg: "linear-gradient(to bottom, #87CEEB 0%, #98FB98 30%, #9ACD32 100%)", items: 16, time: 70, types: ['plastic', 'paper', 'glass', 'organic', 'electronic'], special: null, animals: ['🐦', '🐿️', '🦆'] },
    { location: "🦋 Butterfly Garden", description: "Protect the butterflies!", bg: "linear-gradient(to bottom, #FFB6C1 0%, #98FB98 50%, #DDA0DD 100%)", items: 14, time: 65, types: ['plastic', 'paper', 'organic'], special: 'gentle', animals: ['🦋', '🐝', '🐞'] },
    { location: "🌊 River Bank", description: "Clean water for everyone!", bg: "linear-gradient(to bottom, #87CEEB 0%, #4682B4 50%, #5F9EA0 100%)", items: 18, time: 65, types: ['plastic', 'glass', 'organic', 'metal'], special: null, animals: ['🦆', '🐸', '🦢'] },
    { location: "🏕️ Camping Site", description: "Leave no trace behind!", bg: "linear-gradient(to bottom, #8FBC8F 0%, #556B2F 50%, #6B8E23 100%)", items: 16, time: 60, types: ['plastic', 'paper', 'glass', 'organic'], special: null, animals: ['🦝', '🐻', '🦔'] },
    { location: "🌺 Tropical Beach", description: "Paradise needs protection!", bg: "linear-gradient(to bottom, #00CED1 0%, #FFE4B5 50%, #F0E68C 100%)", items: 20, time: 60, types: ['plastic', 'glass', 'organic'], special: 'golden', animals: ['🦜', '🐠', '🦎'] },
    
    // Levels 11-30: Medium challenges with special mechanics
    { location: "🏺 Ancient Ruins", description: "Preserve history!", bg: "linear-gradient(to bottom, #F4A460 0%, #CD853F 50%, #D2B48C 100%)", items: 18, time: 55, types: ['plastic', 'paper', 'glass', 'metal'], special: 'speed', animals: ['🦎', '🐍', '🦅'] },
    { location: "🌋 Volcano Base", description: "Hot cleanup mission!", bg: "linear-gradient(to bottom, #FF4500 0%, #FF6347 50%, #CD853F 100%)", items: 22, time: 50, types: ['plastic', 'glass', 'metal'], special: 'time-pressure', animals: ['🦎', '🐉', '🔥'] },
    { location: "❄️ Snowy Mountains", description: "Winter wonderland cleanup!", bg: "linear-gradient(to bottom, #B0E0E6 0%, #F0F8FF 50%, #FFFAFA 100%)", items: 16, time: 65, types: ['plastic', 'paper', 'glass', 'organic'], special: 'slow-motion', animals: ['🐧', '❄️', '🦌'] },
    { location: "🌵 Desert Oasis", description: "Every drop counts!", bg: "linear-gradient(to bottom, #F4A460 0%, #DEB887 50%, #F5DEB3 100%)", items: 20, time: 45, types: ['plastic', 'glass', 'metal'], special: 'water-theme', animals: ['🦎', '🐪', '🌵'] },
    { location: "🎡 Fun Fair", description: "Keep the fun clean!", bg: "linear-gradient(to bottom, #FF69B4 0%, #FFB6C1 50%, #FFC0CB 100%)", items: 24, time: 55, types: ['plastic', 'paper', 'organic'], special: 'carnival', animals: ['🎪', '🎠', '🎈'] },
    
    // Continue pattern for levels 16-100...
    // Adding variety every 5-10 levels
];

// Generate remaining levels programmatically
function generateLevels() {
    const locations = [
        { name: "🏛️ Museum Garden", bg: "linear-gradient(to bottom, #DDA0DD 0%, #DA70D6 50%, #BA55D3 100%)", animals: ['🦉', '📚', '🎨'] },
        { name: "🚢 Harbor Cleanup", bg: "linear-gradient(to bottom, #4682B4 0%, #5F9EA0 50%, #708090 100%)", animals: ['⚓', '🐟', '🦭'] },
        { name: "🌸 Cherry Blossom Park", bg: "linear-gradient(to bottom, #FFB6C1 0%, #FFC0CB 50%, #FFCCCB 100%)", animals: ['🌸', '🦋', '🐝'] },
        { name: "🏰 Castle Grounds", bg: "linear-gradient(to bottom, #9370DB 0%, #8A2BE2 50%, #4B0082 100%)", animals: ['🦅', '👑', '🏰'] },
        { name: "🎋 Bamboo Forest", bg: "linear-gradient(to bottom, #98FB98 0%, #90EE90 50%, #8FBC8F 100%)", animals: ['🐼', '🎋', '🦌'] },
        { name: "🌈 Rainbow Valley", bg: "linear-gradient(45deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #9400D3)", animals: ['🦄', '🌈', '🦋'] },
        { name: "🏔️ Alpine Meadow", bg: "linear-gradient(to bottom, #87CEEB 0%, #98FB98 50%, #F0F8FF 100%)", animals: ['🐐', '🦅', '🌼'] },
        { name: "🎪 Circus Ground", bg: "linear-gradient(45deg, #FF1493, #00BFFF, #FFD700, #FF69B4)", animals: ['🎪', '🤹', '🎭'] },
        { name: "🦕 Dinosaur Park", bg: "linear-gradient(to bottom, #8FBC8F 0%, #556B2F 50%, #9ACD32 100%)", animals: ['🦕', '🦖', '🌿'] },
        { name: "🚀 Space Center", bg: "linear-gradient(to bottom, #191970 0%, #4169E1 50%, #87CEEB 100%)", animals: ['🚀', '👨‍🚀', '🌟'] }
    ];

    const specialModes = ['golden', 'speed', 'time-pressure', 'combo', 'mega-sort', 'rainbow', 'mystery'];
    
    for (let i = levels.length; i < 100; i++) {
        const location = locations[i % locations.length];
        const difficulty = Math.min(Math.floor(i / 10) + 1, 8);
        const isSpecial = i > 2 && (i % 5 === 0 || Math.random() < 0.3);
        
        levels.push({
            location: location.name,
            description: `Level ${i + 1} Challenge!`,
            bg: location.bg,
            items: Math.min(8 + difficulty * 3 + Math.floor(Math.random() * 5), 30),
            time: Math.max(45 - Math.floor(i / 5), 30),
            types: difficulty >= 3 ? ['plastic', 'paper', 'glass', 'organic', 'electronic', 'metal'] : 
                    difficulty >= 2 ? ['plastic', 'paper', 'glass', 'organic', 'electronic'] :
                    ['plastic', 'paper', 'glass', 'organic'],
            special: isSpecial ? specialModes[Math.floor(Math.random() * specialModes.length)] : null,
            animals: location.animals
        });
    }
}

// Enhanced trash types with more variety
const trashTypes = {
    plastic: ['🥤', '🍼', '🧴', '🛍️', '🥃', '🪣', '💳', '🎈', '🧸', '⚽'],
    paper: ['📰', '📄', '📦', '📃', '🗞️', '📚', '📝', '🎟️', '💌', '🏷️'],
    glass: ['🍺', '🍷', '🏺', '⚗️', '🔬', '💡', '🪟', '🍯', '🧪', '🔍'],
    organic: ['🍎', '🍌', '🥕', '🥬', '🍃', '🌰', '🥥', '🍊', '🥑', '🍇'],
    electronic: ['📱', '💻', '🔋', '💾', '📀', '🖥️', '⌚', '🎮', '📷', '🔌'],
    metal: ['🔧', '🔩', '🥤', '⚙️', '🔑', '💰', '🪙', '📎', '🧷', '⚖️']
};

function getDailyChallengeLevel() {
    // Generate daily challenge based on 24-hour cycles from first play
    // NOTE: In a real app, this would use localStorage to persist the first play time
    // For this demo, we'll use a deterministic seed based on current date
    
    // Get current time in 24-hour blocks
    const now = Date.now();
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const daysSinceEpoch = Math.floor(now / millisecondsPerDay);
    
    // Use the day count as seed for challenge level (10-60 range)
    const challengeLevel = 10 + (daysSinceEpoch % 51); // Cycles through levels 10-60
    
    return challengeLevel;
}

// Initialize game
function initGame() {
    generateLevels();
    initAudio();
    updateLevelBackground();
    updateResumeButton(); // Check for saved games
    
    // Start ambient sound on first user interaction
    document.addEventListener('click', () => {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
            if (sounds.ambient) sounds.ambient.start();
        }
    }, { once: true });
}

function startGame() {
    playSound('buttonClick');
    
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    
    // Apply game mode modifications
    if (gameState.gameMode === 'challenge') {
        gameState.level = getDailyChallengeLevel();
        
        // Add daily challenge badge
        const badge = document.createElement('div');
        badge.className = 'daily-badge';
        badge.textContent = '🏆 Daily Challenge';
        document.getElementById('gameScreen').appendChild(badge);
    }
    
    applyGameMode();
    initializeLevel();
}

function initializeLevel() {
    const level = levels[gameState.level - 1];
    gameState.timeLeft = level.time;
    gameState.totalItems = level.items;
    gameState.itemsCollected = 0;
    gameState.specialMode = level.special;
    gameState.currentBinTypes = level.types;
    gameState.levelStartTime = Date.now();
    
    updateDisplay();
    updateLevelBackground();
    generateTrashItems();
    generateBins();
    updateAnimals();
    startTimer();
    
    if (level.special) {
        applySpecialMode(level.special);
    }
}

function updateLevelBackground() {
    const level = levels[gameState.level - 1];
    document.documentElement.style.setProperty('--level-bg', level.bg);
}

function updateDisplay() {
    document.getElementById('scoreValue').textContent = gameState.score.toLocaleString();
    document.getElementById('levelValue').textContent = gameState.level;
    document.getElementById('timeValue').textContent = gameState.timeLeft;
    document.getElementById('streakValue').textContent = gameState.streak;
    
    const level = levels[gameState.level - 1];
    const isSpecial = level.special !== null;
    const levelInfo = document.getElementById('levelInfo');
    levelInfo.textContent = `${level.location} - ${level.description}`;
    levelInfo.className = isSpecial ? 'level-info special-challenge' : 'level-info';
    
    // Update progress
    const progress = (gameState.itemsCollected / gameState.totalItems) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
}

function generateBins() {
    const container = document.getElementById('recyclingBins');
    container.innerHTML = '';
    
    const binIcons = {
        plastic: '🥤', paper: '📰', glass: '🍺', organic: '🍎',
        electronic: '📱', metal: '🔧'
    };
    
    gameState.currentBinTypes.forEach(type => {
        const bin = document.createElement('div');
        bin.className = `bin ${type}`;
        bin.dataset.type = type;
        bin.ondrop = drop;
        bin.ondragover = allowDrop;
        bin.ondragleave = removeDragOver;
        
        bin.innerHTML = `
            <div class="bin-icon">${binIcons[type]}</div>
            <div>${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="bin-count">0</div>
        `;
        
        container.appendChild(bin);
    });
}

function generateTrashItems() {
    const container = document.getElementById('trashItems');
    container.innerHTML = '';
    gameState.currentItems = [];
    
    const level = levels[gameState.level - 1];
    const itemCount = level.items;
    
    // Determine difficulty for randomization (levels 4+)
    const isRandomized = gameState.level > 3;
    const types = gameState.currentBinTypes;
    
    for (let i = 0; i < itemCount; i++) {
        let type;
        if (isRandomized) {
            // Random distribution for harder levels
            type = types[Math.floor(Math.random() * types.length)];
        } else {
            // Balanced distribution for easy levels
            type = types[i % types.length];
        }
        
        const emojis = trashTypes[type];
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        const isGolden = level.special === 'golden' && Math.random() < 0.15;
        
        const item = document.createElement('div');
        item.className = `trash-item ${type}${isGolden ? ' golden' : ''}`;
        item.textContent = emoji;
        item.draggable = true;
        item.dataset.type = type;
        item.dataset.id = i;
        item.dataset.golden = isGolden;
        item.ondragstart = drag;
        item.onclick = () => touchSort(item);
        
        // Add combo indicator for consecutive correct sorts
        if (gameState.streak >= 3 && Math.random() < 0.2) {
            const combo = document.createElement('div');
            combo.className = 'combo-indicator';
            combo.textContent = '🔥';
            item.appendChild(combo);
        }
        
        container.appendChild(item);
        gameState.currentItems.push({ type, emoji, id: i, golden: isGolden });
    }
}

function updateAnimals() {
    const level = levels[gameState.level - 1];
    const container = document.getElementById('gameAnimals');
    container.innerHTML = '';
    
    level.animals.forEach((animal, index) => {
        const animalDiv = document.createElement('div');
        animalDiv.className = 'animal';
        animalDiv.textContent = animal;
        animalDiv.style.animationDelay = `${-index * 1.3}s`;
        container.appendChild(animalDiv);
    });
}

function startTimer() {
    gameState.gameTimer = setInterval(() => {
        gameState.timeLeft--;
        document.getElementById('timeValue').textContent = gameState.timeLeft;
        
        // Warning at 10 seconds
        if (gameState.timeLeft === 10) {
            document.getElementById('timeValue').style.color = '#FF6B6B';
            showSuccessAnimation('⏰ Hurry up!');
        }
        
        if (gameState.timeLeft <= 0) {
            endLevel();
        }
    }, 1000);
}

function drag(event) {
    event.dataTransfer.setData("text", event.target.dataset.id);
}

function touchSort(item) {
    // For touch devices - just provide visual feedback, don't auto-sort
    // Players must drag items to bins themselves
    item.style.transform = 'scale(1.1)';
    setTimeout(() => {
        item.style.transform = 'scale(1)';
    }, 200);
    
    // Optional: Show a hint about which bin to use
    const correctBinType = item.dataset.type;
    const hint = document.createElement('div');
    hint.style.position = 'fixed';
    hint.style.top = '50%';
    hint.style.left = '50%';
    hint.style.transform = 'translate(-50%, -50%)';
    hint.style.background = 'rgba(0,0,0,0.8)';
    hint.style.color = 'white';
    hint.style.padding = '1rem';
    hint.style.borderRadius = '10px';
    hint.style.zIndex = '2000';
    hint.style.fontSize = '1.2rem';
    hint.textContent = `Drag to ${correctBinType.charAt(0).toUpperCase() + correctBinType.slice(1)} bin!`;
    
    document.body.appendChild(hint);
    setTimeout(() => hint.remove(), 1500);
}

function allowDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function removeDragOver(event) {
    event.currentTarget.classList.remove('drag-over');
}

function drop(event) {
    event.preventDefault();
    const itemId = event.dataTransfer.getData("text");
    const item = document.querySelector(`[data-id="${itemId}"]`);
    const binType = event.currentTarget.dataset.type;
    const itemType = item.dataset.type;
    const isGolden = item.dataset.golden === 'true';
    
    event.currentTarget.classList.remove('drag-over');

    if (itemType === binType) {
        // Correct sorting!
        const basePoints = 10 * gameState.level;
        const goldenBonus = isGolden ? basePoints * 2 : 0;
        const streakBonus = Math.floor(gameState.streak / 3) * 5;
        const timeBonus = gameState.timeLeft > 30 ? 5 : 0;
        
        const totalPoints = (basePoints + goldenBonus + streakBonus + timeBonus) * gameState.comboMultiplier;
        
        gameState.score += totalPoints;
        gameState.streak++;
        gameState.itemsCollected++;
        
        if (gameState.streak > gameState.maxStreak) {
            gameState.maxStreak = gameState.streak;
        }
        
        // Daily Challenge Time Bonus - Check for streak of 5
        if (gameState.isDailyChallenge && gameState.streak > 0 && gameState.streak % 5 === 0) {
            checkTimeBonusForDailyChallenge();
        }
        
        // Play appropriate sound
        if (isGolden) {
            playSound('goldenItem');
        } else if (gameState.streak % 5 === 0 && gameState.streak > 0) {
            playSound('streak');
        } else {
            playSound('correctSort');
        }
        
        // Visual feedback
        item.style.display = 'none';
        event.currentTarget.classList.add('correct-drop');
        
        setTimeout(() => {
            event.currentTarget.classList.remove('correct-drop');
        }, 600);
        
        // Update bin counter
        const binCount = event.currentTarget.querySelector('.bin-count');
        binCount.textContent = parseInt(binCount.textContent) + 1;
        
        // Show floating score
        showFloatingScore(event.currentTarget, `+${totalPoints}`);
        
        // Success messages
        const messages = [
            '✨ Perfect!', '🌟 Amazing!', '💚 Great job!', '🎯 Excellent!', 
            '🔥 On fire!', '⭐ Superb!', '🎉 Fantastic!'
        ];
        
        if (isGolden) {
            showSuccessAnimation('💰 GOLDEN BONUS! +' + totalPoints);
        } else if (gameState.streak % 5 === 0 && !gameState.isDailyChallenge) {
            showSuccessAnimation(`🔥 ${gameState.streak} STREAK! +${totalPoints}`);
        } else {
            showSuccessAnimation(messages[Math.floor(Math.random() * messages.length)] + ` +${totalPoints}`);
        }
        
        // Check if level is complete
        const remainingItems = document.querySelectorAll('.trash-item:not([style*="display: none"])');
        if (remainingItems.length === 0) {
            setTimeout(() => endLevel(), 500);
        }
    } else {
        // Wrong bin
        gameState.streak = 0;
        gameState.comboMultiplier = 1;
        
        // Play wrong sound
        playSound('wrongSort');
        
        // Shake animation
        item.style.animation = 'none';
        item.offsetHeight; // Trigger reflow
        item.style.animation = 'shake 0.5s ease';
        
        showSuccessAnimation('❌ Wrong bin! Try again!');
    }
    
    updateDisplay();
}

function checkTimeBonusForDailyChallenge() {
    // Calculate time bonus: starts at 5 seconds, decreases by 1 each time, minimum 1 second
    const bonusSeconds = Math.max(5 - gameState.timeBonusCount, 1);
    
    // Add time bonus
    gameState.timeLeft += bonusSeconds;
    gameState.timeBonusCount++;
    
    // Show time bonus notification
    showTimeBonus(bonusSeconds, gameState.streak);
    
    // Play special sound for time bonus
    playSound('levelComplete');
}

function showTimeBonus(seconds, streak) {
    const bonus = document.createElement('div');
    bonus.className = 'time-bonus';
    bonus.innerHTML = `
        <div class="time-bonus-icon">⏰</div>
        <div>STREAK BONUS!</div>
        <div>+${seconds} seconds</div>
        <div style="font-size: 1.2rem; margin-top: 0.5rem;">🔥 ${streak} in a row!</div>
    `;
    
    document.body.appendChild(bonus);
    
    // Remove after animation
    setTimeout(() => {
        bonus.remove();
    }, 3000);
    
    // Also show a success animation
    showSuccessAnimation(`⏰ TIME BONUS! +${seconds}s`);
}

function showSuccessAnimation(text) {
    const animation = document.createElement('div');
    animation.className = 'success-animation';
    animation.textContent = text;
    document.body.appendChild(animation);
    
    setTimeout(() => {
        animation.remove();
    }, 1200);
}

function showFloatingScore(element, text) {
    const rect = element.getBoundingClientRect();
    const floating = document.createElement('div');
    floating.className = 'floating-score';
    floating.textContent = text;
    floating.style.left = rect.left + rect.width / 2 - 20 + 'px';
    floating.style.top = rect.top - 10 + 'px';
    document.body.appendChild(floating);
    
    setTimeout(() => {
        floating.remove();
    }, 2000);
}

function applySpecialMode(mode) {
    const levelInfo = document.getElementById('levelInfo');
    
    switch (mode) {
        case 'speed':
            showSuccessAnimation('⚡ SPEED MODE ACTIVATED!');
            break;
        case 'golden':
            showSuccessAnimation('💰 GOLDEN ITEMS APPEAR!');
            break;
        case 'time-pressure':
            showSuccessAnimation('⏰ TIME PRESSURE MODE!');
            break;
    }
}

function endLevel() {
    clearInterval(gameState.gameTimer);
    
    // Calculate bonuses
    const timeBonus = gameState.timeLeft * 3;
    const streakBonus = gameState.maxStreak * 20;
    const perfectBonus = gameState.itemsCollected === gameState.totalItems ? 100 : 0;
    
    gameState.score += timeBonus + streakBonus + perfectBonus;
    
    // Play level complete sound
    playSound('levelComplete');
    
    // Reset time color
    document.getElementById('timeValue').style.color = '#2C3E50';
    
    // Show completion screen
    showCompletionScreen();
}

function goBackToMenu() {
    playSound('buttonClick');
    
    // Pause the game if it's running
    if (gameState.gameTimer) {
        clearInterval(gameState.gameTimer);
        gameState.gameTimer = null;
    }
    
    // FORCE reset mode-specific state to prevent bleeding
    gameState.isDailyChallenge = false;
    
    // Hide all screens
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('completeScreen').classList.add('hidden');
    document.getElementById('pauseMenu').classList.add('hidden');
    
    // Remove ALL mode classes and badges
    const gameScreen = document.getElementById('gameScreen');
    gameScreen.classList.remove('zen-mode', 'challenge-mode');
    const existingBadge = document.querySelector('.daily-badge');
    if (existingBadge) existingBadge.remove();
    const existingIndicator = document.querySelector('.streak-indicator');
    if (existingIndicator) existingIndicator.remove();
    
    // Show start screen
    document.getElementById('startScreen').classList.remove('hidden');
    
    // Reset UI to show current mode properly (don't force change the mode, just sync UI)
    const resumeNotice = document.getElementById('resumeNotice');
    if (gameState.gameMode === 'challenge' && !savedGameState) {
        const challengeLevel = getDailyChallengeLevel();
        resumeNotice.classList.remove('hidden');
        resumeNotice.innerHTML = `
            🔥 Today's Challenge: Level ${challengeLevel}<br>
            <small>Special difficulty with time bonuses!</small>
        `;
    } else if (!savedGameState) {
        resumeNotice.classList.add('hidden');
    }
    
    // Update resume button visibility
    updateResumeButton();
}

function nextLevel() {
    playSound('buttonClick');
    
    // Increment level by 1 (sequential progression)
    gameState.level++;
    gameState.streak = 0;
    gameState.maxStreak = 0;
    
    // Ensure we don't exceed the maximum level
    if (gameState.level > 100) {
        gameState.level = 100;
    }
    
    console.log(`Next level: ${gameState.level}, Mode: ${gameState.gameMode}`); // Debug log
    
    document.getElementById('completeScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    
    // Clean up existing UI elements
    const existingBadge = document.querySelector('.daily-badge');
    if (existingBadge) existingBadge.remove();
    const existingIndicator = document.querySelector('.streak-indicator');
    if (existingIndicator) existingIndicator.remove();
    
    // Re-add daily challenge badge ONLY if we're still in challenge mode
    if (gameState.gameMode === 'challenge' && gameState.isDailyChallenge) {
        const badge = document.createElement('div');
        badge.className = 'daily-badge';
        badge.innerHTML = `
            🏆 Daily Challenge<br>
            <small>⚡ 5-streak = Time Bonus!</small>
        `;
        document.getElementById('gameScreen').appendChild(badge);
    }
    
    // Apply game mode settings and initialize the level
    applyGameMode();
    initializeLevel();
}

function showCompletionScreen() {
    const level = levels[gameState.level - 1];
    
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('completeScreen').classList.remove('hidden');
    
    // Remove streak indicator when completing level
    const existingIndicator = document.querySelector('.streak-indicator');
    if (existingIndicator) existingIndicator.remove();
    
    // Update completion screen
    document.getElementById('finalScore').textContent = `Score: ${gameState.score.toLocaleString()}`;
    
    // Generate achievements
    const achievements = document.getElementById('achievements');
    achievements.innerHTML = '';
    
    if (gameState.maxStreak >= 5) {
        const badge = document.createElement('div');
        badge.className = 'achievement-badge';
        badge.textContent = `🔥 Max Streak: ${gameState.maxStreak}`;
        achievements.appendChild(badge);
    }
    
    if (gameState.itemsCollected === gameState.totalItems) {
        const badge = document.createElement('div');
        badge.className = 'achievement-badge';
        badge.textContent = '💯 Perfect Clean-up!';
        achievements.appendChild(badge);
    }
    
    if (gameState.gameMode === 'zen') {
        const badge = document.createElement('div');
        badge.className = 'achievement-badge';
        badge.textContent = '🧘 Zen Master!';
        achievements.appendChild(badge);
    }
    
    if (gameState.gameMode === 'timeattack') {
        const badge = document.createElement('div');
        badge.className = 'achievement-badge';
        badge.textContent = '⚡ Speed Demon!';
        achievements.appendChild(badge);
    }
    
    if (gameState.isDailyChallenge) {
        const badge = document.createElement('div');
        badge.className = 'achievement-badge';
        badge.textContent = '🏆 Daily Champion!';
        achievements.appendChild(badge);
        
        // Show time bonus achievement if any were earned
        if (gameState.timeBonusCount > 0) {
            const bonusBadge = document.createElement('div');
            bonusBadge.className = 'achievement-badge';
            bonusBadge.textContent = `⏰ Time Master: ${gameState.timeBonusCount} bonus${gameState.timeBonusCount > 1 ? 'es' : ''}!`;
            achievements.appendChild(bonusBadge);
        }
    }
    
    // Update next button
    const nextBtn = document.getElementById('nextBtn');
    if (gameState.level >= 100) {
        nextBtn.textContent = '🏆 GAME COMPLETE!';
        nextBtn.onclick = () => {
            playSound('levelComplete');
            showSuccessAnimation('🎉 CONGRATULATIONS! YOU SAVED THE WORLD!');
            setTimeout(() => restartGame(), 2000);
        };
        document.getElementById('completeTitle').textContent = '🏆 WORLD SAVED! 🏆';
    } else {
        nextBtn.textContent = '🌟 NEXT ADVENTURE';
        nextBtn.onclick = nextLevel;
    }
}

function nextLevel() {
    playSound('buttonClick');
    
    gameState.level++;
    gameState.streak = 0;
    gameState.maxStreak = 0;
    
    document.getElementById('completeScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    
    // Remove daily challenge badge if exists
    const existingBadge = document.querySelector('.daily-badge');
    if (existingBadge) existingBadge.remove();
    
    applyGameMode();
    initializeLevel(); // This will auto-save the new level
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Prevent shortcuts if typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    switch(e.key) {
        case 'Escape':
            if (!document.getElementById('gameScreen').classList.contains('hidden')) {
                if (gameState.isPaused) {
                    resumeFromPause();
                } else {
                    pauseGame();
                }
            }
            break;
        case 'p':
        case 'P':
            if (!document.getElementById('gameScreen').classList.contains('hidden')) {
                if (gameState.isPaused) {
                    resumeFromPause();
                } else {
                    pauseGame();
                }
            }
            break;
        case 'm':
        case 'M':
            toggleSound();
            break;
        case 'q':
        case 'Q':
            if (gameState.isPaused) {
                saveAndQuit();
            }
            break;
        case 'r':
        case 'R':
            if (gameState.isPaused) {
                restartLevel();
            }
            break;
    }
});

function restartGame() {
    playSound('buttonClick');
    
    gameState = {
        score: 0,
        level: 1,
        timeLeft: 60,
        streak: 0,
        maxStreak: 0,
        currentItems: [],
        gameTimer: null,
        itemsCollected: 0,
        totalItems: 0,
        powerUps: [],
        specialMode: false,
        comboMultiplier: 1,
        levelStartTime: Date.now(),
        currentBinTypes: ['plastic', 'paper', 'glass', 'organic'],
        gameMode: 'adventure',
        soundEnabled: gameState.soundEnabled, // Keep sound preference
        isDailyChallenge: false
    };
    
    clearInterval(gameState.gameTimer);
    
    // Remove any mode classes and badges
    const gameScreen = document.getElementById('gameScreen');
    gameScreen.classList.remove('zen-mode', 'challenge-mode');
    const existingBadge = document.querySelector('.daily-badge');
    if (existingBadge) existingBadge.remove();
    
    document.getElementById('completeScreen').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
    
    // Reset mode selection
    selectMode('adventure');
}

// Performance optimizations
function optimizePerformance() {
    // Reduce unnecessary DOM queries
    const trashItems = document.querySelectorAll('.trash-item');
    trashItems.forEach(item => {
        item.style.willChange = 'auto';
    });
}

// Add shake animation CSS
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(shakeStyle);

// Initialize game on load
document.addEventListener('DOMContentLoaded', initGame);

// Prevent context menu on touch devices
document.addEventListener('contextmenu', e => e.preventDefault());

// Optimize touch performance
document.addEventListener('touchstart', e => e.preventDefault(), { passive: false });