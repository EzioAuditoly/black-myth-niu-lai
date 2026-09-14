#!/bin/bash

# 黑神话 - 牛来 游戏启动脚本
# Black Myth: Niu Lai - Quick Start Script

echo "🎮 黑神话 - 牛来 | Black Myth: Niu Lai"
echo "======================================"
echo ""

# 检查是否在正确的目录
if [ ! -f "game.js" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    echo "   Error: Please run this script from the project root directory"
    exit 1
fi

echo "✅ 项目文件检查完成"
echo ""

# 检查端口8124是否被占用
if lsof -Pi :8124 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  端口 8124 已被占用"
    echo "   游戏可能已经在运行"
    echo ""
    echo "🌐 访问游戏:"
    echo "   主游戏: http://localhost:8124"
    echo "   演示页: http://localhost:8124/demo.html"
    echo "   清单页: http://localhost:8124/checklist.html"
    echo ""
else
    echo "🚀 启动本地服务器..."
    echo ""
    echo "服务器将在端口 8124 运行"
    echo "按 Ctrl+C 停止服务器"
    echo ""
    echo "======================================"
    echo "🌐 游戏访问地址:"
    echo "======================================"
    echo "主游戏页面: http://localhost:8124"
    echo "演示介绍页: http://localhost:8124/demo.html"
    echo "功能清单页: http://localhost:8124/checklist.html"
    echo "测试页面:   http://localhost:8124/test.html"
    echo ""
    echo "======================================"
    echo "🎮 游戏操作 (按键说明):"
    echo "======================================"
    echo "  W / S    - 前进 / 后退"
    echo "  A / D    - 左转 / 右转"
    echo "  Space    - 跳跃"
    echo "  Shift    - 闪避翻滚（慢动作 + 长无敌帧）"
    echo "  J        - 轻攻击 (15伤害, 10体力)"
    echo "  K        - 重攻击 (35伤害, 25体力)"
    echo "  L        - 法术技能 (范围伤害, 30体力)"
    echo ""
    echo "🗺️  青山绿水武侠风地图：竹林 / 凉亭 / 溪流 / 远山"
    echo "======================================"
    echo ""
    
    # 启动服务器
    python3 -m http.server 8124
fi
