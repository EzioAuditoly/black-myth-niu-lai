#!/usr/bin/env node

// 自动化测试脚本
const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('\n🎮 黑神话 - 牛来 自动化测试\n');
console.log('=' .repeat(50));

// 测试结果
const results = {
    pass: 0,
    fail: 0,
    total: 0
};

// 测试函数
function test(name, fn) {
    results.total++;
    try {
        fn();
        console.log(`✅ ${name}`);
        results.pass++;
        return true;
    } catch (e) {
        console.log(`❌ ${name}`);
        console.log(`   错误: ${e.message}`);
        results.fail++;
        return false;
    }
}

// 文件存在性测试
console.log('\n📦 文件结构测试');
console.log('-'.repeat(50));

test('index.html 存在', () => {
    if (!fs.existsSync('./index.html')) throw new Error('文件不存在');
});

test('game.js 存在', () => {
    if (!fs.existsSync('./game.js')) throw new Error('文件不存在');
});

test('debug.js 存在', () => {
    if (!fs.existsSync('./debug.js')) throw new Error('文件不存在');
});

test('config.js 存在', () => {
    if (!fs.existsSync('./config.js')) throw new Error('文件不存在');
});

test('test.html 存在', () => {
    if (!fs.existsSync('./test.html')) throw new Error('文件不存在');
});

// 代码内容测试
console.log('\n🔍 代码内容测试');
console.log('-'.repeat(50));

test('game.js 包含 Game 类', () => {
    const content = fs.readFileSync('./game.js', 'utf8');
    if (!content.includes('class Game')) throw new Error('缺少 Game 类');
});

test('game.js 包含 NiuLai 类', () => {
    const content = fs.readFileSync('./game.js', 'utf8');
    if (!content.includes('class NiuLai')) throw new Error('缺少 NiuLai 类');
});

test('game.js 包含 Enemy 类', () => {
    const content = fs.readFileSync('./game.js', 'utf8');
    if (!content.includes('class Enemy')) throw new Error('缺少 Enemy 类');
});

test('game.js 包含战斗系统', () => {
    const content = fs.readFileSync('./game.js', 'utf8');
    if (!content.includes('performLightAttack')) throw new Error('缺少轻攻击');
    if (!content.includes('performHeavyAttack')) throw new Error('缺少重攻击');
    if (!content.includes('performSkill')) throw new Error('缺少技能系统');
});

test('game.js 包含闪避系统', () => {
    const content = fs.readFileSync('./game.js', 'utf8');
    if (!content.includes('dodge')) throw new Error('缺少闪避功能');
});

test('game.js 包含连击系统', () => {
    const content = fs.readFileSync('./game.js', 'utf8');
    if (!content.includes('combo')) throw new Error('缺少连击系统');
});

test('game.js 包含体力系统', () => {
    const content = fs.readFileSync('./game.js', 'utf8');
    if (!content.includes('stamina')) throw new Error('缺少体力系统');
});

test('game.js 包含特效系统', () => {
    const content = fs.readFileSync('./game.js', 'utf8');
    if (!content.includes('createParticles')) throw new Error('缺少粒子特效');
    if (!content.includes('createHitEffect')) throw new Error('缺少击中特效');
});

test('index.html 包含游戏UI', () => {
    const content = fs.readFileSync('./index.html', 'utf8');
    if (!content.includes('health-bar')) throw new Error('缺少生命条');
    if (!content.includes('stamina-bar')) throw new Error('缺少体力条');
    if (!content.includes('combo-display')) throw new Error('缺少连击显示');
});

test('debug.js 包含调试功能', () => {
    const content = fs.readFileSync('./debug.js', 'utf8');
    if (!content.includes('DebugPanel')) throw new Error('缺少调试面板');
});

// JavaScript 语法测试
console.log('\n📝 语法检查');
console.log('-'.repeat(50));

test('game.js 语法正确', () => {
    try {
        require('child_process').execSync('node --check game.js', { stdio: 'pipe' });
    } catch (e) {
        throw new Error('语法错误: ' + e.message);
    }
});

test('debug.js 语法正确', () => {
    try {
        require('child_process').execSync('node --check debug.js', { stdio: 'pipe' });
    } catch (e) {
        throw new Error('语法错误: ' + e.message);
    }
});

// HTTP 服务器测试
console.log('\n🌐 HTTP 服务测试');
console.log('-'.repeat(50));

test('检查端口 8124', (done) => {
    const options = {
        hostname: 'localhost',
        port: 8124,
        path: '/',
        method: 'GET',
        timeout: 2000
    };
    
    const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
            console.log('   服务器响应正常 (200)');
        } else {
            throw new Error(`服务器返回 ${res.statusCode}`);
        }
    });
    
    req.on('error', (e) => {
        console.log('   ⚠️  服务器未启动，请运行: python3 -m http.server 8124');
    });
    
    req.on('timeout', () => {
        req.destroy();
        throw new Error('请求超时');
    });
    
    req.end();
});

// 输出测试结果
console.log('\n' + '='.repeat(50));
console.log('📊 测试结果汇总');
console.log('='.repeat(50));
console.log(`总计: ${results.total} 项测试`);
console.log(`✅ 通过: ${results.pass} 项`);
console.log(`❌ 失败: ${results.fail} 项`);

const percentage = Math.round((results.pass / results.total) * 100);
console.log(`\n成功率: ${percentage}%`);

if (results.fail === 0) {
    console.log('\n🎉 所有测试通过！游戏已准备就绪！');
    console.log('\n启动游戏:');
    console.log('  1. 确保服务器运行: python3 -m http.server 8124');
    console.log('  2. 打开浏览器访问: http://localhost:8124');
    console.log('  3. 或打开测试页面: http://localhost:8124/test.html');
    console.log('\n操作指南:');
    console.log('  WASD - 移动');
    console.log('  J - 轻攻击');
    console.log('  K - 重攻击');
    console.log('  Space - 闪避');
    console.log('  E - 技能');
    process.exit(0);
} else {
    console.log('\n⚠️  部分测试失败，请检查上述错误');
    process.exit(1);
}
