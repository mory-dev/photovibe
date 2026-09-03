@echo off
setlocal EnableDelayedExpansion

rem Signs one Windows binary with Azure Trusted Signing. Tauri calls this once
rem per artifact and passes the path as %1.

set "FILE=%~1"
if "%FILE%"=="" (
  echo [sign] No file argument given.
  exit /b 1
)

if "%AZURE_ENDPOINT%%AZURE_ACCOUNT_NAME%%AZURE_CERT_PROFILE_NAME%%AZURE_CLIENT_ID%%AZURE_TENANT_ID%%AZURE_CLIENT_SECRET%"=="" (
  echo [sign] No Azure credentials in the environment - leaving %~nx1 unsigned.
  exit /b 0
)

set "MISSING="
if "%AZURE_ENDPOINT%"=="" set "MISSING=!MISSING! AZURE_ENDPOINT"
if "%AZURE_ACCOUNT_NAME%"=="" set "MISSING=!MISSING! AZURE_ACCOUNT_NAME"
if "%AZURE_CERT_PROFILE_NAME%"=="" set "MISSING=!MISSING! AZURE_CERT_PROFILE_NAME"
if "%AZURE_CLIENT_ID%"=="" set "MISSING=!MISSING! AZURE_CLIENT_ID"
if "%AZURE_TENANT_ID%"=="" set "MISSING=!MISSING! AZURE_TENANT_ID"
if "%AZURE_CLIENT_SECRET%"=="" set "MISSING=!MISSING! AZURE_CLIENT_SECRET"
if not "!MISSING!"=="" (
  echo [sign] Azure signing is only partly configured. Missing:!MISSING!
  exit /b 1
)

set "AZURE_ARTIFACT_SIGNING_ACCOUNT=%AZURE_ACCOUNT_NAME%"
set "AZURE_ARTIFACT_SIGNING_CERTIFICATE_PROFILE=%AZURE_CERT_PROFILE_NAME%"

echo [sign] Signing %~nx1
artifact-signing-cli -e "%AZURE_ENDPOINT%" -d "Photovibe" "%FILE%"
exit /b %ERRORLEVEL%
