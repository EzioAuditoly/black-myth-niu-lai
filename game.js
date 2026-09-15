import * as THREE from 'three';

console.log('✅ Three.js 模块加载成功');

// 游戏配置
const CONFIG = {
    player: {
        maxHealth: 100,
        maxStamina: 100,
        moveSpeed: 5,
        dodgeSpeed: 12,
        staminaRegenRate: 15,
        lightAttackDamage: 15,
        heavyAttackDamage: 35,
        skillDamage: 50,
        lightAttackStamina: 10,
        heavyAttackStamina: 25,
        dodgeStamina: 20,
        skillStamina: 40
    },
    enemy: {
        maxHealth: 80,
        moveSpeed: 2,
        attackRange: 2.5,
        attackCooldown: 2000,
        attackDamage: 10,
        detectionRange: 12
    },
    combat: {
        comboTimeWindow: 1000,
        comboBonus: 5,
        invincibilityFrames: 400
    }
};


// 游戏状态管理
class GameState {
    constructor() {
        this.player = {
            health: CONFIG.player.maxHealth,
            maxHealth: CONFIG.player.maxHealth,
            stamina: CONFIG.player.maxStamina,
            maxStamina: CONFIG.player.maxStamina,
            position: new THREE.Vector3(0, 0, 0),
            rotation: 0,
            isAttacking: false,
            isDodging: false,
            isJumping: false,
            isGrounded: true,
            velocityY: 0,
            isInvulnerable: false,
            combo: 0,
            lastAttackTime: 0
        };

        this.enemies = [];
        this.currentTarget = null;
        this.keys = {};
        this.gameStarted = false;
    }
    
    updateHealth(value) {
        this.player.health = Math.max(0, Math.min(this.player.maxHealth, value));
        this.updateUI();
    }
    
    updateStamina(value) {
        this.player.stamina = Math.max(0, Math.min(this.player.maxStamina, value));
        this.updateUI();
    }
    
    updateUI() {
        const healthBar = document.querySelector('#health-bar .health-fill');
        const staminaBar = document.querySelector('#stamina-bar .stamina-fill');

        if (healthBar) {
            healthBar.style.width = `${(this.player.health / this.player.maxHealth) * 100}%`;
        }
        if (staminaBar) {
            staminaBar.style.width = `${(this.player.stamina / this.player.maxStamina) * 100}%`;
        }

        // 调试：显示玩家状态
        let debugEl = document.getElementById('player-state-debug');
        if (!debugEl) {
            debugEl = document.createElement('div');
            debugEl.id = 'player-state-debug';
            debugEl.style.cssText = 'position:fixed;top:10px;right:10px;background:rgba(0,0,0,0.7);color:#0f0;padding:10px;font-family:monospace;font-size:12px;z-index:9999;border-radius:4px;line-height:1.6;';
            document.body.appendChild(debugEl);
        }
        debugEl.innerHTML = `
            <div>🩸 血量: ${this.player.health.toFixed(0)}/${this.player.maxHealth}</div>
            <div>⚡ 体力: ${this.player.stamina.toFixed(0)}/${this.player.maxStamina}</div>
            <div>🦶 着地: ${this.player.isGrounded ? '✅' : '❌'}</div>
            <div>🦘 跳跃: ${this.player.isJumping ? '⏫' : '⏹️'}</div>
            <div>🌀 无敌: ${this.player.isInvulnerable ? '✅' : '❌'}</div>
            <div style="margin-top:8px;color:#ff0">操作: WASD移动 | Space跳 | Shift闪避 | J/K/L攻击</div>
        `;
    }
    
    updateEnemyHealth(enemy) {
        const enemyHealthUI = document.querySelector('#enemy-health');
        if (enemy && enemy.health > 0) {
            enemyHealthUI.style.display = 'block';
            enemyHealthUI.querySelector('.enemy-name').textContent = enemy.name;
            enemyHealthUI.querySelector('.health-fill').style.width = 
                `${(enemy.health / enemy.maxHealth) * 100}%`;
        } else {
            enemyHealthUI.style.display = 'none';
        }
    }
    
    updateCombo() {
        const comboDisplay = document.querySelector('#combo-display');
        const comboNumber = document.querySelector('#combo-number');
        
        if (this.player.combo > 0) {
            comboDisplay.style.display = 'block';
            comboNumber.textContent = this.player.combo;
            
            // 连击数越高，颜色越亮
            const intensity = Math.min(1, this.player.combo / 10);
            const color = `rgb(${245}, ${Math.floor(158 + 97 * intensity)}, ${Math.floor(11 + 40 * intensity)})`;
            comboNumber.style.color = color;
            comboNumber.style.transform = `scale(${1 + intensity * 0.2})`;
        } else {
            comboDisplay.style.display = 'none';
        }
    }
}

// 牛来角色类
class NiuLai {
    constructor(scene, game = null) {
        this.scene = scene;
        this.game = game;
        this.mesh = null;
        this.weapon = null;
        this.createCharacter();
    }
    
    createCharacter() {
        const group = new THREE.Group();
        
        // 牛身体 - 低多边形风格
        const bodyGeometry = new THREE.BoxGeometry(1.2, 1.5, 0.8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.8,
            metalness: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1.5;
        group.add(body);
        
        // 牛头
        const headGeometry = new THREE.BoxGeometry(0.8, 0.7, 0.6);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(0, 2.5, 0.3);
        group.add(head);
        
        // 牛角
        const hornGeometry = new THREE.ConeGeometry(0.1, 0.5, 4);
        const hornMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFCC });
        
        const hornLeft = new THREE.Mesh(hornGeometry, hornMaterial);
        hornLeft.position.set(-0.3, 3, 0.3);
        hornLeft.rotation.z = -0.3;
        group.add(hornLeft);
        
        const hornRight = new THREE.Mesh(hornGeometry, hornMaterial);
        hornRight.position.set(0.3, 3, 0.3);
        hornRight.rotation.z = 0.3;
        group.add(hornRight);
        
        // 眼睛
        const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        
        const eyeLeft = new THREE.Mesh(eyeGeometry, eyeMaterial);
        eyeLeft.position.set(-0.2, 2.6, 0.6);
        group.add(eyeLeft);
        
        const eyeRight = new THREE.Mesh(eyeGeometry, eyeMaterial);
        eyeRight.position.set(0.2, 2.6, 0.6);
        group.add(eyeRight);
        
