#!/bin/bash

# 语音服务对比工具 - 部署脚本
# 用于在香港测试服上部署应用

set -e

echo "=========================================="
echo "语音服务对比工具 - 部署脚本"
echo "=========================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查是否在服务器上
if [ ! -f ".env.production" ]; then
    echo -e "${RED}错误: 未找到 .env.production 文件${NC}"
    echo "请先配置 .env.production 文件"
    exit 1
fi

# 停止现有容器
echo -e "${YELLOW}停止现有容器...${NC}"
docker-compose down || true

# 清理旧的镜像（可选）
read -p "是否清理旧的 Docker 镜像? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}清理旧镜像...${NC}"
    docker system prune -f
fi

# 构建新镜像
echo -e "${YELLOW}构建 Docker 镜像...${NC}"
docker-compose build --no-cache

# 启动服务
echo -e "${YELLOW}启动服务...${NC}"
docker-compose up -d

# 等待服务启动
echo -e "${YELLOW}等待服务启动...${NC}"
sleep 10

# 检查服务状态
echo -e "${YELLOW}检查服务状态...${NC}"
docker-compose ps

# 检查应用健康状态
echo -e "${YELLOW}检查应用健康状态...${NC}"
for i in {1..30}; do
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 应用启动成功！${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ 应用启动超时${NC}"
        echo "查看日志:"
        docker-compose logs app
        exit 1
    fi
    echo "等待应用启动... ($i/30)"
    sleep 2
done

echo ""
echo -e "${GREEN}=========================================="
echo "部署完成！"
echo "==========================================${NC}"
echo ""
echo "访问地址: http://localhost:3000"
echo ""
echo "常用命令:"
echo "  查看日志: docker-compose logs -f app"
echo "  重启服务: docker-compose restart app"
echo "  停止服务: docker-compose down"
echo "  查看状态: docker-compose ps"
echo ""
