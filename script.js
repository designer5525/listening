let vocabulary = [];
let currentIndex = 0;
let isPlaying = false;
const synth = window.speechSynthesis;
const beep = document.getElementById('beep-sound');

// 1. 初始化語音庫（解決某些瀏覽器延遲載入問題）
window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
};

// 2. 主按鈕控制
async function togglePlay() {
    const btn = document.getElementById('main-btn');

    // --- 【關鍵 1】立即解鎖語音與音訊 ---
    const silent = new SpeechSynthesisUtterance("");
    synth.speak(silent);

    // 嘗試預熱音效
    beep.play().then(() => {
        // 如果是為了保持後台喚醒，我們不立即 pause，而是讓它在循環中自然運作
        if (!isPlaying) {
            beep.pause();
            beep.currentTime = 0;
        }
    }).catch(e => console.log("音效解鎖失敗"));

    if (!isPlaying) {
        isPlaying = true;
        btn.classList.remove('colorful');
        btn.innerHTML = "暫停<br>學習";
        updateStatus("準備中...");

        // --- 【關鍵 2】啟動螢幕常亮 (防止黑屏) ---
        if ('wakeLock' in navigator) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
            } catch (err) { console.log("WakeLock 啟動失敗"); }
        }

        // 第一次點擊時載入 CSV
        if (vocabulary.length === 0) {
            await loadCSV();
        }

        // 確保從當前題號開始
        runStudyLoop();
    } else {
        // --- 【暫停邏輯】 ---
        isPlaying = false;
        btn.classList.add('colorful');
        btn.innerHTML = "繼續<br>學習";
        updateStatus("已暫停");

        // 立即停止所有聲音
        synth.cancel(); 
        beep.pause();
        
        // 釋放螢幕常亮鎖
        if (wakeLock) {
            wakeLock.release().then(() => wakeLock = null);
        }
    }
}

// 3. 讀取 CSV (假設檔案名為 vocabulary.csv)
async function loadCSV() {
    try {
        const response = await fetch('vocabulary.csv');
        const data = await response.text();
        const lines = data.split('\n').filter(line => line.trim() !== "");
        vocabulary = lines.slice(1).map(line => {
            const [word, translation, example] = line.split(',');
            return { word, translation, example };
        });
    } catch (e) {
        updateStatus("詞庫載入失敗");
    }
}

// 4. 核心學習循環
async function runStudyLoop() {
    while (isPlaying && currentIndex < vocabulary.length) {
        const item = vocabulary[currentIndex];
        updateStatus(`正在學習: ${item.word}`);

        // A. 播放倒數三聲
        for (let i = 0; i < 3; i++) {
            if (!isPlaying) return;
            beep.currentTime = 0;
            beep.play();
            await new Promise(r => setTimeout(r, 700));
        }
        await new Promise(r => setTimeout(r, 500));

        // B. 重複播放兩遍
        for (let j = 0; j < 2; j++) {
            if (!isPlaying) return;
            await speak(item.word, 'en-US');         // 念英文
            await new Promise(r => setTimeout(r, 1000));
            await speak(item.translation, 'zh-CN');  // 念中文
            await new Promise(r => setTimeout(r, 1000));
            await speak(item.example, 'en-US');      // 念例句
            await new Promise(r => setTimeout(r, 1500));
        }

        currentIndex++;
        await new Promise(r => setTimeout(r, 1000)); // 單詞間停頓
    }
    
    if (currentIndex >= vocabulary.length) {
        updateStatus("全部學習完成！");
        isPlaying = false;
        document.getElementById('main-btn').classList.add('colorful');
        document.getElementById('main-btn').innerHTML = "重新<br>學習";
        currentIndex = 0;
    }
}

// 5. 優化語音播放 (強制尋找 Google 高品質中文)
function speak(text, lang) {
    return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = synth.getVoices();

        if (lang === 'zh-CN') {
            // 優先找 Google 或系統的高品質普通話女聲
            const zhVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('zh-CN')) ||
                            voices.find(v => v.name.includes('Premium') && v.lang.includes('zh')) ||
                            voices.find(v => (v.name.includes('Ting-Ting') || v.name.includes('Mei-Jia')) && v.lang.includes('zh')) ||
                            voices.find(v => v.lang.includes('zh-CN'));
            if (zhVoice) utterance.voice = zhVoice;
            utterance.rate = 0.95; // 稍微慢一點
        } else {
            const enVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('en-US')) ||
                            voices.find(v => v.name.includes('Samantha') && v.name.includes('Enhanced')) ||
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
