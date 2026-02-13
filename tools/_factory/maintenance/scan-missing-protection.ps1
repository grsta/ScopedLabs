$root = "E:\ScopedLabs\tools"
$fixed = 0

Get-ChildItem $root -Recurse -Filter index.html | ForEach-Object {

    $path = $_.FullName
    $content = Get-Content $path -Raw

    # Skip if already protected
    if ($content -match 'data-protected="true"') {
        return
    }

    # Inject flag into <body>
    if ($content -match '<body[^>]*>') {
        $content = $content -replace '<body([^>]*)>', '<body$1 data-protected="true">'
        Set-Content $path $content -Encoding UTF8
        Write-Host "Fixed: $path"
        $fixed++
    }
}

Write-Host "`nTurbo complete. Fixed $fixed files." -ForegroundColor Green
