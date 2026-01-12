let vocabulary = [];
let currentIndex = 0;
let isPlaying = false;
const synth = window.speechSynthesis;

// 1. 讀取 CSV
async function loadCSV() {
    const response = await fetch('vocabulary.csv');
    const data = await response.text();
    const lines = data.split('\n').slice(1); // 跳過標題列
    vocabulary = lines.map(line => {
        const [word, translation, example] = line.split(',');
        return { word, translation, example };
    });
}

// 2. 主按鈕控制
function togglePlay() {
    const btn = document.getElementById('main-btn');
    if (!isPlaying) {
        isPlaying = true;
        btn.innerHTML = "暫停<br>學習";
        btn.classList.remove('colorful');
        startLearning();
    } else {
        isPlaying = false;
        btn.innerHTML = "繼續<br>學習";
        btn.classList.add('colorful');
        synth.cancel(); // 停止所有發聲
    }
}

// 3. 播放邏輯
async function startLearning() {
    if (vocabulary.length === 0) await loadCSV();
    
    // 滴滴滴三聲倒數
    await playCountdown();

    while (currentIndex < vocabulary.length && isPlaying) {
        const item = vocabulary[currentIndex];
        
        for (let i = 0; i < 2; i++) { // 重複兩遍
            if (!isPlaying) return;
            
            await speak(item.word, 'en-US');         // 念英文
            await sleep(1000);                      // 間隔 1s
            await speak(item.translation, 'zh-CN');  // 念中文
            await sleep(1000);                      // 間隔 1s
            await speak(item.example, 'en-US');      // 念例句
            await sleep(1000);                      // 每遍結束後的短間隔
        }
        
        currentIndex++;
        await sleep(2000); // 念完兩遍後停頓 2s 下一單詞
    }
}

// 輔助工具：語音播放
function speak(text, lang) {
    return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // 取得系統所有可用的聲音
        const voices = window.speechSynthesis.getVoices();
        
        if (lang === 'zh-CN' || lang === 'zh-Hant') {
            // 優先尋找高品質的中文聲音
            const zhVoice = voices.find(v => 
                (v.lang.includes('zh') || v.lang.includes('CN')) && 
                (v.name.includes('Google') || v.name.includes('Mainland') || v.name.includes('Xiaoxiao'))
            );
            if (zhVoice) utterance.voice = zhVoice;
            
            utterance.rate = 0.85; // 中文稍微放慢，媽媽聽得更清楚
            utterance.pitch = 1.0; // 音調保持自然
        } else {
            // 英文聲音優化
            const enVoice = voices.find(v => v.lang.includes('en') && v.name.includes('Google'));
            if (enVoice) utterance.voice = enVoice;
            utterance.rate = 0.8; // 英文例句也要慢一點
        }

        utterance.onend = resolve;
        
        // 處理某些瀏覽器語音中斷的臭蟲
        utterance.onerror = (event) => {
            console.error('語音錯誤:', event);
            resolve();
        };

        window.speechSynthesis.speak(utterance);
    });
}
// 輔助工具：滴滴滴倒數
async function playCountdown() {
    const beep = document.getElementById('beep-sound');
    for (let i = 0; i < 3; i++) {
        beep.play();
        await sleep(600); // 滴聲之間的間隔
    }
    await sleep(400); // 滴完後進入單詞前的緩衝
}
