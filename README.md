# Acadex - Academic Excellence Management System

A full-stack web application for managing academic operations including courses, exams, assignments, attendance, and student results.

## Tech Stack

### Backend
- **Java 21** with Spring Boot
- **Maven** for build automation
- **MySQL 8.0** for database
- **JWT** for authentication
- **Spring Security** for authorization

### Frontend
- **React 18** with Vite
- **Tailwind CSS** for styling
- **Axios** for API calls
- **Node.js 22** & npm 10

## Project Structure

```
acadex/
├── acadex-backend/           # Spring Boot backend application
│   ├── src/main/java/com/acadex/
│   │   ├── controller/       # REST API endpoints
│   │   ├── service/          # Business logic
│   │   ├── entity/           # JPA entities
│   │   ├── repository/       # Database access
│   │   ├── dto/              # Data transfer objects
│   │   ├── security/         # JWT & Spring Security
│   │   └── config/           # App configuration
│   ├── pom.xml               # Maven dependencies
│   └── src/main/resources/
│       └── application.properties  # Configuration
│
├── acadex-react/              # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/            # Page components
│   │   │   ├── admin/        # Admin role pages
│   │   │   ├── faculty/      # Faculty role pages
│   │   │   └── student/      # Student role pages
│   │   ├── services/         # API services
│   │   ├── context/          # Context API state
│   │   └── App.jsx           # Root component
│   ├── vite.config.js        # Vite configuration
│   └── package.json          # Dependencies
│
├── docker-compose.yml        # Docker MySQL setup
└── README.md                 # This file
```

## Prerequisites

### Required
- **Java 21** or higher
- **Node.js 22** or higher
- **npm 10** or higher
- **Maven 3.9** or higher

### Optional  
- **MySQL 8.0** installed locally
- **Docker Desktop** (for MySQL container)

## Quick Start

### 1. Clone & Navigate
```bash
git clone https://github.com/koushik24k/Acadex.git
cd Acadex
```

### 2. Start MySQL (Docker)
```bash
docker-compose up -d
```
Or install MySQL manually and create database `acadex`.

### 3. Terminal 1 - Backend
```bash
cd acadex-backend
mvn clean spring-boot:run
```
Backend: `http://localhost:8081`

### 4. Terminal 2 - Frontend
```bash
cd acadex-react
npm install    # First time only
npm run dev
```
Frontend: `http://localhost:3001`

## Configuration Files

### Backend
`acadex-backend/src/main/resources/application.properties`
- Server port: 8081
- Database: MySQL localhost:3306/acadex
- Credentials: root / D@rk_life24K
- CORS allowed origins: http://localhost:3001

### Frontend
`acadex-react/vite.config.js`
- Dev port: 3001
- API proxy: `/api` → `http://localhost:8081`

## User Roles

- **Admin:** User & system management
- **Faculty:** Course, assignment, and exam management
- **Student:** Course enrollment, assignments, exams

## Available Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register

### Core Resources
- `/api/courses` - Course management
- `/api/exams` - Exam management
- `/api/assignments` - Assignment management
- `/api/users` - User management
- `/api/attendance` - Attendance tracking
- `/api/results` - Grade results

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000/3001 in use | `npm run dev` auto-selects next port |
| MySQL connection error | Verify Docker running or MySQL service active |
| Maven not found | `winget install Maven.Maven` or download from maven.apache.org |
| Module not found | `cd acadex-react && npm install` |

## Deployment

### Backend JAR
```bash
cd acadex-backend
mvn clean package
java -jar target/acadex-0.0.1-SNAPSHOT.jar
```

### Frontend Build
```bash
cd acadex-react
npm run build
```
Deploy `dist/` folder to static hosting.

## Repository
https://github.com/koushik24k/Acadex

## Author
Koushik Mandal