        // 四肢
        const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 6);
        const legMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
        
        const positions = [
            [-0.4, 0.6, 0.3],
            [0.4, 0.6, 0.3],
            [-0.4, 0.6, -0.3],
            [0.4, 0.6, -0.3]
        ];
        
        positions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(...pos);
            group.add(leg);
        });
        
        // 武器 - 金箍棒风格的棍子
        this.weapon = this.createWeapon();
        this.weapon.position.set(0.8, 1.5, 0);
        this.weapon.rotation.z = -0.3;
        group.add(this.weapon);
        
        this.mesh = group;
        this.scene.add(group);
    }
    
    createWeapon() {
        const weaponGroup = new THREE.Group();
        
        // 棍身
        const stickGeometry = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8);
        const stickMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFD700,
            metalness: 0.7,
            roughness: 0.3
        });
        const stick = new THREE.Mesh(stickGeometry, stickMaterial);
        weaponGroup.add(stick);
        
        // 棍头装饰
        const capGeometry = new THREE.CylinderGeometry(0.12, 0.08, 0.2, 8);
        const capMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFF0000,
            metalness: 0.8,
            roughness: 0.2
        });
        
        const capTop = new THREE.Mesh(capGeometry, capMaterial);
        capTop.position.y = 1.35;
        weaponGroup.add(capTop);
        
        const capBottom = new THREE.Mesh(capGeometry, capMaterial);
        capBottom.position.y = -1.35;
        weaponGroup.add(capBottom);
        
        return weaponGroup;
    }
    
    update(delta, gameState) {
        if (!this.mesh) return;

        // 移动逻辑 - 修复：W为前进（朝角色面朝方向）
        const moveSpeed = 5;
        const rotateSpeed = 3;
        let moved = false;

        // 记录移动方向，用于滑墙判断
        let moveDirX = 0;
        let moveDirZ = 0;

        const oldPos = this.mesh.position.clone();

        // W - 前进（朝向角色面朝方向的远方）
        if (gameState.keys['w'] || gameState.keys['W']) {
            moveDirX += Math.sin(this.mesh.rotation.y);
            moveDirZ += Math.cos(this.mesh.rotation.y);
            moved = true;
        }
        // S - 后退（朝向角色面朝方向的近处）
        if (gameState.keys['s'] || gameState.keys['S']) {
            moveDirX -= Math.sin(this.mesh.rotation.y);
            moveDirZ -= Math.cos(this.mesh.rotation.y);
            moved = true;
        }
        // A - 向左转
        if (gameState.keys['a'] || gameState.keys['A']) {
            this.mesh.rotation.y += rotateSpeed * delta;
        }
        // D - 向右转
        if (gameState.keys['d'] || gameState.keys['D']) {
            this.mesh.rotation.y -= rotateSpeed * delta;
        }

        // 计算尝试位置（先记录，等碰撞检测后再真正应用 - 支持滑墙）
        const playerRadius = 0.5;
        const attemptedX = oldPos.x + moveDirX * moveSpeed * delta;
        const attemptedZ = oldPos.z + moveDirZ * moveSpeed * delta;

        // ========== 碰撞检测（分离 X 和 Z 轴 - 实现贴墙滑动）==========
        if (this.game && this.game.castleStructures) {
            const playerFeetY = this.mesh.position.y; // 玩家脚的位置
            const playerHeadY = playerFeetY + 2.0;    // 玩家身高约 2
            // 玩家正在跳跃上升 → 允许水平穿过墙（暂时）→ 等 y 高过墙顶后会被阻挡
            const isJumpingUp = gameState.player.velocityY > 0.5;

            // 检测玩家与所有墙体的碰撞
            const checkCollision = (px, pz) => {
                for (const struct of this.game.castleStructures) {
                    if (struct.type !== 'wall' && struct.type !== 'boundary') continue;
                    const mesh = struct.mesh;
                    const params = mesh.geometry.parameters;
                    const minX = mesh.position.x - params.width / 2;
                    const maxX = mesh.position.x + params.width / 2;
                    const minZ = mesh.position.z - params.depth / 2;
                    const maxZ = mesh.position.z + params.depth / 2;
                    const wallTopY = mesh.position.y + params.height / 2;
                    const wallBottomY = mesh.position.y - params.height / 2;

                    // 玩家已经站在墙顶上 → 允许横向行走
                    if (playerFeetY >= wallTopY - 0.02) continue;

                    // 玩家正在跳跃上升 + 玩家头部已经越过墙顶 → 允许穿越
                    // （玩家头部 >= 墙顶，说明已经"翻"过去了）
                    if (isJumpingUp && playerHeadY >= wallTopY - 0.05) continue;

                    // 玩家和墙在 Y 方向有重叠
                    const playerOverlapsY = playerHeadY > wallBottomY && playerFeetY < wallTopY;

                    if (!playerOverlapsY) continue;

                    // 玩家水平方向与墙重叠（考虑玩家半径）
                    const overlapX = px > minX - playerRadius && px < maxX + playerRadius;
                    const overlapZ = pz > minZ - playerRadius && pz < maxZ + playerRadius;

                    if (overlapX && overlapZ) {
                        return { hit: true, mesh, minX, maxX, minZ, maxZ };
                    }
                }
                return { hit: false };
            };

            // 先尝试 X 方向移动
            this.mesh.position.x = attemptedX;
            let xCheck = checkCollision(this.mesh.position.x, oldPos.z);
            if (xCheck.hit) {
                // X 方向被阻挡 - 贴墙滑动的关键：恢复 X
                this.mesh.position.x = oldPos.x;
            }

            // 再尝试 Z 方向移动
            this.mesh.position.z = attemptedZ;
            let zCheck = checkCollision(this.mesh.position.x, this.mesh.position.z);
            if (zCheck.hit) {
                this.mesh.position.z = oldPos.z;
            }

            // 最终再做一次完整检测（两个方向都恢复后应该不撞墙）
            const finalCheck = checkCollision(this.mesh.position.x, this.mesh.position.z);
            if (finalCheck.hit) {
                // 极端情况：玩家被卡住，恢复到 oldPos
                this.mesh.position.copy(oldPos);
            }
        } else {
            this.mesh.position.x = attemptedX;
            this.mesh.position.z = attemptedZ;
        }

        // ============ 跳跃物理（统一处理：跳跃中 + 站立 都用同一套逻辑）============
        const gravity = -32;
        const jumpForce = 22;  // 最大跳跃高度 = 22²/64 ≈ 7.5 单位

        // 检测脚下最高的可站立表面
        // 重要：地面（y=0）只对中心点附近区域有效，远处会掉下去
        let highestStandY = -Infinity;
        let hasStandingSurface = false;
        const GROUND_Y = 0;

        if (this.game && this.game.castleStructures) {
            const playerX = this.mesh.position.x;
            const playerZ = this.mesh.position.z;
            const playerRadius = 0.5;

            for (const struct of this.game.castleStructures) {
                // 平台和墙都可以站，boundary 跳过（边界墙顶太高无用）
                if (struct.type !== 'platform' && struct.type !== 'wall') continue;
                const mesh = struct.mesh;
                const params = mesh.geometry.parameters;
                const minX = mesh.position.x - params.width / 2;
                const maxX = mesh.position.x + params.width / 2;
                const minZ = mesh.position.z - params.depth / 2;
                const maxZ = mesh.position.z + params.depth / 2;
                const topY = mesh.position.y + params.height / 2;

                // 玩家中心在物体水平范围内
                if (playerX > minX - playerRadius && playerX < maxX + playerRadius &&
                    playerZ > minZ - playerRadius && playerZ < maxZ + playerRadius) {
                    if (topY > highestStandY) {
                        highestStandY = topY;
                    }
                    hasStandingSurface = true;
                }
            }
        }

        // 边界外（玩家超过 ±30）或者范围内没有任何可站表面 → 坠落虚空
        const playerX = this.mesh.position.x;
        const playerZ = this.mesh.position.z;
        // 地面是 80x80（半边 40），留 2m 缓冲，38 以外视为真正虚空（视觉外侧悬崖）
        const outOfBounds = Math.abs(playerX) > 38 || Math.abs(playerZ) > 38;

        // 主地图区域：地面/平台能站的范围（38 内都能站，与视觉地面一致）
        const inMainArea = Math.abs(playerX) < 38 && Math.abs(playerZ) < 38;

        if (outOfBounds || (!hasStandingSurface && !inMainArea)) {
            // 在虚空里：地面无效，玩家持续下坠
            gameState.player.velocityY += gravity * delta;
            this.mesh.position.y += gameState.player.velocityY * delta;
            gameState.player.isGrounded = false;
            gameState.player.isJumping = false;
            return; // 不再做站立/着陆判定
        }

        // 在主区域内但没有可站表面 → 地面 y=0 兜底
        if (!hasStandingSurface) {
            highestStandY = GROUND_Y;
            hasStandingSurface = true;
        }

        const standingPlatformY = highestStandY;
        const isOnGround = Math.abs(this.mesh.position.y - standingPlatformY) < 0.01;

        // 应用重力（仅在空中时）
        if (!isOnGround || gameState.player.velocityY > 0) {
            gameState.player.velocityY += gravity * delta;
            const prevY = this.mesh.position.y;
            this.mesh.position.y += gameState.player.velocityY * delta;

            // 着陆判定：上一帧在平台上方，这一帧 <= 平台顶面，且正在下落
            const isDescending = gameState.player.velocityY <= 0;
            const wasAbove = prevY >= standingPlatformY - 0.05;
            const nowAtOrBelow = this.mesh.position.y <= standingPlatformY + 0.05;

            if (isDescending && wasAbove && nowAtOrBelow) {
                // 着陆：站到平台/地面上
                this.mesh.position.y = standingPlatformY;
                gameState.player.velocityY = 0;
                gameState.player.isGrounded = true;
                gameState.player.isJumping = false;
            } else if (this.mesh.position.y > standingPlatformY + 0.05) {
                // 真正在地面以上
                gameState.player.isGrounded = false;
            }
        } else {
            // 站在平台/地面上，重置状态
            this.mesh.position.y = standingPlatformY;
            gameState.player.velocityY = 0;
            gameState.player.isGrounded = true;
            gameState.player.isJumping = false;
        }

        // ========== 防卡墙内：玩家站立时如果水平在墙内，强制推出 ==========
        if (gameState.player.isGrounded && this.game && this.game.castleStructures) {
            const playerFeetY2 = this.mesh.position.y;
            const playerRadius2 = 0.5;
            for (const struct of this.game.castleStructures) {
                if (struct.type !== 'wall' && struct.type !== 'boundary') continue;
                const mesh = struct.mesh;
                const params = mesh.geometry.parameters;
                const minX = mesh.position.x - params.width / 2;
                const maxX = mesh.position.x + params.width / 2;
                const minZ = mesh.position.z - params.depth / 2;
                const maxZ = mesh.position.z + params.depth / 2;
                const wallTopY2 = mesh.position.y + params.height / 2;
                const wallBottomY2 = mesh.position.y - params.height / 2;

                // 玩家站立 y 在墙的垂直范围内 → 可能卡墙内
                if (playerFeetY2 < wallBottomY2 || playerFeetY2 > wallTopY2) continue;

                // 水平在墙内
                const inWallX = this.mesh.position.x > minX - playerRadius2 && this.mesh.position.x < maxX + playerRadius2;
                const inWallZ = this.mesh.position.z > minZ - playerRadius2 && this.mesh.position.z < maxZ + playerRadius2;
                if (!inWallX || !inWallZ) continue;

                // 把玩家推到最近的水平边界外
                const distToMinX = this.mesh.position.x - (minX - playerRadius2);
                const distToMaxX = (maxX + playerRadius2) - this.mesh.position.x;
                const distToMinZ = this.mesh.position.z - (minZ - playerRadius2);
                const distToMaxZ = (maxZ + playerRadius2) - this.mesh.position.z;
                const minDist = Math.min(distToMinX, distToMaxX, distToMinZ, distToMaxZ);
                if (minDist === distToMinX) this.mesh.position.x = minX - playerRadius2;
                else if (minDist === distToMaxX) this.mesh.position.x = maxX + playerRadius2;
                else if (minDist === distToMinZ) this.mesh.position.z = minZ - playerRadius2;
                else this.mesh.position.z = maxZ + playerRadius2;
            }
        }

        // 武器动画
        if (moved && this.weapon) {
            this.weapon.rotation.z = -0.3 + Math.sin(Date.now() * 0.01) * 0.1;
        }

        // 耐力恢复
        if (!gameState.player.isDodging && !gameState.player.isAttacking) {
            gameState.updateStamina(gameState.player.stamina + 20 * delta);
        }

        gameState.player.position.copy(this.mesh.position);
        gameState.player.rotation = this.mesh.rotation.y;
    }

    performJump() {
        // 只有在地面才能跳 - NiuLai 通过 this.game 访问 Game 实例的 gameState
        if (!this.game?.gameState) return;
        if (!this.game.gameState.player.isGrounded) {
            console.log('跳跃被阻止: isGrounded=', this.game.gameState.player.isGrounded);
            return;
        }

        // 触发跳跃
        this.game.gameState.player.isJumping = true;
        this.game.gameState.player.isGrounded = false;
        this.game.gameState.player.velocityY = 22; // 向上初速度（最大跳跃 ~7.5m）
        console.log('🦘 跳跃！');
    }
    
    performLightAttack() {
        if (!this.weapon || !this.mesh) return;

        // 轻击动画 - 向前横扫（绕X轴旋转，从后方挥向前方）
        // 在静止状态下，weapon 棍子是垂直的（沿 Y 轴）
        // 我们通过 rotation.x 让它从头顶后方扫向正前方
        const startRotX = 0;          // 起始位置：头顶后方
        const endRotX = -Math.PI * 0.8; // 终点位置：前方下方（横扫完成）
        const duration = 200;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            // 缓动函数 - 前快后慢
            const eased = t * t * (3 - 2 * t);
            if (this.weapon) {
                this.weapon.rotation.x = startRotX + (endRotX - startRotX) * eased;
            }
            if (t < 1 && this.weapon) {
                requestAnimationFrame(animate);
            } else if (this.weapon) {
                this.weapon.rotation.x = 0;
            }
        };
        animate();
    }
    
    performHeavyAttack() {
        if (!this.weapon || !this.mesh) return;

        // 重击动画 - 大幅横扫 + 上挑（结合 X 和 Z 轴）
        const duration = 400;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            // 缓动 - 中间快
            const eased = Math.sin(t * Math.PI);

            if (this.weapon) {
                // X 轴：向前下方横扫
                this.weapon.rotation.x = -Math.PI * 0.9 * eased;
                // Z 轴：斜向上抬（重击威势）
                this.weapon.rotation.z = -0.3 - 0.5 * eased;
            }

            if (t < 1 && this.weapon) {
                requestAnimationFrame(animate);
            } else if (this.weapon) {
                this.weapon.rotation.x = 0;
                this.weapon.rotation.z = -0.3;
            }
        };
        animate();
    }
    
    performDodge() {
        if (!this.mesh) return;

        // 闪避翻滚：真正的"前翻" - 角色向前翻跟头
        // 距离 4，持续 0.6s，无敌帧 0.6s
        const dodgeDistance = 4;
        const duration = 0.6;

        const forwardX = Math.sin(this.mesh.rotation.y);
        const forwardZ = Math.cos(this.mesh.rotation.y);

        const targetX = this.mesh.position.x + forwardX * dodgeDistance;
        const targetZ = this.mesh.position.z + forwardZ * dodgeDistance;

        const startX = this.mesh.position.x;
        const startZ = this.mesh.position.z;
        const startTime = Date.now();

        // 标记无敌帧 - NiuLai 通过 this.game 访问 Game 实例的 gameState
        if (this.game?.gameState) {
            this.game.gameState.player.isInvulnerable = true;
        }

        // 保存原始 rotation
        const originalRotX = this.mesh.rotation.x;
        const originalRotZ = this.mesh.rotation.z;

        const animate = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed < duration && this.mesh) {
                let progress = elapsed / duration;

                // 缓动：前后慢中间快
                const eased = progress < 0.5
                    ? 2 * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

                // 位置前移
                this.mesh.position.x = startX + (targetX - startX) * eased;
                this.mesh.position.z = startZ + (targetZ - startZ) * eased;

                // 向前翻跟头：rotation.x 旋转 -2π 到 0
                // 三维中：
                //   rotation.x 旋转 → 角色绕 X 轴旋转，看起来像翻跟头
                //   但我们要把 "翻跟头" 放在"向前"的方向上
                //   因为玩家面朝 +Z 方向（rotation.y=0 时）
                //   旋转 X 轴正好让角色从正前方翻到正后方 → 前翻动作！
                const rollAngle = -progress * Math.PI * 2; // -2π 到 0
                this.mesh.rotation.x = originalRotX + rollAngle;

                // 同时让身体稍微倾斜避免看起来奇怪
                this.mesh.rotation.z = originalRotZ + Math.sin(progress * Math.PI) * 0.3;

                requestAnimationFrame(animate);
            } else if (this.mesh) {
                // 翻滚结束 - 恢复原状
                this.mesh.position.x = targetX;
                this.mesh.position.z = targetZ;
                this.mesh.rotation.x = originalRotX;
                this.mesh.rotation.z = originalRotZ;
                // 关闭无敌帧和 isDodging
                if (this.game?.gameState) {
                    this.game.gameState.player.isInvulnerable = false;
                    this.game.gameState.player.isDodging = false;
                }
            }
        };
        animate();
    }
}

// 敌人类
class Enemy {
    constructor(scene, position, name = '妖怪', game = null) {
        this.scene = scene;
        this.game = game;
        this.name = name;
        this.health = 100;
        this.maxHealth = 100;
        this.position = position;
        this.mesh = null;
        this.attackRange = 3;
        this.attackCooldown = 2000;
        this.lastAttackTime = 0;
        this.isAttacking = false;
        this.createEnemy();
        // 怪物攻击范围圆环（红色）
        this.attackRing = this._createRangeRing(3, 0xEF4444, 0.12);
        this.attackRing.position.copy(position);
        this.attackRing.position.y = 0.05;
        this.scene.add(this.attackRing);
    }

    _createRangeRing(radius, color, opacity) {
        const points = [];
        const segments = 48;
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
        return new THREE.Line(geometry, material);
    }
    
    createEnemy() {
        const group = new THREE.Group();
        
        // 敌人身体 - 更狰狞的造型
        const bodyGeometry = new THREE.BoxGeometry(1, 1.8, 0.7);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4A0E0E,
            roughness: 0.9
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1.5;
        group.add(body);
        
        // 头部
        const headGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0x2D0707 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 2.7;
        group.add(head);
        
        // 眼睛发光
        const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        
        const eyeLeft = new THREE.Mesh(eyeGeometry, eyeMaterial);
        eyeLeft.position.set(-0.2, 2.7, 0.45);
        group.add(eyeLeft);
        
        const eyeRight = new THREE.Mesh(eyeGeometry, eyeMaterial);
        eyeRight.position.set(0.2, 2.7, 0.45);
        group.add(eyeRight);
        
        // 武器
        const weaponGeometry = new THREE.BoxGeometry(0.2, 1.5, 0.2);
        const weaponMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
        weapon.position.set(0.7, 1.5, 0);
        weapon.rotation.z = -0.5;
        group.add(weapon);
        
        group.position.copy(this.position);
        this.mesh = group;
        this.scene.add(group);
    }
    
