$securePassword = Read-Host 'Masukkan password admin baru (minimal 12 karakter)' -AsSecureString
if ($securePassword.Length -lt 12) {
  $securePassword.Dispose()
  Write-Error 'Password harus terdiri dari minimal 12 karakter.'
  exit 1
}

$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $env:SEED_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  npm run db:seed
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
  Write-Output 'Password admin berhasil diperbarui. Gunakan password baru tersebut di halaman login.'
}
finally {
  Remove-Item Env:SEED_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  $securePassword.Dispose()
}
