document.addEventListener('DOMContentLoaded', () => {
    const cells = document.querySelectorAll('.cell');
    const messageDisplay = document.getElementById('message');
    const restartButton = document.getElementById('restart-button');
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const boardContainer = document.getElementById('board-container'); // ボードのコンテナを取得

    // キャンバスのサイズを親要素に合わせる
    canvas.width = 300; // CSSで設定したサイズ
    canvas.height = 300;
    
    // ゲームの状態
    let board = Array(9).fill(null);
    let currentPlayer = 'O'; // プレイヤーは 'O' から開始
    let gameActive = true;
    let isDrawing = false; // 描画中フラグ
    let startPoint = {}; // 描画開始座標
    let currentPath = []; // 現在描画中の座標履歴

    // 勝利条件
    const winningConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // 横
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // 縦
        [0, 4, 8], [2, 4, 6]             // 斜め
    ];

    // マス目の境界線を描画
    function drawGrid() {
        ctx.strokeStyle = '#4b3014'; 
        ctx.lineWidth = 5; 
        ctx.clearRect(0, 0, canvas.width, canvas.height); 

        // 縦線
        ctx.beginPath();
        ctx.moveTo(canvas.width / 3, 0);
        ctx.lineTo(canvas.width / 3, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(canvas.width * 2 / 3, 0);
        ctx.lineTo(canvas.width * 2 / 3, canvas.height);
        ctx.stroke();

        // 横線
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 3);
        ctx.lineTo(canvas.width, canvas.height / 3);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, canvas.height * 2 / 3);
        ctx.lineTo(canvas.width, canvas.height * 2 / 3);
        ctx.stroke();
    }
    
    // OとXをマス目に描画
    function drawSymbol(index, symbol) {
        const row = Math.floor(index / 3);
        const col = index % 3;
        const cellSize = canvas.width / 3;
        const x = col * cellSize + cellSize / 2;
        const y = row * cellSize + cellSize / 2;
        
        ctx.strokeStyle = symbol === 'O' ? '#cc0000' : '#006600'; 
        ctx.lineWidth = 10;
        
        if (symbol === 'O') {
            // マル
            ctx.beginPath();
            ctx.arc(x, y, cellSize / 3, 0, 2 * Math.PI);
            ctx.stroke();
        } else {
            // バツ
            const offset = cellSize / 4;
            // 右下がり
            ctx.beginPath();
            ctx.moveTo(x - offset, y - offset);
            ctx.lineTo(x + offset, y + offset);
            ctx.stroke();
            // 右上がり
            ctx.beginPath();
            ctx.moveTo(x + offset, y - offset);
            ctx.lineTo(x - offset, y + offset);
            ctx.stroke();
        }
    }

    // ゲーム盤を初期状態に戻す
    function resetGame() {
        board = Array(9).fill(null);
        currentPlayer = 'O';
        gameActive = true;
        messageDisplay.textContent = `ゲームスタート！O の番です。指で描いてね。`;
        restartButton.classList.add('hidden');
        
        // キャンバスをクリアしてグリッドを描き直す
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        
        // 描画されたシンボルを再描画
        board.forEach((symbol, index) => {
            if (symbol) {
                drawSymbol(index, symbol);
            }
        });
    }
    
    // 勝利判定
    function checkWinner() {
        let roundWon = false;
        for (let i = 0; i < winningConditions.length; i++) {
            const winCondition = winningConditions[i];
            let a = board[winCondition[0]];
            let b = board[winCondition[1]];
            let c = board[winCondition[2]];

            if (a === null || b === null || c === null) {
                continue;
            }
            if (a === b && b === c) {
                roundWon = true;
                break;
            }
        }

        if (roundWon) {
            messageDisplay.textContent = `${currentPlayer} の勝ち`;
            gameActive = false;
        } else if (!board.includes(null)) {
            messageDisplay.textContent = '引き分けだ！';
            gameActive = false;
        } else {
            // 次のプレイヤーに切り替え
            currentPlayer = currentPlayer === 'O' ? 'X' : 'O';
            messageDisplay.textContent = `次は ${currentPlayer} の番！指で描いてね。`;
            return;
        }

        // 決着がついた場合
        restartButton.classList.remove('hidden');
    }

    // =========================================================
    // ジャイロセンサーによる上下反転処理
    // =========================================================
    let isFlipped = false;

    function handleOrientation(event) {
        // gamma: 左右への傾き (Y軸周り)
        // beta: 前後への傾き (X軸周り) -> これを使って上下反転を判定
        const beta = event.beta; 
        
        // 縦向きデバイスを想定。betaが60度以上（手前にかなり傾いている）で反転させる
        if (beta > 60 && !isFlipped) {
            // 上下反転（X軸周りに180度回転）
            boardContainer.style.transform = 'rotateX(180deg)';
            messageDisplay.textContent = `ボードを反転しました！次は ${currentPlayer} の番です。`;
            isFlipped = true;
        } else if (beta < 30 && isFlipped) {
            // 垂直に戻ったら、反転を解除
            boardContainer.style.transform = 'rotateX(0deg)';
            messageDisplay.textContent = `ボードを元に戻しました。次は ${currentPlayer} の番です。`;
            isFlipped = false;
        }
        
        // メッセージを常に更新すると煩わしいので、ジェスチャー中は傾きメッセージは出さない
        if (gameActive && !isDrawing) {
             messageDisplay.textContent = `次は ${currentPlayer} の番！指で描いてね。`;
        }
    }

    // センサーイベントリスナーを設定
    if (window.DeviceOrientationEvent) {
        // センサーアクセス許可が必要なiOS 13+などに対応するためのチェック
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            document.getElementById('game-container').addEventListener('click', () => {
                DeviceOrientationEvent.requestPermission()
                    .then(permissionState => {
                        if (permissionState === 'granted') {
                            window.addEventListener('deviceorientation', handleOrientation);
                        } else {
                            // 許可が得られなかった場合
                            console.log('ジャイロセンサーのアクセスが拒否されました。');
                        }
                    })
                    .catch(console.error);
            }, { once: true }); // 一度だけ実行されるように設定
        } else {
            // 許可が不要な環境（Androidなど）
            window.addEventListener('deviceorientation', handleOrientation);
        }
    } else {
        // センサー非対応デバイス
        console.log('お使いのデバイスはジャイロセンサーに対応していません。');
    }
    
    // =========================================================
    // ジェスチャー描画・認識ロジック
    // =========================================================

    // 座標をキャンバス内の相対座標に変換
    function getCanvasCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        // タッチイベントかマウスイベントかによって座標を取得
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }
    
    // 描画開始 (mousedown/touchstart)
    function handleDrawStart(e) {
        if (!gameActive) return;
        
        // どのマス目から始まったかを特定
        const target = e.target.closest('.cell');
        if (!target) return;
        const index = target.dataset.index;
        if (board[index] !== null) return; // 既に埋まっているマスは無視
        
        // 描画開始時にメッセージをリセットし、次のターンへの促しに戻す
        messageDisplay.textContent = `次は ${currentPlayer} の番！指で描いてね。`;

        isDrawing = true;
        currentPath = [];
        startPoint = getCanvasCoordinates(e);
        
        // マス目の中心座標を計算し、描画ヒントの始点とする
        const cellSize = canvas.width / 3;
        startPoint.cellIndex = parseInt(index);
        
        // 描画開始時の座標をパスに追加
        currentPath.push(startPoint);

        // **ヒントを描画する**
        ctx.save();
        ctx.strokeStyle = currentPlayer === 'O' ? 'rgba(204, 0, 0, 0.3)' : 'rgba(0, 102, 0, 0.3)';
        ctx.lineWidth = 8;
        ctx.setLineDash([5, 5]); // 点線
        
        const row = Math.floor(index / 3);
        const col = index % 3;
        const x = col * cellSize + cellSize / 2;
        const y = row * cellSize + cellSize / 2;
        
        if (currentPlayer === 'O') {
             // Oのヒント
             ctx.beginPath();
             ctx.arc(x, y, cellSize / 3, 0, 2 * Math.PI);
             ctx.stroke();
        } else {
             // Xのヒント
             const offset = cellSize / 4;
             // 右下がり
             ctx.beginPath();
             ctx.moveTo(x - offset, y - offset);
             ctx.lineTo(x + offset, y + offset);
             ctx.stroke();
             // 右上がり
             ctx.beginPath();
             ctx.moveTo(x + offset, y - offset);
             ctx.lineTo(x - offset, y + offset);
             ctx.stroke();
        }
        ctx.restore();
    }
    
    // 描画中 (mousemove/touchmove)
    function handleDrawMove(e) {
        if (!isDrawing) return;
        
        // スクロールを防ぐ
        e.preventDefault(); 
        
        const newPoint = getCanvasCoordinates(e);
        
        // 描画
        ctx.strokeStyle = currentPlayer === 'O' ? '#cc0000' : '#006600';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.setLineDash([]); // 実線に戻す
        
        // 描画中の線
        ctx.beginPath();
        ctx.moveTo(currentPath[currentPath.length - 1].x, currentPath[currentPath.length - 1].y);
        ctx.lineTo(newPoint.x, newPoint.y);
        ctx.stroke();
        
        currentPath.push(newPoint);
    }

    // 描画終了 (mouseup/touchend)
    function handleDrawEnd() {
        if (!isDrawing) return;
        isDrawing = false;

        const cellIndex = startPoint.cellIndex;
        
        // パスが短すぎる場合は、ジェスチャーを無効とみなし最初から
        if (currentPath.length < 5) {
            messageDisplay.textContent = `指を離したね！最初からやり直し。${currentPlayer}の番を続けて。`;
            resetCanvasDrawing();
            return;
        }

        // 描画の総距離を計算
        let totalDistance = 0;
        for (let i = 1; i < currentPath.length; i++) {
            const p1 = currentPath[i - 1];
            const p2 = currentPath[i];
            totalDistance += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        }

        // バウンディングボックスのサイズ
        let minX = currentPath[0].x, maxX = currentPath[0].x;
        let minY = currentPath[0].y, maxY = currentPath[0].y;
        currentPath.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });
        const width = maxX - minX;
        const height = maxY - minY;
        const cellDim = canvas.width / 3; // 1マス分のサイズ

        let gestureRecognized = false;
        
        if (currentPlayer === 'O') {
            // Oのジェスチャー判定（極限緩和）
            const aspectRatio = width / height;
            const startEndDistance = Math.sqrt(
                Math.pow(currentPath[0].x - currentPath[currentPath.length - 1].x, 2) + 
                Math.pow(currentPath[0].y - currentPath[currentPath.length - 1].y, 2)
            );
            
            // 1. アスペクト比が0.5から2.0の範囲
            // 2. 始点と終点の距離がマス目のサイズの 1/2 未満
            // 3. 描画総距離がマス目のサイズの 0.8倍 以上
            if (aspectRatio > 0.5 && aspectRatio < 2.0 && 
                startEndDistance < cellDim / 2 && 
                totalDistance > cellDim * 0.8) {
                
                gestureRecognized = true;
            }

        } else if (currentPlayer === 'X') {
            // Xのジェスチャー判定（極限緩和: 20%以上）
            
            // 1. 描画範囲の幅と高さが、マス目の 20% 以上を占めている
            // 2. 描画総距離が、マス目のサイズ（cellDim）の 20% 以上
            
            if (width > cellDim * 0.2 && height > cellDim * 0.2 && totalDistance > cellDim * 0.2) {
                 gestureRecognized = true;
            }
        }
        
        // =========================================================

        if (gestureRecognized) {
            // 成功：ボードを更新して次のターンへ
            board[cellIndex] = currentPlayer;
            resetCanvasDrawing(); 
            drawSymbol(cellIndex, board[cellIndex]); 
            checkWinner();
        } else {
            // 失敗：最初からやり直し
            messageDisplay.textContent = `ジェスチャー失敗！もう一度指を離さずに描いてね。${currentPlayer}の番を続けて。`;
            resetCanvasDrawing();
        }
    }

    // 描画をリセットし、確定済みのシンボルとグリッドのみに戻す
    function resetCanvasDrawing() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // キャンバス全体をクリア
        drawGrid(); // グリッドを描画
        // 既に置かれているOとXを再描画
        board.forEach((symbol, index) => {
            if (symbol) {
                drawSymbol(index, symbol);
            }
        });
    }

    // イベントリスナー設定（タッチとマウスの両方に対応）
    cells.forEach(cell => {
        // タッチイベント (スマホ)
        cell.addEventListener('touchstart', handleDrawStart, { passive: false });
        cell.addEventListener('touchmove', handleDrawMove, { passive: false });
        cell.addEventListener('touchend', handleDrawEnd, { passive: false });
        cell.addEventListener('touchcancel', handleDrawEnd, { passive: false });

        // マウスイベント (PC)
        cell.addEventListener('mousedown', handleDrawStart);
    });
    
    // マウスイベントはdocument全体で監視（マス目から外れても終了できるように）
    document.addEventListener('mousemove', handleDrawMove);
    document.addEventListener('mouseup', handleDrawEnd);

    // リスタートボタン
    restartButton.addEventListener('click', resetGame);

    // 初期化
    drawGrid();
    resetGame(); // ゲーム開始時に一度リセットを呼び出す
});