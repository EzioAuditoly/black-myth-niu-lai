// 游戏测试和调试工具

class GameDebugger {
    constructor(game) {
        this.game = game;
        this.enabled = true;
        this.setupDebugPanel();
    }
    
    setupDebugPanel() {
        // 创建调试面板
        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.style.cssText = `
            position: absolute;
            top: 50%;
            right: 30px;
            transform: translateY(-50%);
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid #1E293B;
            border-radius: 12px;
            padding: 20px;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 12px;
            color: #F8FAFC;
            min-width: 200px;
            backdrop-filter: blur(10px);
            pointer-events: auto;
        `;
        
        panel.innerHTML = `
            <div style="color: #38BDF8; font-weight: 600; margin-bottom: 15px; font-size: 14px;">
                🔧 调试面板
            </div>
            <div style="margin-bottom: 10px;">
                <div style="color: #94A3B8; margin-bottom: 5px;">FPS</div>
                <div id="fps-counter" style="color: #22D3EE;">--</div>
            </div>
            <div style="margin-bottom: 10px;">
                <div style="color: #94A3B8; margin-bottom: 5px;">敌人数量</div>
                <div id="enemy-count" style="color: #F97316;">--</div>
            </div>
            <div style="margin-bottom: 10px;">
                <div style="color: #94A3B8; margin-bottom: 5px;">Combo</div>
                <div id="combo-counter" style="color: #F59E0B;">--</div>
            </div>
            <div style="margin-bottom: 10px;">
                <div style="color: #94A3B8; margin-bottom: 5px;">位置</div>
                <div id="position-info" style="color: #4FD1C5; font-size: 10px;">--</div>
            </div>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #334155;">
                <button id="spawn-enemy-btn" style="
                    width: 100%;
                    padding: 8px;
                    background: linear-gradient(135deg, #38BDF8, #22D3EE);
                    border: none;
                    border-radius: 6px;
                    color: #0B0E14;
                    font-weight: 600;
                    cursor: pointer;
                    margin-bottom: 8px;
                    font-size: 11px;
                ">生成敌人</button>
                <button id="heal-btn" style="
                    width: 100%;
                    padding: 8px;
                    background: linear-gradient(135deg, #F97316, #F59E0B);
                    border: none;
                    border-radius: 6px;
                    color: #0B0E14;
                    font-weight: 600;
                    cursor: pointer;
                    margin-bottom: 8px;
                    font-size: 11px;
                ">完全恢复</button>
                <button id="toggle-debug-btn" style="
                    width: 100%;
                    padding: 8px;
                    background: #1E293B;
                    border: 1px solid #334155;
                    border-radius: 6px;
                    color: #F8FAFC;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 11px;
                ">隐藏面板</button>
            </div>
        `;
        
        document.getElementById('ui-overlay').appendChild(panel);
        
        // 设置按钮事件
        document.getElementById('spawn-enemy-btn').addEventListener('click', () => {
            this.spawnTestEnemy();
        });
        
        document.getElementById('heal-btn').addEventListener('click', () => {
            this.healPlayer();
        });
        
        document.getElementById('toggle-debug-btn').addEventListener('click', () => {
            this.togglePanel();
        });
        
        // FPS 计数器
        this.lastTime = performance.now();
        this.frames = 0;
        this.fps = 0;
        
        // 开始更新调试信息
        this.update();
    }
    
    update() {
        if (!this.enabled) {
            requestAnimationFrame(() => this.update());
            return;
        }
        
        // 计算 FPS
        this.frames++;
        const now = performance.now();
        if (now >= this.lastTime + 1000) {
            this.fps = Math.round((this.frames * 1000) / (now - this.lastTime));
            this.frames = 0;
            this.lastTime = now;
        }
        
        // 更新调试信息
        const fpsCounter = document.getElementById('fps-counter');
        const enemyCount = document.getElementById('enemy-count');
        const comboCounter = document.getElementById('combo-counter');
        const positionInfo = document.getElementById('position-info');
        
        if (fpsCounter) {
            fpsCounter.textContent = this.fps;
            fpsCounter.style.color = this.fps >= 50 ? '#22D3EE' : this.fps >= 30 ? '#F59E0B' : '#F97316';
        }
        
        if (enemyCount && this.game.gameState) {
            enemyCount.textContent = this.game.gameState.enemies.length;
        }
        
        if (comboCounter && this.game.gameState) {
            const combo = this.game.gameState.player.combo;
            comboCounter.textContent = combo > 0 ? `${combo}x` : '无';
        }
        
        if (positionInfo && this.game.player && this.game.player.mesh) {
            const pos = this.game.player.mesh.position;
            positionInfo.textContent = `X: ${pos.x.toFixed(1)}\nY: ${pos.y.toFixed(1)}\nZ: ${pos.z.toFixed(1)}`;
        }
        
        requestAnimationFrame(() => this.update());
    }
    
    spawnTestEnemy() {
        if (!this.game || !this.game.scene) return;
        
        const angle = Math.random() * Math.PI * 2;
        const distance = 10;
        const pos = new THREE.Vector3(
            Math.cos(angle) * distance,
            0,
            Math.sin(angle) * distance
        );
        
        const enemyNames = ['测试妖怪', '强力敌人', '精英怪', '挑战者'];
        const name = enemyNames[Math.floor(Math.random() * enemyNames.length)];
        
        const enemy = new Enemy(this.game.scene, pos, name);
        this.game.gameState.enemies.push(enemy);
        
        console.log(`✨ 生成敌人: ${name} at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`);
    }
    
    healPlayer() {
        if (!this.game || !this.game.gameState) return;
        
        this.game.gameState.updateHealth(this.game.gameState.player.maxHealth);
        this.game.gameState.updateStamina(this.game.gameState.player.maxStamina);
        
        console.log('💚 玩家已完全恢复！');
    }
    
    togglePanel() {
        const panel = document.getElementById('debug-panel');
        const btn = document.getElementById('toggle-debug-btn');
        
        if (panel.style.opacity === '0') {
            panel.style.opacity = '1';
            panel.style.pointerEvents = 'auto';
            btn.textContent = '隐藏面板';
        } else {
            panel.style.opacity = '0';
            panel.style.pointerEvents = 'none';
            btn.textContent = '显示面板';
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        }
    }
}

// 导出供主游戏使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameDebugger;
}
