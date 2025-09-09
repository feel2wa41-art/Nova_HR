#!/bin/bash

echo "🚀 Starting Nova HR Local Development Environment..."

# 환경변수 설정
export NODE_ENV=development

# Docker 서비스 시작
echo "📦 Starting Docker services..."
docker compose -f infra/docker/docker-compose.yml up -d

# Docker 서비스가 준비될 때까지 대기
echo "⏳ Waiting for services to be ready..."
sleep 10

# 데이터베이스 마이그레이션
echo "🔄 Running database migrations..."
pnpm --filter api prisma migrate dev

# 시드 데이터 생성 (선택사항)
read -p "Do you want to seed the database? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "🌱 Seeding database..."
    pnpm db:seed
fi

# 모든 앱 동시 실행
echo "🎯 Starting all applications..."
echo ""
echo "📍 Applications will be available at:"
echo "   API Server:        http://localhost:3000"
echo "   Customer Portal:   http://localhost:3001"
echo "   Homepage:          http://localhost:3004"
echo "   Provider Admin:    http://localhost:3003"
echo ""
echo "📍 Development tools:"
echo "   pgAdmin:          http://localhost:5050"
echo "   MinIO Console:    http://localhost:9001"
echo "   MailHog:          http://localhost:8025"
echo ""

# 앱 시작
pnpm dev