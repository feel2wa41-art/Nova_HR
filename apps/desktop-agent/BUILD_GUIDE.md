# 🚀 Reko HR Desktop Agent - Build Guide

데스크톱 에이전트를 빌드하고 설치 파일을 생성하는 방법을 설명합니다.

## 📋 사전 요구사항

### 필수 소프트웨어
- **Node.js** 18.x 이상 ([다운로드](https://nodejs.org/))
- **Python** 3.8 이상 (네이티브 모듈 컴파일용)
- **Visual Studio Build Tools** 또는 **Visual Studio 2019/2022** (Windows)

### 자동 설치 (권장)
```bash
# Windows Build Tools 자동 설치 (관리자 권한 필요)
npm install --global --production windows-build-tools
```

## 🛠️ 빌드 방법

### 방법 1: 배치 스크립트 사용 (Windows)
```bash
# Windows에서 간편 빌드
.\build.bat
```

### 방법 2: npm 스크립트 사용
```bash
# 의존성 설치
npm install

# 로컬 API용 빌드
npm run build:win:local

# 프로덕션 API용 빌드  
npm run build:win:server

# 커스텀 빌드
cross-env NODE_ENV=production API_URL=https://your-api.com vite build && electron-builder --win --x64
```

### 방법 3: 단계별 수동 빌드
```bash
# 1. 의존성 설치 및 재빌드
npm install
npm run postinstall

# 2. TypeScript 체크
npm run typecheck

# 3. Vite 빌드
npm run build:dev

# 4. Electron 앱 패키징
npm run build:electron
```

## 📁 빌드 구조

```
apps/desktop-agent/
├── dist/                 # Vite 빌드 결과 (renderer)
├── dist-electron/        # Electron main process 빌드
├── release/              # 최종 설치 파일들
│   ├── *.exe            # Windows 설치 파일
│   ├── *.dmg            # macOS 설치 파일
│   └── *.AppImage       # Linux 설치 파일
├── scripts/
│   └── build.js         # 빌드 자동화 스크립트
├── build.bat           # Windows 빌드 스크립트
└── installer.nsh       # NSIS 설치 설정
```

## 🔧 빌드 설정

### API 서버 설정
빌드 시 API 서버 URL을 지정할 수 있습니다:

```bash
# 로컬 개발 서버
API_URL=http://localhost:3000

# 프로덕션 서버  
API_URL=https://api.reko-hr.com

# 커스텀 서버
API_URL=https://your-custom-api.com
```

### 빌드 옵션
- `--win`: Windows 설치 파일 생성
- `--mac`: macOS 설치 파일 생성  
- `--linux`: Linux 설치 파일 생성

## 🐛 문제 해결

### 네이티브 모듈 빌드 오류
```bash
# 네이티브 모듈 강제 재빌드
npm run postinstall

# 또는
npx electron-rebuild --parallel --types=prod,dev,optional --module-dir .
```

### Python/Visual Studio 오류
1. **Python 설치**: https://python.org에서 Python 3.8+ 설치
2. **Build Tools 설치**:
   ```bash
   npm install --global --production windows-build-tools
   ```
3. **Visual Studio Community 설치** (대안):
   - C++ build tools 워크로드 포함

### 메모리 부족 오류
```bash
# Node.js 메모리 제한 증가
set NODE_OPTIONS=--max-old-space-size=8192
npm run build
```

### 빌드 캐시 초기화
```bash
# 캐시 및 임시 파일 정리
npm cache clean --force
rm -rf node_modules dist dist-electron release
npm install
```

## 📦 배포용 파일

### Windows 설치 파일 (.exe)
- **위치**: `release/Reko HR Desktop Agent-1.0.0-win-x64.exe`
- **크기**: 약 150-200MB
- **설치 방식**: NSIS 인스토ller
- **요구사항**: Windows 10 이상

### 설치 파일 특징
- ✅ 관리자 권한 없이 설치 가능
- ✅ 바탕화면 및 시작 메뉴 바로가기 생성
- ✅ 자동 업데이트 지원
- ✅ 제거 시 설정 파일 선택적 삭제
- ✅ Windows 시작 시 자동 실행 등록

## 🔄 자동 업데이트

앱에 자동 업데이트 기능이 포함되어 있습니다:

```javascript
// electron-updater를 통한 자동 업데이트
autoUpdater.checkForUpdatesAndNotify();
```

## 📝 빌드 로그

빌드 과정은 다음과 같은 단계로 진행됩니다:

1. **🧹 정리**: 이전 빌드 파일 삭제
2. **📦 의존성**: npm 패키지 설치 확인
3. **🔍 타입 체크**: TypeScript 컴파일 확인
4. **⚡ Vite 빌드**: Renderer 프로세스 빌드
5. **🔧 네이티브 모듈**: 네이티브 모듈 재빌드
6. **📱 Electron 패키징**: 최종 설치 파일 생성

## 🆘 지원

빌드 문제가 발생하면:
1. 이 가이드의 문제 해결 섹션 확인
2. GitHub Issues에 빌드 로그와 함께 문제 보고
3. 개발팀에 직접 문의

---

💡 **팁**: 빌드 시간을 단축하려면 SSD를 사용하고 바이러스 백신 소프트웨어의 실시간 검사에서 프로젝트 폴더를 제외하세요.