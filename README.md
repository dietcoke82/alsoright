# Alsoright

역할 기반 실시간 토론 게임 플랫폼 프로토타입

## 스택

- Backend: ASP.NET Core 9, Entity Framework Core, SignalR, Kafka
- Frontend: Vue 3, Vite, TypeScript, Pinia, Vue Router
- Database: MSSQL 또는 MySQL 지원
- Infrastructure: Docker / Kubernetes 배포 준비

## 개발 환경 설정

1. .NET 9 SDK 설치
2. Node.js 설치 (Vue 프론트엔드 빌드를 위해 필요)

## 백엔드 실행

```bash
cd server
dotnet restore
dotnet run
```

기본적으로 `http://localhost:5000`에서 API가 실행됩니다.

## 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

`http://localhost:5173`에서 앱을 확인할 수 있습니다.

## 데이터베이스

`server/appsettings.json`에서 `DatabaseProvider`를 `SqlServer` 또는 `MySql`로 변경하고 `ConnectionStrings.DefaultConnection`을 업데이트하세요.

## Kubernetes / Cloud 배포

`k8s/deployment.yaml`와 `k8s/service.yaml`는 컨테이너 기반 배포를 위한 기본 예시입니다.
