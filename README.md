# Pitwall Bitlab

Centro no oficial de datos, noticias y live timing de Formula 1.

El vivo usa un colector Node en `live-server/` conectado al feed publico SignalR de F1. OpenF1 se conserva solo como fuente auxiliar para historico.

## Colector live local

```powershell
cd live-server
npm install
npm start
```

La interfaz local busca el colector en `http://127.0.0.1:8790`. En produccion usa `https://pitwall-bitlab-live.onrender.com`; se puede sobrescribir con `localStorage.pitwall_live_api`.

## GitHub Pages

El sitio es estatico y puede publicarse desde la raiz del branch `main`.

La carpeta incluye un workflow que actualiza `data/news.json` cada hora desde fuentes RSS y commitea cambios solo si encuentra novedades.

## Actualizacion local automatica

Windows ejecuta `scripts/update-news-local.ps1` cada hora mediante la tarea programada `Pitwall Bitlab - Update News`. El script evita ejecuciones simultaneas, no pisa cambios locales, valida JavaScript y JSON, y publica el resultado en GitHub. El registro queda en `%LOCALAPPDATA%\PitwallBitlab\news-updater.log`.