    update(delta, playerPosition) {
        if (!this.mesh || this.health <= 0) return;
        
        // 面向玩家
        const dx = playerPosition.x - this.mesh.position.x;
        const dz = playerPosition.z - this.mesh.position.z;
        this.mesh.rotation.y = Math.atan2(dx, dz);
        
        // 移动向玩家
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance > this.attackRange) {
            const moveSpeed = 2;
            this.mesh.position.x += (dx / distance) * moveSpeed * delta;
            this.mesh.position.z += (dz / distance) * moveSpeed * delta;
        }
        
        // 攻击逻辑
        const now = Date.now();
        if (distance < this.attackRange && now - this.lastAttackTime > this.attackCooldown) {
            this.isAttacking = true;
            this.attack();
            this.lastAttackTime = now;
        } else if (now - this.lastAttackTime > 400) {
            this.isAttacking = false;
        }

        // 同步攻击范围圆环位置
        if (this.attackRing && this.mesh) {
            this.attackRing.position.x = this.mesh.position.x;
            this.attackRing.position.z = this.mesh.position.z;
        }

        this.position.copy(this.mesh.position);
    }
    
    attack() {
        // 攻击动画
        if (!this.mesh) return;
        const originalScale = this.mesh.scale.clone();
        this.mesh.scale.multiplyScalar(1.2);
        setTimeout(() => {
            if (this.mesh) this.mesh.scale.copy(originalScale);
        }, 200);
    }
    
    takeDamage(damage) {
        this.health = Math.max(0, this.health - damage);
        
        // 受击效果
        if (this.mesh) {
            const originalColor = this.mesh.children[0].material.color.getHex();
            this.mesh.children[0].material.color.setHex(0xFFFFFF);
            setTimeout(() => {
                if (this.mesh && this.mesh.children[0]) {
                    this.mesh.children[0].material.color.setHex(originalColor);
                }
            }, 100);
        }
        
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        if (!this.mesh) return;

        // 通知 Game 怪物死亡（计数 + 检查过关）
        if (this.game?.onEnemyKilled) {
            this.game.onEnemyKilled(this);
        }

        // 移除攻击范围圆环
        if (this.attackRing) {
            this.scene.remove(this.attackRing);
            this.attackRing = null;
        }

        // 死亡动画
        let elapsed = 0;
        const duration = 1;
        const animate = () => {
            elapsed += 0.016;
            if (elapsed < duration && this.mesh) {
                this.mesh.rotation.x = (elapsed / duration) * Math.PI / 2;
                this.mesh.position.y -= 0.016 * 2;
                requestAnimationFrame(animate);
            } else if (this.mesh) {
                this.scene.remove(this.mesh);
                this.mesh = null;
            }
        };
        animate();
    }
}

// 游戏主类
class Game {
    constructor() {
        console.log('🏗️ 初始化游戏对象...');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.gameState = new GameState();
        this.clock = new THREE.Clock();

        // 性能与平衡性配置
        this.maxEnemies = 4;            // 屏幕同时最多4只怪物（避免卡死）
        this.maxParticles = 80;         // 粒子数量上限
        this.activeParticles = 0;       // 当前活跃粒子数
        this.lastEnemySpawn = 0;        // 防止反复重生

        // ===== 关卡系统 =====
        this.level = 1;                      // 当前关卡（从 1 开始）
        this.levelConfig = null;             // 当前关卡配置
        this.levelEnemiesRequired = 0;       // 本关需杀怪数
        this.levelEnemiesKilled = 0;         // 已杀数
        this.levelEnemiesSpawned = 0;        // 已生成数
        this.gateOrb = null;                 // 过关金球 mesh
        this.gateOrbActive = false;          // 金球是否激活（杀光后才显示）
        this.levelMeshes = [];               // 关卡所有场景对象，销毁用
        this.levelAnimHooks = [];            // 关卡动画 hooks（清空时也清）
        this.levelTransitioning = false;     // 切换关卡中（防止重复触发）

        console.log('📋 调用 init() 方法...');
        this.init();
        console.log('✅ Game 构造函数完成');
    }
    
    init() {
        console.log('🎬 开始场景初始化...');
        
        // 场景设置
        console.log('  - 创建场景');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // 武侠风 - 明亮天蓝色
        this.scene.fog = new THREE.Fog(0xC8E6F5, 25, 65);  // 淡蓝雾，远景朦胧
        
        // 相机设置
        console.log('  - 创建相机');
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(1.5, 10, 8);
        this.camera.lookAt(0, 1.5, -1.5);
        
        // 渲染器设置
        console.log('  - 创建渲染器');
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            throw new Error('无法找到 gameCanvas 元素');
        }
        this.renderer = new THREE.WebGLRenderer({ 
            canvas, 
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // 光照
        console.log('  - 设置光照');
        this.setupLights();

        // 创建方向指示器
        console.log('  - 创建方向指示器');
        this.createDirectionIndicator();

        // 创建玩家
        console.log('  - 创建玩家角色');
        this.player = new NiuLai(this.scene, this);

        // 把指示器添加到玩家脚下
        this.directionIndicator.position.copy(this.player.mesh.position);
        this.directionIndicator.position.y = 0.2;

        // 初始化 castleStructures（用于碰撞检测）
        this.castleStructures = [];

        // 初始化第 1 关（场景/怪物/HUD 一站式）
        console.log('  - 初始化第 1 关');
        this.initLevel(1);

        // 事件监听
        console.log('  - 设置控制器');
        this.setupControls();
        
        // 窗口大小调整
        window.addEventListener('resize', () => this.onWindowResize());
        
        console.log('✨ 场景初始化完成！');
        
        // 隐藏加载界面
        setTimeout(() => {
            console.log('🎮 游戏准备就绪，隐藏加载界面');
            document.getElementById('loading').style.display = 'none';
            this.gameState.gameStarted = true;

            // 显示一次性操作提示（4 秒后自动消失）
            this.showCombatTips();
        }, 1000);
        
        // 开始游戏循环
        console.log('🔄 启动游戏循环');
        this.animate();
    }
    
    setupLights() {
        // 半球光 - 蓝天绿草地的环境反射
        const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x558B2F, 0.7);
        this.scene.add(hemiLight);

        // 主光源 - 模拟太阳（暖白光）
        const directionalLight = new THREE.DirectionalLight(0xFFF8E1, 1.2);
        directionalLight.position.set(15, 25, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -35;
        directionalLight.shadow.camera.right = 35;
        directionalLight.shadow.camera.top = 35;
        directionalLight.shadow.camera.bottom = -35;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // 辅助光 - 蓝色天光反射
        const fillLight = new THREE.DirectionalLight(0x90CAF9, 0.4);
        fillLight.position.set(-10, 10, -10);
        this.scene.add(fillLight);

        // 凉亭暖光（强化金色球的光感）
        const pavilionLight = new THREE.PointLight(0xFFD700, 1.5, 25);
        pavilionLight.position.set(0, 12, -25);
        this.scene.add(pavilionLight);
    }

    createDirectionIndicator() {
        // 创建方向指示器 - 角色前方的箭头提示
        this.directionIndicator = new THREE.Group();

        // 主箭头（向前）
        const arrowGeometry = new THREE.ConeGeometry(0.4, 1.2, 4);
        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: 0x10B981,
            transparent: true,
            opacity: 0.7
        });
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.rotation.x = Math.PI / 2;
        arrow.position.z = 1.2;
        this.directionIndicator.add(arrow);

        // 三个前向光斑
        for (let i = 0; i < 3; i++) {
            const dotGeometry = new THREE.SphereGeometry(0.15, 8, 8);
            const dotMaterial = new THREE.MeshBasicMaterial({
                color: 0x10B981,
                transparent: true,
                opacity: 0.5
            });
            const dot = new THREE.Mesh(dotGeometry, dotMaterial);
            dot.position.set(0, 0.1, 2 + i * 1.5);
            this.directionIndicator.add(dot);
        }

