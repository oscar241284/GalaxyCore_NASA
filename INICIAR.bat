@echo off
title GalaxyCore - Servidor local
cd /d "%~dp0"

echo ==============================================
echo   GalaxyCore - Mision Robots
echo   Servidor local
echo ==============================================
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No se encontro Node.js en este equipo.
  echo.
  echo  1. Entra en https://nodejs.org
  echo  2. Descarga e instala la version "LTS" ^(acepta todo con "Siguiente"^)
  echo  3. Reinicia el equipo y vuelve a hacer doble clic en INICIAR.bat
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Primera vez: descargando las piezas necesarias. Puede tardar 1 o 2 minutos...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] No se pudo completar la instalacion. Revisa tu conexion a internet e intentalo de nuevo.
    pause
    exit /b 1
  )
)

echo.
echo Arrancando... el navegador se abrira solo.
echo Si no se abre, entra a:  http://localhost:5173
echo.
echo NO CIERRES ESTA VENTANA mientras uses la pagina.
echo Para apagar el servidor: cierra esta ventana o pulsa Ctrl+C.
echo.
call npx vite --open

pause
