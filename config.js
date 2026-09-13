// 游戏配置文件
const GameConfig = {
    // 玩家配置
    player: {
        maxHealth: 100,
        maxStamina: 100,
        staminaRegenRate: 15, // 每秒恢复
        moveSpeed: 5,
        rotationSpeed: 0.1,
        
        // 攻击配置
        lightAttack: {
            damage: 15,
            staminaCost: 10,
            cooldown: 300,
            range: 3
        },
        heavyAttack: {
            damage: 35,
            staminaCost: 25,
            cooldown: 600,
            range: 4
        },
        dodge: {
            staminaCost: 20,
            duration: 400,
            invincibilityDuration: 300
        },
        skill: {
            damage: 50,
            staminaCost: 40,
            cooldown: 3000,
            range: 8
        }
    },
    
    // 敌人配置
    enemy: {
        health: 100,
        damage: 10,
        moveSpeed: 2,
        attackRange: 2,
        attackCooldown: 2000,
        detectionRange: 10
    },
    
    // 视觉效果配置
    visual: {
        particleCount: 500,
        shadowMapSize: 2048,
        cameraDistance: 12,
        cameraHeight: 8,
        fogNear: 10,
        fogFar: 50
    },
    
    // 场景配置
    scene: {
        groundSize: 50,
        pillarCount: 8,
        pillarHeight: 5,
        backgroundColor: 0x0B0E14,
        primaryColor: 0x38BDF8, // 青色
        secondaryColor: 0xF59E0B, // 金色
        groundColor: 0x1E293B
    },
    
    // UI配置
    ui: {
        healthBarColor: '#22C55E',
        staminaBarColor: '#38BDF8',
        enemyHealthColor: '#EF4444',
        comboColor: '#F59E0B',
        damageNumberColor: '#F59E0B',
        criticalDamageColor: '#DC2626'
    },
    
    // 游戏玩法配置
    gameplay: {
        comboWindow: 1000, // 连击窗口时间（毫秒）
        comboMultiplier: 0.1, // 每次连击增加10%伤害
        maxCombo: 10,
        enemyRespawnDelay: 3000,
        initialEnemyCount: 4
    },
    
    // 调试模式
    debug: {
        enabled: false,
        showStats: false,
        showBoundingBoxes: false,
        godMode: false
    }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameConfig;
}