        this.directionIndicator.visible = true;
        this.scene.add(this.directionIndicator);
    }

    // =========================================================
    // 关卡系统
    // =========================================================

    /**
     * 6 种关卡风格，每种决定天空/地面/平台/装饰的色调和氛围
     */
    LEVEL_THEMES() {
        return [
            {
                name: '青竹幽径',
                sky: 0x87CEEB, fog: 0xC8E6F5,
                ground: 0x7CB342, platform: 0x9E9E9E,
                bamboo: true, streams: true, rocks: true, pillars: true,
                accent: 0x8B5A2B
            },
            {
                name: '黄沙古道',
                sky: 0xF4D03F, fog: 0xFAE5B7,
                ground: 0xD4AC6B, platform: 0xC9A56B,
                bamboo: false, streams: false, rocks: true, pillars: false,
                accent: 0xA0522D
            },
            {
                name: '雪山之巅',
                sky: 0xB8D8E8, fog: 0xE8F4F8,
                ground: 0xECEFF1, platform: 0xCFD8DC,
                bamboo: false, streams: true, rocks: true, pillars: false,
                accent: 0x607D8B
            },
            {
                name: '熔岩深处',
                sky: 0x4A0E0E, fog: 0x6B1F1F,
                ground: 0x3D1810, platform: 0x8B3A1A,
                bamboo: false, streams: false, rocks: true, pillars: false,
                accent: 0xFF6B1A
            },
            {
                name: '紫晶夜境',
                sky: 0x2D1B4E, fog: 0x4A2C6E,
                ground: 0x3D2B5E, platform: 0x7B5BA6,
                bamboo: false, streams: false, rocks: true, pillars: true,
                accent: 0xD4AF37
            },
            {
                name: '樱花山谷',
                sky: 0xFFE0EC, fog: 0xFFF0F5,
                ground: 0xE8B4C8, platform: 0xD4A5B8,
                bamboo: true, streams: true, rocks: false, pillars: true,
                accent: 0xFF69B4
            },
        ];
    }

    /**
     * 为指定关卡生成配置（每关首次随机，之后固定）
     */
    generateLevelConfig(levelNum) {
        const themes = this.LEVEL_THEMES();
        // 用 levelNum 作为随机种子，确保同一关卡风格稳定（重新加载也是同风格）
        const seed = levelNum * 9301 + 49297;
        const rng = (n) => {
            const x = Math.sin((seed + n) * 12.9898) * 43758.5453;
            return x - Math.floor(x);
        };

        const theme = themes[Math.floor(rng(1) * themes.length)];

        // 平台数量随关卡缓慢递增（4~8 个）
        const platformCount = 4 + Math.floor(rng(2) * 5);

        // ============== 阶梯跳台：最高平台放黄色球，从玩家可达位置逐级递增 ==============
        // 玩家跳跃参数：moveSpeed=5、jumpForce=22、gravity=-32
        //   跳跃峰值时间 = 22/32 = 0.6875s，最大水平位移 ≈ 6.9m
        //   最大跳跃高度 = 22²/64 ≈ 7.6m
        // 保守阶梯参数（给玩家留操作余量）：
        const STEP_HORIZONTAL = 4.5;   // 每阶水平间距（平台中心距离）
        const STEP_VERTICAL   = 1.8;   // 每阶高度差（远低于跳跃峰值 7.6m）
        const PLATFORM_W = 3.5;        // 平台宽：水平间距 4.5 减去平台宽 3.5 = 1m 间隙（必须跳得过去）
        const PLATFORM_D = 3.5;
        const PLATFORM_H = 0.4;

        // 阶梯层数 = floor(platformCount/2)（至少 4 阶），最高平台 = 顶
        const stepCount = Math.max(4, Math.floor(platformCount / 2));
        // 随机选一个方向作为阶梯朝向（东南西北四种），让关卡布局多变
        const dirs = [
            { dx: 1, dz: 0 },   // 东
            { dx: 0, dz: 1 },   // 南
            { dx: -1, dz: 0 },  // 西
            { dx: 0, dz: -1 },  // 北
        ];
        const stairDir = dirs[Math.floor(rng(7) * dirs.length)];

        const platforms = [];
        // 阶梯基础位置：起点在玩家 (0,0) 附近，第一阶台阶放在玩家边上 5m 处
        // 每阶中心点 = 起点 + dir * (i * STEP_HORIZONTAL)，y 随 i 递增
        const startX = stairDir.dx !== 0 ? stairDir.dx * 5 : (rng(8) - 0.5) * 4;
        const startZ = stairDir.dz !== 0 ? stairDir.dz * 5 : (rng(9) - 0.5) * 4;
        for (let i = 0; i < stepCount; i++) {
            const cx = startX + stairDir.dx * i * STEP_HORIZONTAL;
            const cz = startZ + stairDir.dz * i * STEP_HORIZONTAL;
            // 第 0 阶 y=1.5（基础高度），每阶 +STEP_VERTICAL
            const cy = 1.5 + i * STEP_VERTICAL;
            platforms.push({
                x: cx, y: cy, z: cz,
                w: PLATFORM_W, d: PLATFORM_D, h: PLATFORM_H,
                isGoal: i === stepCount - 1,    // 最高台：放黄球（关卡目标）
                stairStep: i,                   // 标记阶梯序号
            });
        }

        // 剩余名额给装饰平台：围绕阶梯但不挡路
        const decorCount = platformCount - stepCount;
        for (let i = 0; i < decorCount; i++) {
            // 远离阶梯起点 ±6m 以外的范围，y 较低（不挡最高平台）
            const angle = rng(100 + i) * Math.PI * 2;
            const dist = 12 + rng(200 + i) * 12;   // 12~24m
            platforms.push({
                x: Math.cos(angle) * dist,
                y: 1.0 + rng(300 + i) * 2.0,       // 0.5~2.5m 低装饰台
                z: Math.sin(angle) * dist,
                w: 2 + rng(400 + i) * 2.5,
                d: 2 + rng(500 + i) * 2.5,
                h: 0.4 + rng(600 + i) * 0.3,
                isGoal: false,
                stairStep: -1,
            });
        }

        // 矮墙配置（中央庭院）
        const walls = [
            { x: 0, z: -10, w: 14, h: 1.5, d: 0.4, doorX: 0, doorW: 3 },
            { x: 0, z: 10, w: 14, h: 1.5, d: 0.4, doorX: 0, doorW: 3 },
            { x: 10, z: 0, w: 0.4, h: 1.5, d: 14, doorZ: 0, doorW: 3 },
            { x: -10, z: 0, w: 0.4, h: 1.5, d: 14, doorZ: 0, doorW: 3 },
        ];

        // 怪物数：每关 6 + 关卡 * 2（递增）
        const enemyCount = 6 + levelNum * 2;

        // 怪物属性（强度随关卡提升）
        return {
            levelNum,
            theme,
            platforms,
            walls,
            enemyCount,
            enemyHealth: 80 + levelNum * 20,
            enemyDamage: 8 + levelNum * 2,
        };
    }

    /**
     * 销毁当前关卡的所有场景对象
     */
    clearLevel() {
        // 销毁关卡 mesh（地形、平台、墙、装饰、怪物、金球）
        for (const obj of this.levelMeshes) {
            if (obj && obj.parent) obj.parent.remove(obj);
            // 释放几何/材质
            if (obj.traverse) {
                obj.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
        }
        this.levelMeshes = [];

        // 清空怪物数组（已经在 levelMeshes 中）
        this.gameState.enemies = [];

        // 清空金球
        if (this.gateOrb) {
            this.gateOrb = null;
        }
        this.gateOrbActive = false;

        // 清空环境动画 hooks
        this.levelAnimHooks = [];

        // 重置怪物清理钩子
        this.animateParticles = null;

        console.log(`🧹 关卡 ${this.level} 场景已清理`);
    }

    /**
     * 初始化一关：销毁旧场景 → 生成新地形/平台/墙/装饰 → 生成怪物
     */
    initLevel(levelNum) {
        if (this.levelTransitioning) { console.warn('initLevel 被打断：levelTransitioning=true'); return; }
        this.levelTransitioning = true;
        console.log(`🏗️ initLevel(${levelNum}) 开始`);

        // 清掉上一关
        this.clearLevel();

        // 重置碰撞结构（清空上一关的 walls/platforms/boundaries）
        this.castleStructures = [];

        // 生成配置
        this.level = levelNum;
        this.levelConfig = this.generateLevelConfig(levelNum);
        this.levelEnemiesRequired = this.levelConfig.enemyCount;
        this.levelEnemiesKilled = 0;
        this.levelEnemiesSpawned = 0;
        this.gateOrbActive = false;
        this.lastEnemySpawn = Date.now();

        // 关卡 token：刷新后让所有旧的 setTimeout 失效（防止上一关的 timer 继续 spawn）
        this._levelSpawnToken = (this._levelSpawnToken || 0) + 1;

        const theme = this.levelConfig.theme;
        const config = this.levelConfig;

        // 应用天空/雾色
        this.scene.background = new THREE.Color(theme.sky);
        if (this.scene.fog) {
            this.scene.fog.color.set(theme.fog);
        }

        // 地面
        this.createGroundForLevel(theme);

        // 中心石板路（始终保留，仅颜色变化）
        this.createStonePath(theme);

        // 中央矮墙
        for (const wallCfg of config.walls) {
            this.buildWallWithDoor(wallCfg, this.makeMaterial(theme.accent, 0.9, 0.05));
        }

        // 随机平台
        for (const p of config.platforms) {
            this.createPlatform(p, theme);
        }

        // 边界（远山 - 颜色随主题）
        this.createBoundaryWallsForLevel(theme);

        // 装饰（按主题选择）
        if (theme.bamboo) this.createBamboos(theme);
        if (theme.rocks) this.createRocks(theme);
        if (theme.streams) this.createStreams(theme);
        if (theme.pillars) this.createPillars(theme);

        // 飘落粒子（颜色随主题）
        this.createParticles(theme);

        // 出生点：玩家位置
        if (this.player && this.player.mesh) {
            this.player.mesh.position.set(0, 0, 0);
            this.player.mesh.rotation.y = 0;
            this.gameState.player.position.copy(this.player.mesh.position);
            this.gameState.player.health = this.gameState.player.maxHealth;
            this.gameState.player.stamina = this.gameState.player.maxStamina;
            this.gameState.player.velocityY = 0;

            // 玩家脚下攻击范围圆环（蓝色，轻击 2.8，重击 4，取较大值）
            if (this.playerAttackRing) {
                this.scene.remove(this.playerAttackRing);
            }
            this.playerAttackRing = this._createRangeRing(4.0, 0x3B82F6, 0.15);
            this.playerAttackRing.position.set(0, 0.05, 0);
            this.scene.add(this.playerAttackRing);
            this.levelMeshes.push(this.playerAttackRing);
        }

        // 生成怪物（按关卡配置固定数量，分批生成，每批 2 只）
        // 先烙印 token，让首批 spawn 用本关 token
        this._spawnBatchToken = this._levelSpawnToken;
        this.spawnNextEnemyBatch();

        // 更新 HUD
        this.updateLevelHUD();

        this.levelTransitioning = false;
        console.log(`🎯 关卡 ${levelNum} 初始化完成：${theme.name}，需杀 ${this.levelEnemiesRequired} 只怪`);
    }

    /**
     * 分批生成怪物，直到达成本关总数
     */
    spawnNextEnemyBatch() {
        if (!this.levelConfig) return;
        // 死亡界面显示中：暂停刷怪（防止死亡瞬间背后刷怪）
        if (this._deathScreenShown) return;
        // 上一关残留下来的 setTimeout：token 不匹配则直接放弃
        if (this._spawnBatchToken !== this._levelSpawnToken) return;
        const remaining = this.levelEnemiesRequired - this.levelEnemiesSpawned;
        if (remaining <= 0) return;
        if (this.gameState.enemies.length >= this.maxEnemies) return;

        // 把当前 token 烙印在本批次上：未来 spawn 出来的怪被打死时补刷也走同一 token
        this._spawnBatchToken = this._levelSpawnToken;

        const batchSize = Math.min(2, remaining);
        const enemyNames = ['小妖', '山贼', '野兽', '鬼怪'];
        const config = this.levelConfig;
        const playerPos = this.player.mesh.position;

        for (let i = 0; i < batchSize; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 10 + Math.random() * 4;
            const pos = new THREE.Vector3(
                playerPos.x + Math.cos(angle) * dist,
                0,
                playerPos.z + Math.sin(angle) * dist
            );
            const enemy = new Enemy(this.scene, pos, enemyNames[Math.floor(Math.random() * enemyNames.length)], this);
            // 用关卡配置覆盖怪物强度
            enemy.health = config.enemyHealth;
            enemy.maxHealth = config.enemyHealth;
            enemy.attackDamage = config.enemyDamage;
            this.gameState.enemies.push(enemy);
            // push 到 levelMeshes，关卡清理时才能彻底销毁
            if (enemy.mesh) this.levelMeshes.push(enemy.mesh);
            if (enemy.attackRing) this.levelMeshes.push(enemy.attackRing);
            this.levelEnemiesSpawned++;
        }

        // 如果还没生成够且场上未满，1.5 秒后再生成下一批
        // 绑定 token：关卡切换后旧 timer 自动失效
        if (this.levelEnemiesSpawned < this.levelEnemiesRequired && this.gameState.enemies.length < this.maxEnemies) {
            const token = this._levelSpawnToken;
            setTimeout(() => {
                if (this._levelSpawnToken === token && this.gameState.gameStarted) {
                    this.spawnNextEnemyBatch();
                }
            }, 1500);
        }
    }

    /**
     * 怪物死亡时调用：计数 + 检查过关
     */
    onEnemyKilled(enemy) {
        this.levelEnemiesKilled++;
        this.updateLevelHUD();
        console.log(`☠️ 击杀 ${this.levelEnemiesKilled}/${this.levelEnemiesRequired}`);

        // 检查是否杀光
        if (this.levelEnemiesKilled >= this.levelEnemiesRequired) {
            this.spawnGateOrb();
        } else {
            // 还没杀光但场上怪数减少，补刷
            if (this.gameState.enemies.length < 2 && this.levelEnemiesSpawned < this.levelEnemiesRequired) {
                const token = this._levelSpawnToken;
                setTimeout(() => {
                    if (this._levelSpawnToken === token) this.spawnNextEnemyBatch();
                }, 1000);
            }
        }
    }

    /**
     * 在最高平台上生成金球（过关门）
     */
    spawnGateOrb() {
        if (this.gateOrbActive) return;

        // 找最高平台位置，没有就放在 (0, 8, -25)
        let pos = { x: 0, y: 8, z: -25 };
        if (this.levelConfig && this.levelConfig.platforms.length > 0) {
            let maxY = -Infinity;
            for (const p of this.levelConfig.platforms) {
                const top = p.y + p.h / 2;
                if (top > maxY) {
                    maxY = top;
                    pos = { x: p.x, y: top + 1.5, z: p.z };
                }
            }
        }

        // 金球：发光的金色 sphere
        const orbGeo = new THREE.SphereGeometry(0.8, 24, 24);
        const orbMat = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            emissive: 0xFFA500,
            emissiveIntensity: 1.0,
            metalness: 0.6,
            roughness: 0.2
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.set(pos.x, pos.y, pos.z);
        orb.castShadow = true;
        this.scene.add(orb);
        this.gateOrb = orb;
        this.gateOrbActive = true;

        // 金球光晕
        const light = new THREE.PointLight(0xFFD700, 2.0, 12);
        light.position.set(pos.x, pos.y, pos.z);
        this.scene.add(light);

        // 金球上下浮动 + 自转
        const baseY = pos.y;
        const orbAnim = () => {
            if (!this.gateOrb) return;
            const t = Date.now() * 0.002;
            this.gateOrb.position.y = baseY + Math.sin(t) * 0.3;
            this.gateOrb.rotation.y = t;
        };
        this.levelAnimHooks.push(orbAnim);

        // 把光晕和光也加到 levelMeshes（以便销毁）
        this.levelMeshes.push(orb, light);

        console.log(`🌟 金球已激活，触碰进入下一关！`);
    }

    /**
     * 每帧检查玩家和金球的接触
     */
    checkGateTouch() {
        if (!this.gateOrbActive || !this.gateOrb) return;
        if (!this.player || !this.player.mesh) return;
        const dist = this.player.mesh.position.distanceTo(this.gateOrb.position);
        if (dist < 2.0) {
            this.advanceToNextLevel();
        }
    }

    /**
     * 进入下一关
     */
    advanceToNextLevel() {
        if (this.levelTransitioning) return;
        const nextLevel = this.level + 1;
        console.log(`✨ 通关！进入关卡 ${nextLevel}`);

        // 显示通关提示（1.2 秒后自动切换到下一关）
        this.showLevelBanner(`第 ${this.level} 关 - 通关！`, `进入第 ${nextLevel} 关...`);

        setTimeout(() => {
            this.hideLevelBanner();
            // initLevel 内部会设置 levelTransitioning=true 并在结束时重置
            this.initLevel(nextLevel);
            // 进新关后显示一次"第 N 关"标题横幅，2.5s 后自动消失
            setTimeout(() => {
                if (!this.levelTransitioning && this.level === nextLevel) {
                    this.showLevelBanner(`第 ${nextLevel} 关`, this.levelConfig?.theme?.name || '');
                    setTimeout(() => this.hideLevelBanner(), 2500);
                }
            }, 200);
        }, 1200);
    }

    /**
     * 关卡横幅提示
     */
    showLevelBanner(title, subtitle) {
        let banner = document.getElementById('level-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'level-banner';
            banner.style.cssText = `
                position: fixed; top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.85);
                color: white;
                padding: 40px 80px;
                border-radius: 12px;
                border: 2px solid #FFD700;
                box-shadow: 0 0 40px rgba(255,215,0,0.6);
                text-align: center;
                font-family: 'Microsoft YaHei', sans-serif;
                z-index: 8888;
                animation: bannerFadeIn 0.5s ease-out;
            `;
            document.body.appendChild(banner);
        }
        banner.innerHTML = `
            <h2 style="margin:0 0 10px 0; color:#FFD700; font-size:36px;">${title}</h2>
            <p style="margin:0; color:#ccc; font-size:18px;">${subtitle}</p>
        `;
        banner.style.display = 'block';
    }

    hideLevelBanner() {
        const banner = document.getElementById('level-banner');
        if (banner) banner.style.display = 'none';
    }

    /**
     * 创建攻击范围圆环（用于可视化）
     * @param {number} radius 圆环半径
     * @param {number} color 颜色（十六进制）
     * @param {number} opacity 透明度
     */
    _createRangeRing(radius, color, opacity) {
        const points = [];
        const segments = 48;
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
        return new THREE.Line(geometry, material);
    }

    /**
     * 一次性战斗操作提示（进入游戏后显示 4 秒）
     */
    showCombatTips() {
        const tips = document.createElement('div');
        tips.id = 'combat-tips';
        tips.innerHTML = `
            <div style="text-align:center; font-weight:bold; color:#FFD700; margin-bottom:14px; font-size:18px;">⚔️ 战斗操作</div>
            <div style="display:flex; gap:16px; flex-wrap:wrap; justify-content:center;">
                <div class="tip-item"><span class="key">J</span>轻击</div>
                <div class="tip-item"><span class="key">K</span>重击</div>
                <div class="tip-item"><span class="key">空格</span>闪避</div>
                <div class="tip-item"><span class="key">L</span>技能</div>
            </div>
            <div style="margin-top:10px; font-size:13px; color:#ccc; text-align:center;">
                🔵 脚下蓝圈 = 你的攻击范围 &nbsp;|&nbsp; 🔴 怪物脚下 = 它的攻击范围
            </div>
        `;
        tips.style.cssText = `
            position: fixed; bottom: 20px; left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.85);
            color: white;
            padding: 14px 24px;
            border-radius: 10px;
            border: 1px solid rgba(255,215,0,0.4);
            font-family: 'Microsoft YaHei', sans-serif;
            font-size: 14px;
            z-index: 1001;
            white-space: nowrap;
        `;
        document.body.appendChild(tips);

        // 给 key 加样式
        tips.querySelectorAll('.tip-item').forEach(el => {
            el.style.cssText = 'display:flex; align-items:center; gap:6px;';
        });
        tips.querySelectorAll('.key').forEach(el => {
            el.style.cssText = `
                background: #333; color: #FFD700; padding: 2px 8px;
                border-radius: 4px; font-weight: bold; border: 1px solid #555;
            `;
        });

        // 4 秒后自动消失
        setTimeout(() => {
            const t = document.getElementById('combat-tips');
            if (t) {
                t.style.transition = 'opacity 0.5s';
                t.style.opacity = '0';
                setTimeout(() => t.remove(), 500);
            }
        }, 4000);
    }

    /**
     * 更新关卡 HUD（关卡号 + 进度）
     */
    updateLevelHUD() {
        let hud = document.getElementById('level-hud');
        if (!hud) {
            hud = document.createElement('div');
            hud.id = 'level-hud';
            hud.style.cssText = `
                position: fixed; top: 20px; left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.7);
                color: white;
                padding: 10px 24px;
                border-radius: 20px;
                border: 1px solid rgba(255,215,0,0.5);
                font-family: 'Microsoft YaHei', sans-serif;
                font-size: 16px;
                z-index: 1000;
            `;
            document.body.appendChild(hud);
        }
        const themeName = this.levelConfig?.theme?.name || '';
        const remaining = Math.max(0, this.levelEnemiesRequired - this.levelEnemiesKilled);
        hud.innerHTML = `
            <span style="color:#FFD700;">第 ${this.level} 关</span>
            <span style="margin: 0 12px; color:#888;">|</span>
            <span style="color:#aaa;">${themeName}</span>
            <span style="margin: 0 12px; color:#888;">|</span>
            <span style="color:#fff;">剩余怪物: <span style="color:#FF6B6B;">${remaining}</span></span>
        `;
    }

    /**
     * 创建简易 PBR 材质（关卡生成用）
     */
    makeMaterial(color, roughness = 0.9, metalness = 0.0) {
        return new THREE.MeshStandardMaterial({
            color, roughness, metalness
        });
    }

    createGroundForLevel(theme) {
        const groundSize = 80;
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 30, 30);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: theme.ground,
            roughness: 0.95,
            metalness: 0.0
        });
        const positions = groundGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const dist = Math.sqrt(x * x + y * y);
            const height = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 0.15;
            const edgeRise = dist > groundSize / 2 - 3 ? (dist - (groundSize / 2 - 3)) * 0.5 : 0;
            positions.setZ(i, height + edgeRise);
        }
        groundGeometry.computeVertexNormals();
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.levelMeshes.push(ground);
    }

    createStonePath(theme) {
        const stonePathGeo = new THREE.PlaneGeometry(3, 60, 1, 1);
        const stonePathMat = new THREE.MeshStandardMaterial({
            color: theme.platform,
            roughness: 0.85
        });
        const stonePath = new THREE.Mesh(stonePathGeo, stonePathMat);
        stonePath.rotation.x = -Math.PI / 2;
        stonePath.position.y = 0.02;
        stonePath.receiveShadow = true;
        this.scene.add(stonePath);
        this.levelMeshes.push(stonePath);
    }

    /**
     * 创建一个平台 mesh，加入关卡结构 + meshes
     */
    createPlatform(p, theme) {
        const platformMat = new THREE.MeshStandardMaterial({
            color: theme.platform,
            roughness: 0.85,
            metalness: 0.1
        });
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(p.w, p.h, p.d),
            platformMat
        );
        mesh.position.set(p.x, p.y, p.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.levelMeshes.push(mesh);
        this.castleStructures.push({ mesh, type: 'platform' });
    }

    createBoundaryWallsForLevel(theme) {
        const wallMat = new THREE.MeshStandardMaterial({
            color: theme.accent,
            roughness: 0.95
        });
        const boundary = 40;
        const boundaries = [
            { x: 0, z: -boundary, w: boundary * 2, d: 1 },
            { x: 0, z: boundary, w: boundary * 2, d: 1 },
            { x: -boundary, z: 0, w: 1, d: boundary * 2 },
            { x: boundary, z: 0, w: 1, d: boundary * 2 },
        ];
        for (const b of boundaries) {
            const wall = new THREE.Mesh(
                new THREE.BoxGeometry(b.w, 12, b.d),
                wallMat
            );
            wall.position.set(b.x, 6, b.z);
            wall.castShadow = true;
            wall.receiveShadow = true;
            this.scene.add(wall);
            this.levelMeshes.push(wall);
            this.castleStructures.push({ mesh: wall, type: 'boundary' });
        }
    }

    createParticles(theme) {
        const particleCount = 500;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 50;
            positions[i + 1] = Math.random() * 20;
            positions[i + 2] = (Math.random() - 0.5) * 50;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            color: theme.accent,
            size: 0.1,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        this.levelMeshes.push(particles);
        this.animateParticles = () => {
            const positions = particles.geometry.attributes.position.array;
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] -= 0.02;
                if (positions[i] < 0) positions[i] = 20;
            }
            particles.geometry.attributes.position.needsUpdate = true;
        };
    }

    // ----- 占位的装饰方法（覆盖旧版本）-----
    // 这些由 createEnvironment 的旧方法提供，下面将覆盖

    createEnvironment() {
        // ===== 青山绿水武侠风 3D 地图 =====
        // 设计原则：功能性布局（高低平台/走廊）+ 自然色调（青草/翠竹/溪石）

        // 蓝天
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0xC8E6F5, 25, 65);

        // 主地面 - 青草地
        const groundSize = 30;
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 30, 30);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x7CB342, // 鲜草绿
            roughness: 0.95,
            metalness: 0.0
        });

        // 给地面添加起伏（草坡效果）
        const positions = groundGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            // 边缘抬高，中间平坦
            const dist = Math.sqrt(x*x + y*y);
            const height = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 0.15;
            const edgeRise = dist > groundSize/2 - 3 ? (dist - (groundSize/2 - 3)) * 0.5 : 0;
            positions.setZ(i, height + edgeRise);
        }
        groundGeometry.computeVertexNormals();

        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // 添加武侠风格的石板路（仅中央）
        const stonePathGeo = new THREE.PlaneGeometry(3, groundSize, 1, 1);
        const stonePathMat = new THREE.MeshStandardMaterial({
            color: 0x9E9E9E,
            roughness: 0.85
        });
        const stonePath = new THREE.Mesh(stonePathGeo, stonePathMat);
        stonePath.rotation.x = -Math.PI / 2;
        stonePath.position.y = 0.02;
        stonePath.receiveShadow = true;
        this.scene.add(stonePath);

        // ===== 地图结构 =====
        this.castleStructures = []; // 用于碰撞检测
        this.createCastleWalls();
        this.createPlatforms();
        this.createBamboos();      // 竹林 - 武侠风关键
        this.createPillars();      // 亭柱
        this.createRocks();        // 山石
        this.createStreams();      // 溪流
        this.createBoundaryWalls();
        this.createParticles();    // 飘落的花瓣/落叶
        this.animateEnvHooks = this.animateEnvHooks || [];
    }

    createCastleWalls() {
        // 中央庭院 - 用木栅栏/矮墙分隔区域，而非封闭城墙
        const woodMat = new THREE.MeshStandardMaterial({
            color: 0x8B5A2B, // 木栏色
            roughness: 0.9,
            metalness: 0.05
        });

        const wallConfigs = [
            // 北院墙（带门洞）
            { x: 0, z: -10, w: 14, h: 1.5, d: 0.4, doorX: 0, doorW: 3 },
            // 南院墙
            { x: 0, z: 10, w: 14, h: 1.5, d: 0.4, doorX: 0, doorW: 3 },
            // 东院墙
            { x: 10, z: 0, w: 0.4, h: 1.5, d: 14, doorZ: 0, doorW: 3 },
            // 西院墙
            { x: -10, z: 0, w: 0.4, h: 1.5, d: 14, doorZ: 0, doorW: 3 },
        ];

        wallConfigs.forEach(cfg => {
            this.buildWallWithDoor(cfg, woodMat);
        });

        // 给每面矮墙加顶部装饰（瓦片）
        const tileMat = new THREE.MeshStandardMaterial({
            color: 0x5D4037,
            roughness: 0.8
        });
        [10, -10].forEach(z => {
            const tile = new THREE.Mesh(
                new THREE.BoxGeometry(14.4, 0.1, 0.6),
                tileMat
            );
            tile.position.set(0, 1.55, z);
            this.scene.add(tile);
        });
        [10, -10].forEach(x => {
            const tile = new THREE.Mesh(
                new THREE.BoxGeometry(0.6, 0.1, 14.4),
                tileMat
            );
            tile.position.set(x, 1.55, 0);
            this.scene.add(tile);
        });
    }

    createBamboos(theme) {
        // 竹林 - 武侠风标志元素（颜色随主题）
        const accent = theme?.accent ?? 0x558B2F;
        const bambooMat = new THREE.MeshStandardMaterial({
            color: 0x558B2F,
            roughness: 0.7,
            metalness: 0.1
        });
        const bambooDarkMat = new THREE.MeshStandardMaterial({
            color: 0x33691E,
            roughness: 0.7
        });
        const leafMat = new THREE.MeshStandardMaterial({
            color: accent,
            roughness: 0.6,
            side: THREE.DoubleSide
        });

        const bambooPositions = [
            [-13, -12], [-14, -8], [-13, -4], [-14, 0], [-13, 4], [-14, 8], [-13, 12],
            [13, -12], [14, -8], [13, -4], [14, 0], [13, 4], [14, 8], [13, 12],
            [-8, -13], [-4, -14], [0, -13], [4, -14], [8, -13],
            [-8, 13], [-4, 14], [0, 13], [4, 14], [8, 13],
            [-8, 18], [-4, 19], [0, 18], [4, 19], [8, 18],
        ];

        bambooPositions.forEach(([x, z], idx) => {
            const height = 5 + Math.random() * 3;
            const segments = 4 + Math.floor(Math.random() * 2);

            const bambooGeo = new THREE.CylinderGeometry(0.08, 0.12, height, 6);
            const bamboo = new THREE.Mesh(bambooGeo, idx % 3 === 0 ? bambooDarkMat : bambooMat);
            bamboo.position.set(x, height/2, z);
            bamboo.castShadow = true;
            this.scene.add(bamboo);
            this.levelMeshes.push(bamboo);

            for (let s = 1; s < segments; s++) {
                const jointGeo = new THREE.TorusGeometry(0.13, 0.02, 4, 8);
                const joint = new THREE.Mesh(jointGeo, bambooDarkMat);
                joint.position.set(x, (height / segments) * s, z);
                joint.rotation.x = Math.PI / 2;
                this.scene.add(joint);
                this.levelMeshes.push(joint);
            }

            for (let l = 0; l < 3; l++) {
                const leafGroup = new THREE.Group();
                for (let k = 0; k < 5; k++) {
                    const leafGeo = new THREE.PlaneGeometry(1.5, 0.2);
                    const leaf = new THREE.Mesh(leafGeo, leafMat);
                    leaf.rotation.z = (k / 5) * Math.PI - Math.PI / 2;
                    leaf.position.y = -k * 0.2;
                    leafGroup.add(leaf);
                }
                leafGroup.position.set(
                    x + (Math.random() - 0.5) * 0.5,
                    height - 0.5,
                    z + (Math.random() - 0.5) * 0.5
                );
                leafGroup.rotation.y = Math.random() * Math.PI * 2;
                this.scene.add(leafGroup);
                this.levelMeshes.push(leafGroup);
            }
        });
    }

    createRocks(theme) {
        // 山石 - 散落在场景中（颜色随主题）
        const rockMat = new THREE.MeshStandardMaterial({
            color: 0x757575,
            roughness: 0.95,
            metalness: 0.05
        });
        const mossMat = new THREE.MeshStandardMaterial({
            color: theme?.accent ?? 0x689F38,
            roughness: 0.9
        });

        const rockPositions = [
            { x: -7, y: 0.5, z: 7, s: 1.2 },
            { x: 7, y: 0.4, z: -7, s: 0.9 },
            { x: -7, y: 0.3, z: -7, s: 0.7 },
            { x: 7, y: 0.5, z: 7, s: 1.0 },
            { x: -12, y: 0.6, z: -15, s: 1.4 },
            { x: 12, y: 0.7, z: 15, s: 1.6 },
            { x: -22, y: 0.5, z: -22, s: 1.0 },
            { x: 22, y: 0.5, z: 22, s: 1.0 },
        ];

        rockPositions.forEach(r => {
            const rockGeo = new THREE.DodecahedronGeometry(r.s, 0);
            const rock = new THREE.Mesh(rockGeo, rockMat);
            rock.position.set(r.x, r.y, r.z);
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            rock.castShadow = true;
            rock.receiveShadow = true;
            this.scene.add(rock);
            this.levelMeshes.push(rock);

            const mossGeo = new THREE.SphereGeometry(r.s * 0.5, 6, 4);
            const moss = new THREE.Mesh(mossGeo, mossMat);
            moss.position.set(r.x, r.y + r.s * 0.7, r.z);
            this.scene.add(moss);
            this.levelMeshes.push(moss);
        });
    }

    createStreams(theme) {
        // 溪流 - 颜色随主题
        const waterMat = new THREE.MeshStandardMaterial({
            color: theme?.sky ?? 0x4FC3F7,
            roughness: 0.1,
            metalness: 0.6,
            transparent: true,
            opacity: 0.7
        });

        const streams = [
            { x: 15, z: 0, w: 1.2, d: 20, rot: 0 },
            { x: -15, z: 0, w: 1.2, d: 20, rot: 0 },
            { x: 0, z: -20, w: 20, d: 1.2, rot: 0 },
        ];

        streams.forEach(s => {
            const water = new THREE.Mesh(
                new THREE.PlaneGeometry(s.w, s.d),
                waterMat
            );
            water.rotation.x = -Math.PI / 2;
            water.position.set(s.x, 0.05, s.z);
            this.scene.add(water);
            this.levelMeshes.push(water);

            const t0 = Date.now();
            const animateWater = () => {
                const t = (Date.now() - t0) * 0.001;
                water.material.opacity = 0.6 + Math.sin(t * 2) * 0.15;
                water.position.y = 0.05 + Math.sin(t + s.x) * 0.05;
            };
            this.animateEnvHooks = this.animateEnvHooks || [];
            this.animateEnvHooks.push(animateWater);
        });

        const bridgeMat = new THREE.MeshStandardMaterial({
            color: theme?.accent ?? 0x8B5A2B,
            roughness: 0.8
        });
        const bridge = new THREE.Mesh(
            new THREE.BoxGeometry(3, 0.3, 2),
            bridgeMat
        );
        bridge.position.set(15, 0.3, 0);
        bridge.castShadow = true;
        bridge.receiveShadow = true;
        this.scene.add(bridge);
        this.levelMeshes.push(bridge);

        for (let side = -1; side <= 1; side += 2) {
            const rail = new THREE.Mesh(
                new THREE.BoxGeometry(3, 0.8, 0.1),
                bridgeMat
            );
            rail.position.set(15, 0.8, side * 1);
            this.scene.add(rail);
            this.levelMeshes.push(rail);
        }
    }

    buildWallWithDoor(cfg, material) {
        // 创建带门洞的墙（用于侠客岛屿地图）
        const doorW = cfg.doorW || 3;
        const doorH = 3.5;
        const wallH = cfg.h;

        if (cfg.w > cfg.d) {
            // 横向墙（沿X轴延伸）
            const halfW = cfg.w / 2;
            const halfDoor = doorW / 2;

            if (cfg.doorX - halfDoor > -halfW) {
                const leftW = (cfg.doorX - halfDoor) - (-halfW);
                if (leftW > 0.1) {
                    const left = new THREE.Mesh(
                        new THREE.BoxGeometry(leftW, wallH, cfg.d),
                        material
                    );
                    left.position.set((-halfW + leftW/2), wallH/2, cfg.z);
                    left.castShadow = true; left.receiveShadow = true;
                    this.scene.add(left);
                    this.levelMeshes.push(left);
                    this.castleStructures.push({ mesh: left, type: 'wall' });
                }
            }
            if (cfg.doorX + halfDoor < halfW) {
                const rightW = halfW - (cfg.doorX + halfDoor);
                if (rightW > 0.1) {
                    const right = new THREE.Mesh(
                        new THREE.BoxGeometry(rightW, wallH, cfg.d),
                        material
                    );
                    right.position.set((halfW - rightW/2), wallH/2, cfg.z);
                    right.castShadow = true; right.receiveShadow = true;
                    this.scene.add(right);
                    this.levelMeshes.push(right);
                    this.castleStructures.push({ mesh: right, type: 'wall' });
                }
            }
            const top = new THREE.Mesh(
                new THREE.BoxGeometry(doorW + 0.2, wallH - doorH, cfg.d),
                material
            );
            top.position.set(cfg.doorX, doorH + (wallH - doorH)/2, cfg.z);
            top.castShadow = true; top.receiveShadow = true;
            this.scene.add(top);
            this.levelMeshes.push(top);
            this.castleStructures.push({ mesh: top, type: 'wall' });
        } else {
            // 纵向墙（沿Z轴延伸）
            const halfD = cfg.d / 2;
            const halfDoor = doorW / 2;

            if (cfg.doorZ - halfDoor > -halfD) {
                const frontD = (cfg.doorZ - halfDoor) - (-halfD);
                if (frontD > 0.1) {
                    const front = new THREE.Mesh(
                        new THREE.BoxGeometry(cfg.w, wallH, frontD),
                        material
                    );
                    front.position.set(cfg.x, wallH/2, (-halfD + frontD/2));
                    front.castShadow = true; front.receiveShadow = true;
                    this.scene.add(front);
                    this.levelMeshes.push(front);
                    this.castleStructures.push({ mesh: front, type: 'wall' });
                }
            }
            if (cfg.doorZ + halfDoor < halfD) {
                const backD = halfD - (cfg.doorZ + halfDoor);
                if (backD > 0.1) {
                    const back = new THREE.Mesh(
                        new THREE.BoxGeometry(cfg.w, wallH, backD),
                        material
                    );
                    back.position.set(cfg.x, wallH/2, (halfD - backD/2));
                    back.castShadow = true; back.receiveShadow = true;
                    this.scene.add(back);
                    this.levelMeshes.push(back);
                    this.castleStructures.push({ mesh: back, type: 'wall' });
                }
            }
            const top = new THREE.Mesh(
                new THREE.BoxGeometry(cfg.w, wallH - doorH, doorW + 0.2),
                material
            );
            top.position.set(cfg.x, doorH + (wallH - doorH)/2, cfg.doorZ);
            top.castShadow = true; top.receiveShadow = true;
            this.scene.add(top);
            this.levelMeshes.push(top);
            this.castleStructures.push({ mesh: top, type: 'wall' });
        }
    }

    createPlatforms() {
        // 跳跃平台 - 青石板平台（武侠风），各种高度形成跳跃谜题
        const platformMat = new THREE.MeshStandardMaterial({
            color: 0x9E9E9E, // 青灰色
            roughness: 0.85,
            metalness: 0.1
        });

        const platformEdgeMat = new THREE.MeshStandardMaterial({
            color: 0x5D4037, // 木色边缘
            roughness: 0.7
        });

        // 跳跃平台 - 北区域（通往山顶）
        const lowPlatforms = [
            // 北走廊 - 通向山顶的小径（跳跃可达，每级差 1.5 单位，最大跳高 3m）
            { x: -6, y: 1.0, z: -16, w: 4, d: 4 },
            { x: 6, y: 2.5, z: -18, w: 3, d: 3 },
            { x: 0, y: 4.0, z: -22, w: 5, d: 5 },
            // 东走廊
            { x: 16, y: 1.0, z: -6, w: 4, d: 4 },
            { x: 20, y: 2.5, z: 0, w: 3, d: 3 },
            { x: 24, y: 4.0, z: 6, w: 4, d: 4 },
            // 南走廊
            { x: -6, y: 1.0, z: 16, w: 4, d: 4 },
            { x: 6, y: 2.5, z: 18, w: 4, d: 4 },
            { x: 0, y: 4.0, z: 22, w: 6, d: 6 },
            // 西走廊
            { x: -16, y: 1.0, z: 6, w: 4, d: 4 },
            { x: -20, y: 2.5, z: 0, w: 3, d: 3 },
            { x: -24, y: 4.0, z: -6, w: 4, d: 4 },
        ];

        lowPlatforms.forEach(p => {
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(p.w, 0.5, p.d),
                platformMat
            );
            mesh.position.set(p.x, p.y, p.z);
            mesh.castShadow = true; mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.castleStructures.push({ mesh, type: 'platform' });

            // 木色边缘装饰
            const edge = new THREE.Mesh(
                new THREE.BoxGeometry(p.w + 0.1, 0.1, p.d + 0.1),
                platformEdgeMat
            );
            edge.position.set(p.x, p.y + 0.3, p.z);
            this.scene.add(edge);
        });

        // 最高平台 - 山顶观景台（带凉亭）
        const topPlatform = new THREE.Mesh(
            new THREE.BoxGeometry(8, 0.6, 8),
            new THREE.MeshStandardMaterial({
                color: 0xA1887F,
                roughness: 0.7,
                metalness: 0.1
            })
        );
        topPlatform.position.set(0, 7, -25);
        topPlatform.castShadow = true; topPlatform.receiveShadow = true;
        this.scene.add(topPlatform);
        this.castleStructures.push({ mesh: topPlatform, type: 'platform' });

        // 凉亭四柱
        const pillarMat = new THREE.MeshStandardMaterial({
            color: 0x6D4C41,
            roughness: 0.8
        });
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const pillar = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15, 0.15, 5, 8),
                pillarMat
            );
            pillar.position.set(
                Math.cos(angle) * 3.5,
                9.8,
                -25 + Math.sin(angle) * 3.5
            );
            this.scene.add(pillar);
        }

        // 凉亭屋顶 - 中国传统瓦顶
        const roofGeo = new THREE.ConeGeometry(6, 2.5, 4);
        const roofMat = new THREE.MeshStandardMaterial({
            color: 0x4E342E,
            roughness: 0.7
        });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(0, 12, -25);
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        this.scene.add(roof);

        // 屋顶装饰 - 屋脊
        const ridgeGeo = new THREE.BoxGeometry(5, 0.2, 0.3);
        const ridge = new THREE.Mesh(ridgeGeo, new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            emissive: 0xFFD700,
            emissiveIntensity: 0.3
        }));
        ridge.position.set(0, 12.5, -25);
        this.scene.add(ridge);

        // 屋顶角装饰
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
            const cornerGeo = new THREE.ConeGeometry(0.3, 0.6, 4);
            const corner = new THREE.Mesh(cornerGeo, new THREE.MeshStandardMaterial({
                color: 0xFFD700,
                emissive: 0xFFD700,
                emissiveIntensity: 0.4
            }));
            corner.position.set(
                Math.cos(angle) * 4.2,
                11.5,
                -25 + Math.sin(angle) * 4.2
            );
            corner.rotation.z = Math.PI;
            this.scene.add(corner);
        }

        // 凉亭中央的"武"字发光球（代替水晶）
        const orb = new THREE.Mesh(
            new THREE.SphereGeometry(0.6, 16, 16),
            new THREE.MeshStandardMaterial({
                color: 0xFFD700,
                emissive: 0xFFD700,
                emissiveIntensity: 0.8,
                metalness: 0.9,
                roughness: 0.1
            })
        );
        orb.position.set(0, 9, -25);
        this.scene.add(orb);

        // 旋转动画
        const orbAnim = () => {
            const t = Date.now() * 0.001;
            orb.rotation.y = t;
            orb.position.y = 9 + Math.sin(t * 2) * 0.2;
        };
        this.animateEnvHooks = this.animateEnvHooks || [];
        this.animateEnvHooks.push(orbAnim);
    }

    createLanterns() {
        // 已废止，灯笼改为岩石装饰
    }

    createBoundaryWalls() {
        // 地图边界 - 用远山轮廓代替硬墙
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x689F38, // 远山绿
            roughness: 0.95
        });
        const boundary = 30;

        const boundaries = [
            { x: 0, z: -boundary, w: boundary * 2, d: 1 },
            { x: 0, z: boundary, w: boundary * 2, d: 1 },
            { x: -boundary, z: 0, w: 1, d: boundary * 2 },
            { x: boundary, z: 0, w: 1, d: boundary * 2 },
        ];

        boundaries.forEach(b => {
            const wall = new THREE.Mesh(
                new THREE.BoxGeometry(b.w, 8, b.d),
                wallMat
            );
            wall.position.set(b.x, 4, b.z);
            wall.castShadow = true; wall.receiveShadow = true;
            this.scene.add(wall);
            this.castleStructures.push({ mesh: wall, type: 'boundary' });
        });

        // 远山 - 半透明山影（仅装饰）
        const farMountainMat = new THREE.MeshStandardMaterial({
            color: 0x558B6E,
            roughness: 1.0,
            transparent: true,
            opacity: 0.85
        });

        const mountains = [
            { x: -35, z: -20, s: 15, h: 12 },
            { x: 35, z: -20, s: 18, h: 14 },
            { x: -35, z: 25, s: 14, h: 10 },
            { x: 35, z: 25, s: 16, h: 13 },
            { x: 0, z: -45, s: 25, h: 18 },
            { x: 0, z: 40, s: 22, h: 16 },
        ];

        mountains.forEach(m => {
            const mountainGeo = new THREE.ConeGeometry(m.s, m.h, 6);
            const mountain = new THREE.Mesh(mountainGeo, farMountainMat);
            mountain.position.set(m.x, m.h/2, m.z);
            mountain.castShadow = false;
            mountain.receiveShadow = false;
            this.scene.add(mountain);

            // 山顶雪
            const snowGeo = new THREE.ConeGeometry(m.s * 0.3, m.h * 0.3, 6);
            const snow = new THREE.Mesh(snowGeo, new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
                roughness: 0.9
            }));
            snow.position.set(m.x, m.h - m.h * 0.15, m.z);
            this.scene.add(snow);
        });
    }

    createPillars(theme) {
        // 凉亭柱（颜色随主题）
        const pillarGeometry = new THREE.CylinderGeometry(0.35, 0.4, 4.5, 8);
        const pillarMaterial = new THREE.MeshStandardMaterial({
            color: theme?.accent ?? 0x6D4C41,
            roughness: 0.8,
            metalness: 0.1
        });
        const capMat = new THREE.MeshStandardMaterial({ color: 0x5D4037 });
        const baseMat = new THREE.MeshStandardMaterial({ color: theme?.platform ?? 0x9E9E9E });

        const positions = [
            [-6, 2.25, -6], [6, 2.25, -6],
            [-6, 2.25, 6], [6, 2.25, 6],
        ];

        positions.forEach(pos => {
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(...pos);
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            this.scene.add(pillar);
            this.levelMeshes.push(pillar);

            const cap = new THREE.Mesh(
                new THREE.BoxGeometry(1.4, 0.3, 0.3),
                capMat
            );
            cap.position.set(pos[0], pos[1] + 2.4, pos[2]);
            this.scene.add(cap);
            this.levelMeshes.push(cap);

            const base = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.55, 0.4, 8),
                baseMat
            );
            base.position.set(pos[0], pos[1] - 2.05, pos[2]);
            this.scene.add(base);
            this.levelMeshes.push(base);
        });
    }
    
    // (旧版 createParticles/spawnEnemies 已移除 - 改用 initLevel/spawnNextEnemyBatch)
    
    setupControls() {
        // 键盘控制
        window.addEventListener('keydown', (e) => {
            this.gameState.keys[e.key] = true;

            if (!this.gameState.gameStarted) return;

            // 轻击 J
            if (e.key === 'j' || e.key === 'J') {
                this.performLightAttack();
            }

            // 重击 K
            if (e.key === 'k' || e.key === 'K') {
                this.performHeavyAttack();
            }

            // 跳跃 Space
            if (e.key === ' ') {
                e.preventDefault();
                this.player.performJump();
            }

            // 闪避翻滚 Shift（慢+长无敌帧）
            if (e.key === 'Shift') {
                this.performDodge();
            }

            // 法术技能 L
            if (e.key === 'l' || e.key === 'L') {
                this.performSkill();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.gameState.keys[e.key] = false;
        });
    }
    
    performLightAttack() {
        const stamina = this.gameState.player.stamina;
        const staminaCost = 10;

        if (stamina < staminaCost || this.gameState.player.isAttacking) return;

        this.gameState.player.isAttacking = true;
        this.gameState.updateStamina(stamina - staminaCost);

        // 执行攻击动画
        this.player.performLightAttack();

        // 检测攻击命中 - 前方90度扇形（轻击快速、范围小）
        const attackRange = 2.8;
        const damage = 15;
        this.checkAttackHit(attackRange, damage, 90);

        // 连击系统
        const now = Date.now();
        if (now - this.gameState.player.lastAttackTime < 1000) {
            this.gameState.player.combo++;
        } else {
            this.gameState.player.combo = 1;
        }
        this.gameState.player.lastAttackTime = now;

        // 更新连击显示
        this.gameState.updateCombo();

        setTimeout(() => {
            this.gameState.player.isAttacking = false;
        }, 300);
    }

    performHeavyAttack() {
        const stamina = this.gameState.player.stamina;
        const staminaCost = 25;

        if (stamina < staminaCost || this.gameState.player.isAttacking) return;

        this.gameState.player.isAttacking = true;
        this.gameState.updateStamina(stamina - staminaCost);

        // 执行重击动画
        this.player.performHeavyAttack();

        // 检测攻击命中 - 前方120度扇形（重击范围更大）
        const attackRange = 4;
        const damage = 35;
        this.checkAttackHit(attackRange, damage, 120);

        this.gameState.player.combo = 0;
        this.gameState.updateCombo();

        setTimeout(() => {
            this.gameState.player.isAttacking = false;
        }, 600);
    }
    
    performDodge() {
        const stamina = this.gameState.player.stamina;
        const staminaCost = 20;

        if (stamina < staminaCost || this.gameState.player.isDodging) return;

        this.gameState.player.isDodging = true;
        this.gameState.updateStamina(stamina - staminaCost);

        // 执行闪避动画（NiuLai.performDodge 会自动在动画结束时重置 isDodging）
        this.player.performDodge();
    }
    
    performSkill() {
        const stamina = this.gameState.player.stamina;
        const staminaCost = 40;

        if (stamina < staminaCost) return;

        this.gameState.updateStamina(stamina - staminaCost);

        // 法术技能 - 范围攻击
        this.createSkillEffect();

        // 检测攻击命中 - 前方180度大扇形（技能是全方位范围）
        const attackRange = 7;
        const damage = 50;
        this.checkAttackHit(attackRange, damage, 180);
    }
    
    createSkillEffect() {
        // 创建技能特效 - 角色前方的扇形冲击波
        const playerPos = this.player.mesh.position;
        const playerRotY = this.player.mesh.rotation.y;

        // 角色正前方的单位向量（与移动方向一致）
        const forwardX = Math.sin(playerRotY);
        const forwardZ = Math.cos(playerRotY);

        // 1. 创建扇形冲击波（前方180度）
        // ConeGeometry默认顶点在+0.5*height，底部在-0.5*height
        // thetaStart和thetaLength控制扇形角度
        // 让扇形从原点向前方+水平铺开
        const coneGeometry = new THREE.ConeGeometry(7, 7, 32, 1, true, -Math.PI / 2, Math.PI);
        const coneMaterial = new THREE.MeshBasicMaterial({
            color: 0x38BDF8,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        // ConeGeometry沿+Y轴，先旋转使底部朝+Z（前方）
        cone.rotation.x = Math.PI / 2;
        // 再旋转让扇形朝向角色的rotation.y方向
        // 由于ConeGeometry的"前方"是+Z轴，rotation.z用于绕Z旋转
        cone.rotation.z = -playerRotY;
        // 中心放在角色前方3.5（锥体高度的一半）
        cone.position.set(
            playerPos.x + forwardX * 3.5,
            1.0,
            playerPos.z + forwardZ * 3.5
        );
        this.scene.add(cone);

        // 2. 添加冲击波外环（地面上的扩散环）
        const ringGeometry = new THREE.RingGeometry(2, 2.2, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x38BDF8,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.rotation.z = -playerRotY;
        ring.position.set(
            playerPos.x + forwardX * 3.5,
            0.15,
            playerPos.z + forwardZ * 3.5
        );
        this.scene.add(ring);

        // 3. 添加向上的光柱（角色头顶）
        const cylinderGeometry = new THREE.CylinderGeometry(0.5, 2, 5, 32, 1, true);
        const cylinderMaterial = new THREE.MeshBasicMaterial({
            color: 0x38BDF8,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
        cylinder.position.set(playerPos.x, 2.5, playerPos.z);
        this.scene.add(cylinder);

        // 扩散动画
        let scale = 1;
        const animate = () => {
            scale += 0.3;
            ring.scale.set(scale, scale, scale);
            ring.material.opacity = Math.max(0, 0.9 - scale * 0.1);

            cylinder.scale.set(1, Math.min(2, scale * 0.5), 1);
            cylinder.material.opacity = Math.max(0, 0.4 - scale * 0.05);

            cone.material.opacity = Math.max(0, 0.35 - scale * 0.04);

            if (scale < 10) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(cone);
                this.scene.remove(ring);
                this.scene.remove(cylinder);
                coneGeometry.dispose();
                coneMaterial.dispose();
                ringGeometry.dispose();
                ringMaterial.dispose();
                cylinderGeometry.dispose();
                cylinderMaterial.dispose();
            }
        };
        animate();
    }
    
    checkAttackHit(range, damage, angleDeg = 90) {
        const playerPos = this.gameState.player.position;
        const playerRotY = this.player.mesh.rotation.y;

        // 将扇形的中心方向从rotation.y转化为单位向量
        // 注意：Three.js的rotation.y为0时，模型面朝+Z方向
        // 但相机偏移在+Z方向，所以rotation.y为0时，角色背对相机（屏幕里）
        // 为了符合玩家直觉（面朝相机的方向=远离屏幕=W方向），
        // 我们直接用+sin/cos即可（与移动逻辑一致）
        const forwardX = Math.sin(playerRotY);
        const forwardZ = Math.cos(playerRotY);
        const halfAngleRad = (angleDeg / 2) * (Math.PI / 180);

        // 调试日志：记录当前玩家朝向和位置
        console.log(`⚔️ 攻击判定: 玩家位置=(${playerPos.x.toFixed(2)}, ${playerPos.z.toFixed(2)}) 朝向=${playerRotY.toFixed(2)}rad, 扇形±${(angleDeg/2)}°, 范围=${range}`);
        let hitCount = 0;

        this.gameState.enemies.forEach(enemy => {
            if (!enemy.mesh || enemy.health <= 0) return;

            const dx = enemy.position.x - playerPos.x;
            const dz = enemy.position.z - playerPos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance > range || distance < 0.1) {
                return; // 超出范围
            }

            // 计算敌人相对玩家面朝方向的角度
            const dirX = dx / distance;
            const dirZ = dz / distance;
            const dot = forwardX * dirX + forwardZ * dirZ;
            const angleToEnemy = Math.acos(Math.max(-1, Math.min(1, dot)));

            if (angleToEnemy > halfAngleRad) {
                console.log(`  └─ 敌人在范围${distance.toFixed(2)}但角度${(angleToEnemy*180/Math.PI).toFixed(1)}°超出扇形±${angleDeg/2}°`);
                return;
            }

            enemy.takeDamage(damage);
            this.gameState.currentTarget = enemy;
            this.gameState.updateEnemyHealth(enemy);

            // 连击加成
            const comboBonus = this.gameState.player.combo * 5;
            if (comboBonus > 0) {
                enemy.takeDamage(comboBonus);
            }

            // 创建击中特效
            this.createHitEffect(enemy.position);

            // 显示伤害数字
            this.showDamageNumber(enemy.position, damage + comboBonus);

            hitCount++;
        });

        if (hitCount > 0) {
            console.log(`✅ 命中 ${hitCount} 个目标`);
        } else {
            console.log(`❌ 未命中任何目标`);
        }
    }
    
    createHitEffect(position) {
        // 击中时的火花特效 - 优化：减少粒子数量，避免卡死
        // 限制同时存在的粒子总数
        if (this.activeParticles > this.maxParticles) {
            return;
        }

        const particleCount = 8; // 从20减少到8
        const particles = [];

        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.05, 4, 4);
            const material = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0xF59E0B : 0xFBBF24
            });
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            particle.position.y += 1;

            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.3,
                (Math.random() - 0.5) * 0.3
            );

            this.scene.add(particle);
            particles.push(particle);
            this.activeParticles++;
        }

        // 动画
        let lifetime = 0;
        const animate = () => {
            lifetime += 0.05;

            particles.forEach(particle => {
                particle.position.add(particle.velocity);
                particle.velocity.y -= 0.01; // 重力
                particle.scale.multiplyScalar(0.95);
            });

            if (lifetime < 1) {
                requestAnimationFrame(animate);
            } else {
                particles.forEach(p => {
                    this.scene.remove(p);
                    p.geometry.dispose();
                    p.material.dispose();
                    this.activeParticles--;
                });
            }
        };
        animate();
    }
    
    showDamageNumber(position, damage) {
        // 创建伤害数字（使用3D文本替代）
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#F59E0B';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.floor(damage), 64, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        sprite.position.y += 2;
        sprite.scale.set(1, 0.5, 1);
        
        this.scene.add(sprite);
        
        // 上浮动画
        let height = 0;
        const animate = () => {
            height += 0.05;
            sprite.position.y += 0.05;
            sprite.material.opacity = Math.max(0, 1 - height);
            
            if (height < 2) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(sprite);
                texture.dispose();
                material.dispose();
            }
        };
        animate();
    }
    
    updateCamera() {
        if (!this.player.mesh) return;

        // 真正的右侧越肩第三人称视角：
        // 相机紧贴在玩家右肩后方，随玩家转身一起转
        const targetPos = this.player.mesh.position;
        const playerRotY = this.player.mesh.rotation.y;

        // 项目约定（与现有移动代码一致）：
        //   forward (玩家面前)  = ( sin(y), 0,  cos(y) )
        //   back    (玩家身后)  = (-sin(y), 0, -cos(y) )
        //   right   (玩家右手)  = ( cos(y), 0, -sin(y) )
        // 也就是说 rotation.y=0 时角色面朝 +Z
        const cosY = Math.cos(playerRotY);
        const sinY = Math.sin(playerRotY);

        // 相机放在玩家右肩后上方
        const offsetRight = -1.4;   // 玩家右侧 0.7（贴近右肩）
        const offsetBack  = 3.4;   // 玩家身后 1.6
        const offsetUp    = 3.4;   // 玩家头顶上方 1.4

        // cameraPos = pos + back*offsetBack + right*offsetRight + up*offsetUp
        const cameraPos = new THREE.Vector3(
            targetPos.x + (-sinY) * offsetBack + cosY * offsetRight,
            targetPos.y + offsetUp,
            targetPos.z + (-cosY) * offsetBack + (-sinY) * offsetRight
        );

        // 平滑移动
        this.camera.position.lerp(cameraPos, 0.25);

        // 相机看向玩家前方地面（跟玩家朝向）
        // lookTarget = pos + forward * 4 + up * 0.5
        const lookTarget = new THREE.Vector3(
            targetPos.x + sinY * 4,
            targetPos.y + 0.5,
            targetPos.z + cosY * 4
        );
        this.camera.lookAt(lookTarget);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * 玩家死亡处理：暂停游戏 + 弹出选择界面（重来/退出）
     */
    triggerPlayerDeath(reason) {
        // 防止重复触发
        if (this.gameState.gameStarted === false && this._deathScreenShown) return;
        this._deathScreenShown = true;

        // 暂停游戏逻辑
        this.gameState.gameStarted = false;
        // 暂停 clock 防止 delta 累积
        this.clock.stop();

        // 隐藏调试面板（避免干扰死亡界面）
        const debugPanel = document.getElementById('debug-panel');
        if (debugPanel) debugPanel.style.display = 'none';

        // 创建死亡界面
        const deathScreen = document.createElement('div');
        deathScreen.id = 'death-screen';
        deathScreen.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            font-family: 'Microsoft YaHei', sans-serif;
            color: white;
        `;
        deathScreen.innerHTML = `
            <div style="font-size: 80px; margin-bottom: 20px;">💀</div>
            <h1 style="font-size: 48px; margin: 0 0 16px 0; color: #ff4444; text-shadow: 0 0 20px rgba(255,68,68,0.6);">你 死 了</h1>
            <p style="font-size: 18px; color: #aaa; margin-bottom: 40px;">死因：${reason}</p>
            <div style="display: flex; gap: 20px;">
                <button id="btn-retry" style="
                    padding: 14px 40px;
                    font-size: 20px;
                    background: linear-gradient(135deg, #4CAF50, #2E7D32);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-family: inherit;
                    font-weight: bold;
                    box-shadow: 0 4px 12px rgba(76,175,80,0.4);
                ">🔄 重来</button>
                <button id="btn-quit" style="
                    padding: 14px 40px;
                    font-size: 20px;
                    background: linear-gradient(135deg, #f44336, #c62828);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-family: inherit;
                    font-weight: bold;
                    box-shadow: 0 4px 12px rgba(244,67,54,0.4);
                ">🚪 退出</button>
            </div>
        `;
        document.body.appendChild(deathScreen);

        // 重来按钮
        document.getElementById('btn-retry').onclick = () => {
            deathScreen.remove();
            if (debugPanel) debugPanel.style.display = '';
            this.respawnPlayer();
        };

        // 退出按钮
        document.getElementById('btn-quit').onclick = () => {
            deathScreen.remove();
            this._deathScreenShown = false;
            if (debugPanel) debugPanel.style.display = '';
            // 退出到主菜单：隐藏 canvas，停止游戏循环
            this.gameState.gameStarted = false;
            document.getElementById('loading')?.classList.remove('hidden');
            const gameCanvas = document.querySelector('canvas');
            if (gameCanvas) gameCanvas.style.display = 'none';
        };
    }

    /**
     * 重生玩家：恢复满血、清空怪物、重置位置
     */
    respawnPlayer() {
        this._deathScreenShown = false;

        // 1. 重置玩家状态
        this.gameState.player.health = this.gameState.player.maxHealth;
        this.gameState.player.stamina = this.gameState.player.maxStamina;
        this.gameState.player.combo = 0;
        this.gameState.player.velocityY = 0;
        this.gameState.player.isGrounded = true;
        this.gameState.player.isJumping = false;
        this.gameState.player.isDodging = false;
        this.gameState.player.isAttacking = false;
        this.gameState.player.isInvulnerable = false;
        // 短暂无敌（防止怪物立即攻击）
        this.gameState.player.isInvulnerable = true;
        this.gameState.player.invulnerableUntil = Date.now() + 1500; // 1.5 秒无敌

        if (this.player && this.player.mesh) {
            this.player.mesh.position.set(0, 0, 0);
            this.player.mesh.rotation.y = 0;
            // 同步玩家位置到 gameState
            this.gameState.player.position.copy(this.player.mesh.position);
        }

        // 2. 清空所有现有怪物（从场景移除 mesh + 从数组清空）
        for (const enemy of this.gameState.enemies) {
            if (enemy.mesh) {
                this.scene.remove(enemy.mesh);
                // 释放几何/材质（防内存泄漏）
                enemy.mesh.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
        }
        this.gameState.enemies = [];

        // 3. 重置怪物 spawn 计时 & 刷怪计数（让本关重新开始刷怪）
        this.lastEnemySpawn = Date.now();
        this.levelEnemiesSpawned = 0;
        this.levelEnemiesKilled = 0;

        // 4. 重置游戏状态标志，让 animate 恢复运行
        this.gameState.gameStarted = true;
        // 重置 clock 防止 delta 跳变
        this.clock = new THREE.Clock();

        console.log('✨ 玩家已重生（已清空怪物 + 1.5s 无敌）');
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // 游戏未启动：只渲染静态场景
        if (!this.gameState.gameStarted) {
            this.renderer.render(this.scene, this.camera);
            return;
        }

        const delta = this.clock.getDelta();

        // 检查重生后的无敌期是否到期
        if (this.gameState.player.isInvulnerable && this.gameState.player.invulnerableUntil) {
            if (Date.now() > this.gameState.player.invulnerableUntil) {
                this.gameState.player.isInvulnerable = false;
                this.gameState.player.invulnerableUntil = 0;
                console.log('🛡️ 无敌期结束');
            }
        }

        // 更新玩家
        if (this.player) {
            this.player.update(delta, this.gameState);

            // 死亡判定 1：掉出虚空（y < -10）
            if (this.player.mesh.position.y < -10) {
                console.log('💀 玩家坠入虚空，y=', this.player.mesh.position.y);
                this.triggerPlayerDeath('掉入虚空');
                return;
            }

            // 死亡判定 2：血量归零
            if (this.gameState.player.health <= 0) {
                console.log('💀 玩家死亡，health=', this.gameState.player.health);
                this.triggerPlayerDeath('血量耗尽');
                return;
            }

            // 更新方向指示器：跟随玩家位置 + 旋转
            if (this.directionIndicator) {
                this.directionIndicator.position.x = this.player.mesh.position.x;
                this.directionIndicator.position.z = this.player.mesh.position.z;
                this.directionIndicator.position.y = 0.2;
                this.directionIndicator.rotation.y = this.player.mesh.rotation.y;
            }
        }
        
        // 更新敌人
        this.gameState.enemies.forEach(enemy => {
            enemy.update(delta, this.gameState.player.position);

            // 检测敌人攻击玩家 - 尊重无敌帧
            if (!this.gameState.player.isDodging && !this.gameState.player.isInvulnerable) {
                const distance = this.gameState.player.position.distanceTo(enemy.mesh.position);
                // 怪物只在"挥过拳"后（lastAttackTime > 0）的攻击窗口里才伤血
                // 防止刚 spawn 或刚靠近就瞬间扣血
                const attackWindowMs = 400;
                // 同一只怪每 0.5 秒最多扣一次血（防多帧连续扣血秒杀）
                const damageCooldownMs = 500;
                if (enemy.lastAttackTime > 0
                    && distance < enemy.attackRange
                    && Date.now() - enemy.lastAttackTime < attackWindowMs
                    && Date.now() - enemy.lastAttackTime > 50
                    && (!enemy._lastDamageTime || Date.now() - enemy._lastDamageTime > damageCooldownMs)) {
                    this.gameState.updateHealth(this.gameState.player.health - enemy.attackDamage);
                    enemy._lastDamageTime = Date.now();
                }
            }
        });

        // 清理死亡敌人
        this.gameState.enemies = this.gameState.enemies.filter(e => e.health > 0 && e.mesh);

        // 检查是否需要补刷怪物（本关还没杀光 & 场上少于 2 只）
        if (this.levelEnemiesKilled < this.levelEnemiesRequired
            && this.gameState.enemies.length < 2
            && !this.levelTransitioning) {
            this.spawnNextEnemyBatch();
        }

        // 检查金球接触（过关）
        this.checkGateTouch();

        // 更新玩家攻击范围圆环位置（跟随玩家）
        if (this.playerAttackRing && this.player?.mesh) {
            this.playerAttackRing.position.x = this.player.mesh.position.x;
            this.playerAttackRing.position.z = this.player.mesh.position.z;
        }

        // 更新粒子
        if (this.animateParticles) {
            this.animateParticles();
        }

        // 更新关卡动画 hooks（金球、溪流等）
        if (this.levelAnimHooks) {
            this.levelAnimHooks.forEach(hook => hook());
        }
        if (this.animateEnvHooks) {
            this.animateEnvHooks.forEach(hook => hook());
        }
        
        // 更新相机
        this.updateCamera();
        
        // 渲染场景
        this.renderer.render(this.scene, this.camera);
    }
}

// 启动游戏
try {
    console.log('🎮 黑神话 - 牛来 游戏启动中...');
    console.log('📦 检查依赖: THREE =', typeof THREE);
    
    if (typeof THREE === 'undefined') {
        throw new Error('Three.js 未加载成功，请检查网络连接');
    }
    
    console.log('🏗️ 开始创建游戏实例...');
    const game = new Game();
    console.log('✅ 游戏初始化成功！');
    console.log('📝 操作提示：');
    console.log('   W/A/S/D - 移动');
    console.log('   J - 轻击攻击');
    console.log('   K - 重击攻击');
    console.log('   Space - 闪避翻滚');
    console.log('   L - 法术技能');
    
    // 启用调试面板
    if (typeof GameDebugger !== 'undefined') {
        const gameDebugger = new GameDebugger(game);
        console.log('🔧 调试面板已启用');
    }
} catch (error) {
    console.error('❌ 游戏启动失败:', error);
    console.error('错误堆栈:', error.stack);
    document.getElementById('loading').innerHTML = `
        <div class="loading-text" style="color: #F97316;">加载失败</div>
        <div style="color: #94A3B8; font-size: 14px; margin-top: 10px;">
            ${error.message}
        </div>
        <div style="color: #64748B; font-size: 12px; margin-top: 10px;">
            请打开浏览器控制台查看详细错误信息
        </div>
    `;
}