# Desktop App 빌드 가이드

이 문서는 Nova HR Desktop Agent 설치 파일을 오류 없이 생성하기 위한 가이드입니다.

## 주요 해결된 문제들

### 1. bcryptjs 의존성 문제
- **문제**: 네이티브 모듈 bcryptjs가 Windows에서 컴파일 오류 발생
- **해결**: Node.js 내장 crypto 모듈로 대체
- **위치**: `src/main/services/SecureCredentialService.ts`
- **변경사항**: 
  ```typescript
  // 기존: bcrypt.hash() 
  // 변경: crypto.createHash('sha256').update(password + salt).digest('hex')
  ```

### 2. preload 스크립트 경로 문제
- **문제**: preload 스크립트가 로드되지 않아 electronAPI undefined 오류
- **해결**: vite 빌드 구조와 main process 경로 동기화

#### vite.config.ts 설정
```typescript
electron([
  {
    // Main Process
    entry: 'src/main/index.ts',
    vite: {
      build: {
        rollupOptions: {
          external: ['bcryptjs'] // 제거된 의존성
        }
      }
    }
  },
  {
    // Preload Process
    entry: 'src/preload/index.ts',
    vite: {
      build: {
        outDir: 'dist-electron/preload' // 중요: 별도 디렉토리
      }
    }
  }
])
```

#### main/index.ts 경로 설정
```typescript
webPreferences: {
  preload: join(__dirname, 'preload/index.js'), // 올바른 상대 경로
  sandbox: false,
  contextIsolation: true,
  nodeIntegration: false
}
```

### 3. API 노출 문제
- **문제**: HTML 인라인 스크립트에서 Logger undefined
- **해결**: contextBridge로 Logger 전역 노출

#### preload/index.ts 설정
```typescript
// Logger를 전역으로 노출
contextBridge.exposeInMainWorld('Logger', {
  error: (message: string, data?: any) => ipcRenderer.invoke('logger:error', message, data),
  warn: (message: string, data?: any) => ipcRenderer.invoke('logger:warn', message, data),
  info: (message: string, data?: any) => ipcRenderer.invoke('logger:info', message, data),
  log: (message: string, data?: any) => ipcRenderer.invoke('logger:info', message, data)
})

// Fallback 메커니즘도 동일하게 적용
```

## 빌드 프로세스

### 1. 사전 확인사항
```bash
# 1. API 서버가 실행 중인지 확인
cd apps/api && npm run dev

# 2. 의존성 설치 상태 확인
cd apps/desktop-agent && npm install
```

### 2. 빌드 명령어
```bash
cd apps/desktop-agent
npm run build
```

### 3. 빌드 결과 확인
```bash
# 빌드된 파일 구조 확인
ls -la dist-electron/
# 출력 예시:
# index.js (666KB) - Main process
# preload/index.js (6KB) - Preload script

# 설치 파일 생성 확인
ls -la release/
# 출력: Reko HR Desktop Agent-1.0.0-win-x64.exe
```

## 트러블슈팅

### 자주 발생하는 오류들

#### 1. "Unable to load preload script"
- **원인**: preload 경로 설정 오류
- **확인**: main/index.ts의 webPreferences.preload 경로
- **해결**: `join(__dirname, 'preload/index.js')` 사용

#### 2. "electronAPI is not defined"
- **원인**: preload 스크립트 로드 실패
- **확인**: preload 파일이 올바른 위치에 빌드되었는지
- **해결**: vite.config.ts의 outDir 설정 확인

#### 3. "Logger is not defined"
- **원인**: HTML 스크립트에서 Logger 접근 불가
- **확인**: preload에서 Logger 전역 노출 여부
- **해결**: contextBridge.exposeInMainWorld 추가

#### 4. Native module 컴파일 오류
- **원인**: bcryptjs 같은 네이티브 의존성
- **해결**: package.json에서 제거하고 Node.js 내장 모듈 사용
- **설정**: electron-builder에서 `npmRebuild: false`

## 중요한 파일들

### package.json 빌드 설정
```json
{
  "build": {
    "appId": "com.rekohr.desktop-agent",
    "productName": "Reko HR Desktop Agent",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "dist-electron/**/*",
      "package.json"
    ],
    "win": {
      "target": "nsis",
      "icon": "public/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    },
    "npmRebuild": false
  }
}
```

### TypeScript 컴파일 건너뛰기
```json
{
  "scripts": {
    "prebuild": "echo \"Skipping typecheck for build\"",
    "build": "vite build && electron-builder"
  }
}
```

## 마지막 체크리스트

빌드 전 반드시 확인:
- [ ] API 서버 실행 중 (포트 3000)
- [ ] bcryptjs 의존성 제거됨
- [ ] preload 경로 설정 올바름
- [ ] Logger 전역 노출 설정됨
- [ ] npm install 완료

빌드 후 확인:
- [ ] dist-electron/index.js 존재 (큰 파일)
- [ ] dist-electron/preload/index.js 존재 (작은 파일)
- [ ] release/*.exe 파일 생성됨
- [ ] 설치 및 실행 테스트 완료

## 참고 사항

- **개발 모드**: `npm run dev`로 먼저 테스트
- **로그 확인**: 앱 실행 후 콘솔에서 오류 메시지 확인
- **포트 설정**: API 서버는 반드시 3000번 포트에서 실행
- **캐시 문제**: 문제 발생 시 `dist-electron` 폴더 삭제 후 재빌드

---
*최종 업데이트: 2024-09-10*
*문제 발생 시 이 가이드를 참조하여 단계별로 확인*