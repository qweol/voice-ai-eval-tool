#!/bin/bash

# 服务器环境检查脚本
# 在部署前运行此脚本，将输出结果发给后端人员确认

echo "=========================================="
echo "服务器环境检查报告"
echo "=========================================="
echo ""
echo "生成时间: $(date)"
echo "主机名: $(hostname)"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. 检查端口占用
echo "=========================================="
echo "1. 端口占用检查"
echo "=========================================="
echo "检查端口 3000, 5432, 6379 是否被占用..."
echo ""

for port in 3000 5432 6379; do
    if sudo netstat -tlnp 2>/dev/null | grep -q ":$port "; then
        echo -e "${RED}✗ 端口 $port 已被占用:${NC}"
        sudo netstat -tlnp | grep ":$port "
    else
        echo -e "${GREEN}✓ 端口 $port 可用${NC}"
    fi
done
echo ""

# 2. 检查 Docker 环境
echo "=========================================="
echo "2. Docker 环境检查"
echo "=========================================="

if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker 已安装${NC}"
    docker --version
    echo ""

    # 检查 Docker 服务状态
    if sudo systemctl is-active --quiet docker; then
        echo -e "${GREEN}✓ Docker 服务运行中${NC}"
    else
        echo -e "${RED}✗ Docker 服务未运行${NC}"
    fi
    echo ""

    # 检查当前用户是否在 docker 组
    if groups $USER | grep -q docker; then
        echo -e "${GREEN}✓ 当前用户在 docker 组中${NC}"
    else
        echo -e "${YELLOW}⚠ 当前用户不在 docker 组中，需要使用 sudo${NC}"
    fi
else
    echo -e "${RED}✗ Docker 未安装${NC}"
fi
echo ""

if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓ Docker Compose 已安装${NC}"
    docker-compose --version
else
    echo -e "${RED}✗ Docker Compose 未安装${NC}"
fi
echo ""

# 3. 检查现有 Docker 资源
echo "=========================================="
echo "3. 现有 Docker 资源"
echo "=========================================="

echo "运行中的容器:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}" 2>/dev/null || echo "无法获取（可能需要 sudo 权限）"
echo ""

echo "Docker 网络:"
docker network ls 2>/dev/null || echo "无法获取（可能需要 sudo 权限）"
echo ""

echo "Docker 卷:"
docker volume ls 2>/dev/null || echo "无法获取（可能需要 sudo 权限）"
echo ""

# 4. 检查系统资源
echo "=========================================="
echo "4. 系统资源"
echo "=========================================="

echo "CPU 信息:"
echo "  核心数: $(nproc)"
echo "  负载: $(uptime | awk -F'load average:' '{print $2}')"
echo ""

echo "内存信息:"
free -h
echo ""

echo "磁盘空间:"
df -h | grep -E '^Filesystem|^/dev/'
echo ""

# 5. 检查网络配置
echo "=========================================="
echo "5. 网络配置"
echo "=========================================="

echo "IP 地址:"
ip addr show | grep -E 'inet ' | grep -v '127.0.0.1' || ifconfig | grep -E 'inet ' | grep -v '127.0.0.1'
echo ""

echo "防火墙状态:"
if command -v ufw &> /dev/null; then
    sudo ufw status 2>/dev/null || echo "无法获取 ufw 状态"
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --state 2>/dev/null || echo "无法获取 firewalld 状态"
else
    echo "未检测到常见防火墙工具"
fi
echo ""

# 6. 检查 PostgreSQL
echo "=========================================="
echo "6. PostgreSQL 检查"
echo "=========================================="

if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL 客户端已安装${NC}"
    psql --version
    echo ""

    # 检查 PostgreSQL 服务
    if sudo systemctl is-active --quiet postgresql 2>/dev/null; then
        echo -e "${GREEN}✓ PostgreSQL 服务运行中${NC}"
        echo "建议: 可以使用现有的 PostgreSQL 实例，节省资源"
    else
        echo "PostgreSQL 服务未运行或未安装"
        echo "建议: 使用 Docker 容器运行 PostgreSQL"
    fi
else
    echo "PostgreSQL 客户端未安装"
    echo "建议: 使用 Docker 容器运行 PostgreSQL"
fi
echo ""

# 7. 检查用户权限
echo "=========================================="
echo "7. 用户权限"
echo "=========================================="

echo "当前用户: $USER"
echo "用户 ID: $(id -u)"
echo "用户组: $(groups)"
echo ""

# 8. 检查可用端口建议
echo "=========================================="
echo "8. 可用端口建议"
echo "=========================================="

echo "如果默认端口被占用，建议使用以下端口:"
for port in 8080 8081 8082 8083 8084 8085; do
    if ! sudo netstat -tlnp 2>/dev/null | grep -q ":$port "; then
        echo -e "${GREEN}  - $port (可用)${NC}"
        break
    fi
done
echo ""

# 9. 生成建议
echo "=========================================="
echo "9. 部署建议"
echo "=========================================="

# 检查是否需要修改端口
NEED_PORT_CHANGE=false
for port in 3000 5432 6379; do
    if sudo netstat -tlnp 2>/dev/null | grep -q ":$port "; then
        NEED_PORT_CHANGE=true
        break
    fi
done

if [ "$NEED_PORT_CHANGE" = true ]; then
    echo -e "${YELLOW}⚠ 建议: 部分端口已被占用，需要修改 docker-compose.yml 中的端口配置${NC}"
else
    echo -e "${GREEN}✓ 所有默认端口可用，可以直接部署${NC}"
fi
echo ""

# 检查资源是否充足
TOTAL_MEM=$(free -g | awk '/^Mem:/{print $2}')
if [ "$TOTAL_MEM" -lt 4 ]; then
    echo -e "${YELLOW}⚠ 建议: 内存较少（${TOTAL_MEM}GB），建议降低 docker-compose.prod.yml 中的资源限制${NC}"
else
    echo -e "${GREEN}✓ 内存充足（${TOTAL_MEM}GB），可以使用默认资源配置${NC}"
fi
echo ""

# 检查磁盘空间
AVAILABLE_DISK=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$AVAILABLE_DISK" -lt 10 ]; then
    echo -e "${RED}✗ 警告: 磁盘空间不足（${AVAILABLE_DISK}GB），建议至少 10GB${NC}"
else
    echo -e "${GREEN}✓ 磁盘空间充足（${AVAILABLE_DISK}GB）${NC}"
fi
echo ""

# 10. 总结
echo "=========================================="
echo "10. 检查总结"
echo "=========================================="
echo ""
echo "请将此报告发送给后端人员，确认以下事项:"
echo ""
echo "□ 端口分配是否合适？是否需要修改？"
echo "□ 是否可以使用 Docker 部署？"
echo "□ 是否使用独立的 PostgreSQL 容器，还是使用现有实例？"
echo "□ 资源限制是否合理？"
echo "□ 项目应该部署在哪个目录？"
echo "□ 是否需要配置防火墙规则？"
echo "□ 是否需要配置反向代理？"
echo "□ 日志和备份策略是什么？"
echo ""
echo "=========================================="
echo "检查完成"
echo "=========================================="
