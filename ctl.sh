#!/bin/bash
# 游戏控制脚本 - start | stop | restart | status | open

PORT=8124
PROJECT_DIR="/Users/ezioauditoly/code/model_test"

case "$1" in
    start)
        # 如果已在运行则提示
        if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "⚠️  游戏已在运行 (端口 $PORT)"
            lsof -Pi :$PORT -sTCP:LISTEN
            exit 1
        fi

        cd "$PROJECT_DIR" || exit 1
        echo "🚀 启动游戏服务器..."
        python3 -m http.server $PORT > server.log 2>&1 &
        echo $! > .server.pid
        sleep 1

        if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "✅ 启动成功！"
            echo "🌐 浏览器访问: http://localhost:$PORT"
        else
            echo "❌ 启动失败，查看 server.log"
            cat server.log
        fi
        ;;

    stop)
        # 杀掉所有占用端口的进程（Python http.server 经常fork子进程）
        PIDS=$(lsof -ti:$PORT 2>/dev/null)
        if [ -z "$PIDS" ]; then
            echo "⚠️  端口 $PORT 未占用，无需停止"
        else
            echo "$PIDS" | xargs kill -9 2>/dev/null
            rm -f .server.pid
            sleep 1
            # 确认真的停了
            REMAINING=$(lsof -ti:$PORT 2>/dev/null)
            if [ -z "$REMAINING" ]; then
                echo "✅ 已停止游戏进程 (PID: $(echo $PIDS | tr '\n' ' '))"
            else
                echo "⚠️  还有进程残留: $REMAINING，再次清理..."
                echo "$REMAINING" | xargs kill -9 2>/dev/null
                sleep 1
            fi
        fi
        ;;

    restart)
        $0 stop
        sleep 1
        $0 start
        ;;

    status)
        PID=$(lsof -ti:$PORT 2>/dev/null)
        if [ -n "$PID" ]; then
            echo "✅ 游戏运行中"
            echo "   PID: $PID"
            echo "   URL: http://localhost:$PORT"
            ps -p $PID -o pid,command | tail -n +1
        else
            echo "❌ 游戏未运行"
        fi
        ;;

    open)
        open http://localhost:$PORT
        ;;

    *)
        echo "🎮 游戏控制脚本"
        echo ""
        echo "用法: ./ctl.sh {start|stop|restart|status|open}"
        echo ""
        echo "  start   - 启动游戏服务器"
        echo "  stop    - 停止游戏服务器"
        echo "  restart - 重启游戏服务器"
        echo "  status  - 查看运行状态"
        echo "  open    - 浏览器打开游戏"
        ;;
esac
