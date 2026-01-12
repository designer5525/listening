let vocabulary = [];
let currentIndex = 0;
let isPlaying = false;
let isLoopRunning = false; // 防止重複啟動循環
const synth = window.speechSynthesis;
const beep = document.getElementById('beep-sound');

window.speechSynthesis.onvoiceschanged = () => { synth.getVoices(); };

// 可中斷的等待函數
function interruptibleTimeout(ms) {
    return new Promise((resolve) => {
        const start = Date.now();
        const check = setInterval(() => {
            if (!isPlaying || (Date.now() - start >= ms)) {
                clearInterval(check);
                resolve();
            }
        }, 50); // 每 50ms 檢查一次狀態
    });
}

async function togglePlay() {
    const silentLoop = document.getElementById('silent-loop');
    const btn = document.getElementById('main-btn');

    if (!isPlaying) {
        isPlaying = true;
        silentLoop.play();
        btn.classList.remove('colorful');
        btn.innerHTML = "暫停<br>學習";
        
        if (vocabulary.length === 0) await loadCSV();

        // 只有在真正從頭開始（完全沒進度）時才響鈴
        if (currentIndex === 0 && !isLoopRunning) {
            updateStatus("準備開始...");
            for (let i = 0; i < 3; i++) {
                if (!isPlaying) break;
                beep.currentTime = 0;
                beep.play();
                await interruptibleTimeout(700);
            }
        }

        // 確保不會同時啟動多個循環
        if (!isLoopRunning) {
            runStudyLoop();
        }
    } else {
        isPlaying = false;
        isLoopRunning = false;
        silentLoop.pause();
        synth.cancel(); // 立即停止當前說話
        btn.classList.add('colorful');
        btn.innerHTML = "繼續<br>學習";
        updateStatus("已暫停");
    }
}

async function loadCSV() {
    try {
        const response = await fetch('vocabulary.csv?t=' + Date.now());
        const data = await response.text();
        const lines = data.split(/\r?\n/).filter(line => line.trim() !== "");
        vocabulary = lines.slice(1).map(line => {
            const [word, translation, example] = line.split(',');
            return { word, translation, example };
        });
    } catch (e) { updateStatus("詞庫載入失敗"); }
}

async function runStudyLoop() {
    isLoopRunning = true;
    
    while (isPlaying && currentIndex < vocabulary.length) {
        const item = vocabulary[currentIndex];
        updateStatus(`正在學習: ${item.word}`);

        for (let j = 0; j < 2; j++) {
            if (!isPlaying) break;
            await speak(item.word, 'en-US');
            await interruptibleTimeout(1000);
            
            if (!isPlaying) break;
            await speak(item.translation, 'zh-CN');
            await interruptibleTimeout(1000);
            
            if (!isPlaying) break;
            await speak(item.example, 'en-US');
            await interruptibleTimeout(1500);
        }

        if (isPlaying) {
            currentIndex++;
            // 【黑屏修復】每學完一個詞，微調靜音檔進度，防止系統休眠
            const silentLoop = document.getElementById('silent-loop');
            silentLoop.currentTime = (silentLoop.currentTime > 10) ? 0 : silentLoop.currentTime + 0.1;
            
            await interruptibleTimeout(1000);
        }
    }
    
    if (currentIndex >= vocabulary.length) {
        updateStatus("全部完成！");
        isPlaying = false;
        currentIndex = 0;
        document.getElementById('main-btn').classList.add('colorful');
        document.getElementById('main-btn').innerHTML = "重新<br>學習";
    }
    isLoopRunning = false;
}

function speak(text, lang) {
    return new Promise((resolve) => {
        if (!isPlaying) { resolve(); return; }
        
        synth.cancel(); // 確保語音通道乾淨
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = synth.getVoices();

        // 語音選擇邏輯 (保持不變)
        if (lang === 'zh-CN') {
            const zhVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('zh-CN')) || 
                            voices.find(v => v.lang.includes('zh'));
            if (zhVoice) utterance.voice = zhVoice;
            utterance.rate = 0.95;
        } else {
            const enVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('en-US')) || 
                            voices.find(v => v.lang.includes('en-US'));
            if (enVoice) utterance.voice = enVoice;
            utterance.rate = 0.9;
        }

        utterance.onend = resolve;
        utterance.onerror = resolve;
        synth.speak(utterance);
    });
}

function updateStatus(msg) {
    document.getElementById('status-display').innerText = msg;
}
