@echo off
echo Sincronizando con GitHub...
git pull origin main
git add .
git commit -m "Auto-sync: %date% %time%"
git push origin main
echo Sincronización completada!
pause 