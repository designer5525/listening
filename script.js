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
    const silentLoop = document.getElementById('silent-loop');
    
    // 【關鍵】解鎖音訊與語音
    const silent = new SpeechSynthesisUtterance("");
    synth.speak(silent);

    const btn = document.getElementById('main-btn');
    
    if (!isPlaying) {
        isPlaying = true;
        silentLoop.play(); 
        btn.classList.remove('colorful');
        btn.innerHTML = "暫停<br>學習";
        updateStatus("準備中...");
        
        if (vocabulary.length === 0) {
            await loadCSV();
        }

        // --- 修改處：僅在第一次開始（索引為 0）時響 3 次 ---
        if (currentIndex === 0) {
            updateStatus("準備開始...");
            for (let i = 0; i < 3; i++) {
                if (!isPlaying) break;
                beep.currentTime = 0;
                beep.play().catch(e => console.log(e));
                await new Promise(r => setTimeout(r, 700));
            }
            await new Promise(r => setTimeout(r, 500));
        }
        
        runStudyLoop();
    } else {
        isPlaying = false;
        silentLoop.pause();
        window.speechSynthesis.cancel();
        btn.classList.add('colorful');
        btn.innerHTML = "繼續<br>學習";
        updateStatus("已暫停");
        synth.cancel(); 
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
