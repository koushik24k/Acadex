# Acadex Setup Guide

## ✅ Completed

1. **GitHub Repository:** Pushed to https://github.com/koushik24k/Acadex
2. **Frontend Server:** Running on `http://localhost:3001`
3. **docker-compose.yml:** Created (MySQL setup ready)
4. **README.md:** Comprehensive documentation updated

## 🔧 Next Steps

### Install Maven (for Backend Build)

**Option 1: Windows Package Manager (Recommended)**
```powershell
winget install Maven.Maven
# Restart PowerShell/Terminal after installation
```

**Option 2: Manual Download**
1. Go to https://maven.apache.org/download.cgi
2. Download `apache-maven-3.9.x-bin.zip`
3. Extract to `C:\Program Files\`
4. Add to PATH: `C:\Program Files\apache-maven-3.9.x\bin`
5. Restart Terminal

### Start MySQL Database

**Option 1: Docker (if installed)**
```bash
docker-compose up -d
```

**Option 2: Windows Service**
```bash
# Using mysql command line
mysql -u root -p
# Password: D@rk_life24K

CREATE DATABASE acadex;
```

### Build & Run Backend

```bash
cd acadex-backend

# Build
mvn clean package

# Run
mvn spring-boot:run
# or
java -jar target/acadex-0.0.1-SNAPSHOT.jar
```

Backend will start on `http://localhost:8081`

## 📱 Access Application

Once all services are running:

- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:8081
- **Database:** localhost:3306

Default Credentials (update in DataInitializer.java):
- Admin: admin / password
- Faculty: faculty1 / password  
- Student: student1 / password

## 📁 Directory Structure

```
D:\acadex\
├── acadex-backend/     # Spring Boot (Java)
├── acadex-react/       # React + Vite
├── docker-compose.yml  # MySQL Docker setup
└── README.md          # Full documentation
```

## ⚡ Quick Commands

```bash
# Terminal 1 - Frontend (already running on 3001)
# Stay running - already started

# Terminal 2 - Backend
cd D:\acadex\acadex-backend
mvn spring-boot:run

# Terminal 3 - Database (Optional, if Docker available)
cd D:\acadex
docker-compose up -d
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Maven not found | Reload PowerShell after installing via winget |
| MySQL connection error | Ensure MySQL service running or Docker up |
| Port 8081 in use | Kill process: `netstat -ano \| findstr :8081` |
| Frontend not loading | Check http://localhost:3001 (or next port shown) |

## 📚 Documentation

See full setup details in `README.md`

## 🚀 Deploy

### Frontend
```bash
cd acadex-react
npm run build
# Deploy 'dist' folder to any static host
```

### Backend
```bash
cd acadex-backend
mvn clean package
java -jar target/acadex-0.0.1-SNAPSHOT.jar
```

---

**Status:** Frontend running ✅ | Backend ready to build | Database config ready
