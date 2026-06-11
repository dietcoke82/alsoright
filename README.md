# Alsoright (니맞내맞)

역할 기반 실시간 토론 게임 플랫폼

주제가 주어지면 찬성/반대 역할이 무작위 배정되고, 토론 후 참가자들이 투표로 승자를 결정합니다.

## 스택

- **Backend**: ASP.NET Core 9, Entity Framework Core, SignalR
- **Frontend**: React 19, TanStack Router, TypeScript, Vite, Tailwind CSS
- **Database**: PostgreSQL
- **Infrastructure**: Docker / Kubernetes 배포 준비

## 개발 환경 설정

1. .NET 9 SDK 설치
2. Node.js 설치
3. PostgreSQL 실행 중이어야 합니다

## 백엔드 실행

```bash
cd server
dotnet restore
dotnet run
```

`http://localhost:5185`에서 API가 실행됩니다.

## 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

`http://localhost:5173`에서 앱을 확인할 수 있습니다.

## 환경 변수

`frontend/.env` 파일에 백엔드 주소를 설정합니다.

```
VITE_API_URL=http://localhost:5185
```

## 데이터베이스

`server/appsettings.Development.json`에서 PostgreSQL 연결 정보를 설정합니다.

```json
{
  "DatabaseProvider": "PostgreSQL",
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=alsoright;Username=yourname"
  }
}
```

테이블은 서버 최초 실행 시 자동 생성됩니다 (`EnsureCreated`).

## Kubernetes / Cloud 배포

`k8s/` 디렉토리에 배포 예시 파일이 있습니다.
