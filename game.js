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
    constructor(scene) {
        this.scene = scene;
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
        
        // 移动逻辑
        const moveSpeed = 5;
        const rotateSpeed = 3;
        let moved = false;
        
        if (gameState.keys['w'] || gameState.keys['W']) {
            this.mesh.position.x += Math.sin(this.mesh.rotation.y) * moveSpeed * delta;
            this.mesh.position.z += Math.cos(this.mesh.rotation.y) * moveSpeed * delta;
            moved = true;
        }
        if (gameState.keys['s'] || gameState.keys['S']) {
            this.mesh.position.x -= Math.sin(this.mesh.rotation.y) * moveSpeed * delta;
            this.mesh.position.z -= Math.cos(this.mesh.rotation.y) * moveSpeed * delta;
            moved = true;
        }
        if (gameState.keys['a'] || gameState.keys['A']) {
            this.mesh.rotation.y += rotateSpeed * delta;
        }
        if (gameState.keys['d'] || gameState.keys['D']) {
            this.mesh.rotation.y -= rotateSpeed * delta;
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
    
    performLightAttack() {
        if (!this.weapon || !this.mesh) return;
        
        // 轻击动画
        const originalZ = this.weapon.rotation.z;
        this.weapon.rotation.z = -1.5;
        
        setTimeout(() => {
            if (this.weapon) this.weapon.rotation.z = originalZ;
        }, 200);
    }
    
    performHeavyAttack() {
        if (!this.weapon || !this.mesh) return;
        
        // 重击动画 - 360度旋转
        const startRotation = this.weapon.rotation.y;
        let elapsed = 0;
        const duration = 0.5;
        
        const animate = () => {
            elapsed += 0.016;
            if (elapsed < duration && this.weapon) {
                this.weapon.rotation.y = startRotation + (elapsed / duration) * Math.PI * 2;
                requestAnimationFrame(animate);
            } else if (this.weapon) {
                this.weapon.rotation.y = startRotation;
            }
        };
        animate();
    }
    
    performDodge() {
        if (!this.mesh) return;
        
        // 闪避翻滚 - 快速向前移动
        const dodgeDistance = 3;
        const targetX = this.mesh.position.x + Math.sin(this.mesh.rotation.y) * dodgeDistance;
        const targetZ = this.mesh.position.z + Math.cos(this.mesh.rotation.y) * dodgeDistance;
        
        const startX = this.mesh.position.x;
        const startZ = this.mesh.position.z;
        let elapsed = 0;
        const duration = 0.3;
        
        const animate = () => {
            elapsed += 0.016;
            if (elapsed < duration && this.mesh) {
                const progress = elapsed / duration;
                this.mesh.position.x = startX + (targetX - startX) * progress;
                this.mesh.position.z = startZ + (targetZ - startZ) * progress;
                this.mesh.rotation.x = progress * Math.PI * 2;
                requestAnimationFrame(animate);
            } else if (this.mesh) {
                this.mesh.position.x = targetX;
                this.mesh.position.z = targetZ;
                this.mesh.rotation.x = 0;
            }
        };
        animate();
    }
}

// 敌人类
class Enemy {
    constructor(scene, position, name = '妖怪') {
        this.scene = scene;
        this.name = name;
        this.health = 100;
        this.maxHealth = 100;
        this.position = position;
        this.mesh = null;
        this.attackRange = 3;
        this.attackCooldown = 2000;
        this.lastAttackTime = 0;
        this.createEnemy();
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
            this.attack();
            this.lastAttackTime = now;
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
        
        console.log('📋 调用 init() 方法...');
        this.init();
        console.log('✅ Game 构造函数完成');
    }
    
    init() {
        console.log('🎬 开始场景初始化...');
        
        // 场景设置
        console.log('  - 创建场景');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0B0E14);
        this.scene.fog = new THREE.Fog(0x0B0E14, 10, 50);
        
        // 相机设置
        console.log('  - 创建相机');
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 8, 12);
        this.camera.lookAt(0, 0, 0);
        
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
        
        // 创建场景
        console.log('  - 创建环境');
        this.createEnvironment();
        
        // 创建玩家
        console.log('  - 创建玩家角色');
        this.player = new NiuLai(this.scene);
        
        // 创建敌人
        console.log('  - 生成敌人');
        this.spawnEnemies();
        
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
        }, 1000);
        
        // 开始游戏循环
        console.log('🔄 启动游戏循环');
        this.animate();
    }
    
    setupLights() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        // 主光源 - 模拟太阳
        const directionalLight = new THREE.DirectionalLight(0xF59E0B, 1);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // 辅助光 - 青色调
        const fillLight = new THREE.DirectionalLight(0x38BDF8, 0.3);
        fillLight.position.set(-10, 10, -10);
        this.scene.add(fillLight);
        
        // 点光源 - 营造氛围
        const pointLight = new THREE.PointLight(0x22D3EE, 1, 20);
        pointLight.position.set(0, 5, 0);
        this.scene.add(pointLight);
    }
    
    createEnvironment() {
        // 地面 - 奇幻风格
        const groundSize = 50;
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 20, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1E293B,
            roughness: 0.9,
            metalness: 0.1
        });
        
        // 给地面添加起伏
        const positions = groundGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const height = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 0.3;
            positions.setZ(i, height);
        }
        groundGeometry.computeVertexNormals();
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // 添加网格线效果
        const gridHelper = new THREE.GridHelper(groundSize, 50, 0x334155, 0x1E293B);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);
        
        // 创建一些柱子作为场景装饰
        this.createPillars();
        
        // 添加粒子效果
        this.createParticles();
    }
    
    createPillars() {
        const pillarGeometry = new THREE.CylinderGeometry(0.5, 0.6, 5, 8);
        const pillarMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x334155,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const positions = [
            [10, 2.5, 10],
            [-10, 2.5, 10],
            [10, 2.5, -10],
            [-10, 2.5, -10],
            [15, 2.5, 0],
            [-15, 2.5, 0],
            [0, 2.5, 15],
            [0, 2.5, -15]
        ];
        
        positions.forEach(pos => {
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(...pos);
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            this.scene.add(pillar);
            
            // 柱顶装饰
            const capGeometry = new THREE.CylinderGeometry(0.7, 0.5, 0.3, 8);
            const capMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x38BDF8,
                emissive: 0x38BDF8,
                emissiveIntensity: 0.3
            });
            const cap = new THREE.Mesh(capGeometry, capMaterial);
            cap.position.set(pos[0], pos[1] + 2.65, pos[2]);
            this.scene.add(cap);
        });
    }
    
    createParticles() {
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
            color: 0x38BDF8,
            size: 0.1,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        
        // 粒子动画
        this.animateParticles = () => {
            const positions = particles.geometry.attributes.position.array;
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] -= 0.02;
                if (positions[i] < 0) {
                    positions[i] = 20;
                }
            }
            particles.geometry.attributes.position.needsUpdate = true;
        };
    }
    
    spawnEnemies() {
        const enemyPositions = [
            new THREE.Vector3(8, 0, 8),
            new THREE.Vector3(-8, 0, 8),
            new THREE.Vector3(8, 0, -8),
            new THREE.Vector3(-8, 0, -8)
        ];
        
        const enemyNames = ['小妖', '山贼', '野兽', '鬼怪'];
        
        enemyPositions.forEach((pos, index) => {
            const enemy = new Enemy(this.scene, pos, enemyNames[index]);
            this.gameState.enemies.push(enemy);
        });
    }
    
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
            
            // 闪避 Space
            if (e.key === ' ') {
                e.preventDefault();
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
        
        // 检测攻击命中
        const attackRange = 3;
        const damage = 15;
        this.checkAttackHit(attackRange, damage);
        
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
        
        // 检测攻击命中 - 更大范围和伤害
        const attackRange = 4;
        const damage = 35;
        this.checkAttackHit(attackRange, damage);
        
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
        
        // 执行闪避动画
        this.player.performDodge();
        
        setTimeout(() => {
            this.gameState.player.isDodging = false;
        }, 400);
    }
    
    performSkill() {
        const stamina = this.gameState.player.stamina;
        const staminaCost = 40;
        
        if (stamina < staminaCost) return;
        
        this.gameState.updateStamina(stamina - staminaCost);
        
        // 法术技能 - 范围攻击
        this.createSkillEffect();
        
        const attackRange = 8;
        const damage = 50;
        this.checkAttackHit(attackRange, damage);
    }
    
    createSkillEffect() {
        // 创建技能特效 - 冲击波
        const geometry = new THREE.RingGeometry(0.5, 1, 32);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x38BDF8,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(geometry, material);
        ring.position.copy(this.player.mesh.position);
        ring.position.y = 0.1;
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);
        
        // 添加第二层外圈
        const ring2 = ring.clone();
        ring2.material = material.clone();
        ring2.material.color.setHex(0xF59E0B);
        this.scene.add(ring2);
        
        // 添加向上的光柱
        const cylinderGeometry = new THREE.CylinderGeometry(0.5, 2, 5, 32, 1, true);
        const cylinderMaterial = new THREE.MeshBasicMaterial({
            color: 0x38BDF8,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
        cylinder.position.copy(this.player.mesh.position);
        cylinder.position.y = 2.5;
        this.scene.add(cylinder);
        
        // 扩散动画
        let scale = 1;
        const animate = () => {
            scale += 0.3;
            ring.scale.set(scale, scale, scale);
            ring2.scale.set(scale * 1.2, scale * 1.2, scale * 1.2);
            ring.material.opacity = Math.max(0, 0.8 - scale * 0.1);
            ring2.material.opacity = Math.max(0, 0.6 - scale * 0.08);
            
            cylinder.scale.set(1, Math.min(2, scale * 0.5), 1);
            cylinder.material.opacity = Math.max(0, 0.4 - scale * 0.05);
            
            if (scale < 10) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(ring);
                this.scene.remove(ring2);
                this.scene.remove(cylinder);
            }
        };
        animate();
    }
    
    checkAttackHit(range, damage) {
        const playerPos = this.gameState.player.position;
        
        this.gameState.enemies.forEach(enemy => {
            if (!enemy.mesh || enemy.health <= 0) return;
            
            const distance = playerPos.distanceTo(enemy.position);
            if (distance < range) {
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
            }
        });
    }
    
    createHitEffect(position) {
        // 击中时的火花特效
        const particleCount = 20;
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
                particles.forEach(p => this.scene.remove(p));
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
        
        // 相机跟随玩家
        const targetPos = this.player.mesh.position;
        const cameraOffset = new THREE.Vector3(0, 8, 12);
        
        // 根据玩家朝向旋转相机偏移
        const rotatedOffset = cameraOffset.clone();
        rotatedOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.mesh.rotation.y);
        
        const targetCameraPos = targetPos.clone().add(rotatedOffset);
        
        // 平滑相机移动
        this.camera.position.lerp(targetCameraPos, 0.1);
        this.camera.lookAt(targetPos);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (!this.gameState.gameStarted) return;
        
        const delta = this.clock.getDelta();
        
        // 更新玩家
        if (this.player) {
            this.player.update(delta, this.gameState);
        }
        
        // 更新敌人
        this.gameState.enemies.forEach(enemy => {
            enemy.update(delta, this.gameState.player.position);
            
            // 检测敌人攻击玩家
            if (!this.gameState.player.isDodging) {
                const distance = this.gameState.player.position.distanceTo(enemy.position);
                if (distance < enemy.attackRange && Date.now() - enemy.lastAttackTime < 100) {
                    this.gameState.updateHealth(this.gameState.player.health - 10);
                }
            }
        });
        
        // 清理死亡敌人
        this.gameState.enemies = this.gameState.enemies.filter(e => e.health > 0 && e.mesh);
        
        // 检查是否需要生成新敌人
        if (this.gameState.enemies.length === 0) {
            setTimeout(() => this.spawnEnemies(), 3000);
        }
        
        // 更新粒子
        if (this.animateParticles) {
            this.animateParticles();
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