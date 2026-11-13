$API = "http://localhost:5230/api"

function Invoke-Api {
    param([string]$Method, [string]$Url, [hashtable]$Body, [string]$Token)
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    $json = if ($Body) { $Body | ConvertTo-Json -Depth 5 } else { $null }
    try {
        $resp = Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -Body $json -ErrorAction Stop
        return $resp
    } catch {
        Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# ── Step 1: Login as existing SuperAdmin ────────────────────────────
Write-Host "`n=== Step 1: Login as SuperAdmin ===" -ForegroundColor Cyan
$login = Invoke-Api -Method POST -Url "$API/auth/login" -Body @{
    email    = "super@admin.com"
    password = "super123"
}
$superToken = $login.token
Write-Host "  SuperAdmin token obtained" -ForegroundColor Green

# ── Step 2: Create companies ────────────────────────────────────────
Write-Host "`n=== Step 2: Create Companies ===" -ForegroundColor Cyan
$mcd = Invoke-Api -Method POST -Url "$API/company" -Body @{ name = "McDonalds" } -Token $superToken
Write-Host "  McDonalds created (ID: $($mcd.id))" -ForegroundColor Green

$dom = Invoke-Api -Method POST -Url "$API/company" -Body @{ name = "Dominos" } -Token $superToken
Write-Host "  Dominos created (ID: $($dom.id))" -ForegroundColor Green

$mcdId = $mcd.id
$domId = $dom.id

# ── Step 3: Create SuperAdmin user rvk@gmail.com ───────────────────
Write-Host "`n=== Step 3: Create SuperAdmin rvk@gmail.com ===" -ForegroundColor Cyan
# The API only allows User/CompanyAdmin roles, so we register under a company
# then promote via direct SQLite update (Role + CompanyId = NULL).
$rvk = Invoke-Api -Method POST -Url "$API/auth/register" -Body @{
    email     = "rvk@gmail.com"
    password  = "rvk123"
    name      = "RVK"
    companyId = $mcdId
}
if ($rvk) {
    Write-Host "  Registered rvk@gmail.com (temp User)" -ForegroundColor Green
    # Promote to SuperAdmin via SQLite
    $dbPath = Join-Path $PSScriptRoot "company-canteen\server\canteen.db"
    if (Test-Path $dbPath) {
        # Use the dotnet ef approach isn't available, so update via API workaround:
        # We'll use the existing SuperAdmin to get the user ID, then sqlite3 if available
        $allMcdUsers = Invoke-Api -Method GET -Url "$API/company/$mcdId/users" -Token $superToken
        $rvkUser = $allMcdUsers | Where-Object { $_.email -eq "rvk@gmail.com" }
        if ($rvkUser) {
            try {
                $connStr = "Data Source=$dbPath"
                [System.Reflection.Assembly]::LoadWithPartialName("System.Data.SQLite") | Out-Null
                # Try with Microsoft.Data.Sqlite via dotnet
                $updateSql = "UPDATE Users SET Role = 'SuperAdmin', CompanyId = NULL WHERE Email = 'rvk@gmail.com'"
                # Use sqlite3 CLI if available, otherwise provide manual instruction
                $sqlite3 = Get-Command sqlite3 -ErrorAction SilentlyContinue
                if ($sqlite3) {
                    & sqlite3 $dbPath $updateSql
                    Write-Host "  Promoted rvk@gmail.com to SuperAdmin (via sqlite3)" -ForegroundColor Green
                } else {
                    # Try dotnet-script or direct SQL
                    Write-Host "  sqlite3 not found. Run this SQL manually:" -ForegroundColor Yellow
                    Write-Host "    $updateSql" -ForegroundColor Yellow
                    Write-Host "  Or stop the server, then run:" -ForegroundColor Yellow
                    Write-Host "    dotnet ef database update  (after updating DbContext seed)" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "  Could not auto-promote. Run this SQL on canteen.db:" -ForegroundColor Yellow
                Write-Host "    UPDATE Users SET Role = 'SuperAdmin', CompanyId = NULL WHERE Email = 'rvk@gmail.com'" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  DB not found at $dbPath - run this SQL after script:" -ForegroundColor Yellow
        Write-Host "    UPDATE Users SET Role = 'SuperAdmin', CompanyId = NULL WHERE Email = 'rvk@gmail.com'" -ForegroundColor Yellow
    }
}

# ── Step 4: Register McDonalds employees ────────────────────────────
Write-Host "`n=== Step 4: Register McDonalds Employees ===" -ForegroundColor Cyan
$mcdUsers = @(
    @{ name = "Raj Kumar";       email = "raj@mcd.com";      password = "pass123" },
    @{ name = "Priya Sharma";    email = "priya@mcd.com";    password = "pass123" },
    @{ name = "Amit Patel";      email = "amit@mcd.com";     password = "pass123" },
    @{ name = "Sneha Gupta";     email = "sneha@mcd.com";    password = "pass123" },
    @{ name = "Vikram Singh";    email = "vikram@mcd.com";   password = "pass123" },
    @{ name = "Ananya Reddy";    email = "ananya@mcd.com";   password = "pass123" },
    @{ name = "Rohit Verma";     email = "rohit@mcd.com";    password = "pass123" },
    @{ name = "Kavita Nair";     email = "kavita@mcd.com";   password = "pass123" },
    @{ name = "Deepak Joshi";    email = "deepak@mcd.com";   password = "pass123" },
    @{ name = "Meera Iyer";      email = "meera@mcd.com";    password = "pass123" }
)

$mcdAdmin = $null
foreach ($u in $mcdUsers) {
    $resp = Invoke-Api -Method POST -Url "$API/auth/register" -Body @{
        email     = $u.email
        password  = $u.password
        name      = $u.name
        companyId = $mcdId
    }
    if ($resp) {
        Write-Host "  Registered $($u.email)" -ForegroundColor Green
        if (-not $mcdAdmin) { $mcdAdmin = $resp }
    }
}

# ── Step 5: Register Dominos employees ──────────────────────────────
Write-Host "`n=== Step 5: Register Dominos Employees ===" -ForegroundColor Cyan
$domUsers = @(
    @{ name = "Arjun Menon";     email = "arjun@dom.com";    password = "pass123" },
    @{ name = "Sanya Kapoor";    email = "sanya@dom.com";    password = "pass123" },
    @{ name = "Nikhil Das";      email = "nikhil@dom.com";   password = "pass123" },
    @{ name = "Pooja Rao";       email = "pooja@dom.com";    password = "pass123" },
    @{ name = "Suresh Pillai";   email = "suresh@dom.com";   password = "pass123" },
    @{ name = "Divya Choudhary"; email = "divya@dom.com";    password = "pass123" },
    @{ name = "Karthik Bhat";    email = "karthik@dom.com";  password = "pass123" },
    @{ name = "Ritu Agarwal";    email = "ritu@dom.com";     password = "pass123" },
    @{ name = "Manish Tiwari";   email = "manish@dom.com";   password = "pass123" },
    @{ name = "Nisha Saxena";    email = "nisha@dom.com";    password = "pass123" }
)

$domAdmin = $null
foreach ($u in $domUsers) {
    $resp = Invoke-Api -Method POST -Url "$API/auth/register" -Body @{
        email     = $u.email
        password  = $u.password
        name      = $u.name
        companyId = $domId
    }
    if ($resp) {
        Write-Host "  Registered $($u.email)" -ForegroundColor Green
        if (-not $domAdmin) { $domAdmin = $resp }
    }
}

# ── Step 6: Promote first user of each company to CompanyAdmin ──────
Write-Host "`n=== Step 6: Promote CompanyAdmins ===" -ForegroundColor Cyan

# Get McDonalds users to find first user ID
$mcdUserList = Invoke-Api -Method GET -Url "$API/company/$mcdId/users" -Token $superToken
$firstMcd = $mcdUserList | Select-Object -First 1
Invoke-Api -Method PUT -Url "$API/company/users/$($firstMcd.id)/role" -Body @{ role = "CompanyAdmin" } -Token $superToken | Out-Null
Write-Host "  Promoted $($firstMcd.email) to CompanyAdmin (McDonalds)" -ForegroundColor Green

# Get Dominos users to find first user ID
$domUserList = Invoke-Api -Method GET -Url "$API/company/$domId/users" -Token $superToken
$firstDom = $domUserList | Select-Object -First 1
Invoke-Api -Method PUT -Url "$API/company/users/$($firstDom.id)/role" -Body @{ role = "CompanyAdmin" } -Token $superToken | Out-Null
Write-Host "  Promoted $($firstDom.email) to CompanyAdmin (Dominos)" -ForegroundColor Green

# ── Step 7: Login as CompanyAdmins to create menus ──────────────────
Write-Host "`n=== Step 7: Create McDonalds Menu ===" -ForegroundColor Cyan
$mcdLogin = Invoke-Api -Method POST -Url "$API/auth/login" -Body @{
    email    = $firstMcd.email
    password = "pass123"
}
$mcdToken = $mcdLogin.token

$mcdMenu = @(
    @{ name = "Big Mac";              description = "Two beef patties, special sauce, lettuce, cheese";    price = 199; category = "Burgers" },
    @{ name = "McChicken";            description = "Crispy chicken patty with mayo and lettuce";          price = 149; category = "Burgers" },
    @{ name = "McAloo Tikki";         description = "Potato and pea patty with spicy sauce";              price = 69;  category = "Burgers" },
    @{ name = "Chicken McNuggets 6pc";description = "Golden fried chicken nuggets";                       price = 179; category = "Snacks" },
    @{ name = "French Fries (L)";     description = "Large crispy golden fries";                          price = 129; category = "Snacks" },
    @{ name = "McFlurry Oreo";        description = "Soft serve with Oreo cookie pieces";                 price = 119; category = "Desserts" },
    @{ name = "Hot Fudge Sundae";     description = "Vanilla soft serve with hot fudge sauce";            price = 69;  category = "Desserts" },
    @{ name = "Coca-Cola (M)";        description = "Medium chilled Coca-Cola";                           price = 79;  category = "Beverages" },
    @{ name = "McCafe Latte";         description = "Espresso with steamed milk";                         price = 149; category = "Beverages" },
    @{ name = "Egg McMuffin";         description = "English muffin with egg, cheese and ham";            price = 119; category = "Breakfast" }
)

$mcdItemIds = @()
foreach ($item in $mcdMenu) {
    $resp = Invoke-Api -Method POST -Url "$API/menu" -Body @{
        name        = $item.name
        description = $item.description
        price       = $item.price
        category    = $item.category
    } -Token $mcdToken
    if ($resp) {
        $mcdItemIds += $resp.id
        Write-Host "  Created: $($item.name) - Rs.$($item.price)" -ForegroundColor Green
    }
}

Write-Host "`n=== Step 8: Create Dominos Menu ===" -ForegroundColor Cyan
$domLogin = Invoke-Api -Method POST -Url "$API/auth/login" -Body @{
    email    = $firstDom.email
    password = "pass123"
}
$domToken = $domLogin.token

$domMenu = @(
    @{ name = "Margherita Pizza";     description = "Classic cheese and tomato sauce pizza";               price = 199; category = "Pizzas" },
    @{ name = "Peppy Paneer";         description = "Paneer with capsicum and spicy red paprika";         price = 299; category = "Pizzas" },
    @{ name = "Farmhouse Pizza";      description = "Capsicum, tomato, onion, mushroom and grilled corn"; price = 349; category = "Pizzas" },
    @{ name = "Chicken Dominator";    description = "Loaded with 6 chicken toppings";                     price = 449; category = "Pizzas" },
    @{ name = "Garlic Breadsticks";   description = "Freshly baked with garlic butter and herbs";         price = 99;  category = "Sides" },
    @{ name = "Stuffed Garlic Bread"; description = "Garlic bread stuffed with cheese and jalapeno";      price = 159; category = "Sides" },
    @{ name = "Chicken Wings 8pc";    description = "Peri-peri seasoned chicken wings";                   price = 229; category = "Sides" },
    @{ name = "Choco Lava Cake";      description = "Warm chocolate cake with molten center";             price = 109; category = "Desserts" },
    @{ name = "Butterscotch Mousse";  description = "Creamy butterscotch mousse cake";                    price = 79;  category = "Desserts" },
    @{ name = "Cold Drink Combo";     description = "Pepsi 475ml with your order";                        price = 59;  category = "Beverages" }
)

$domItemIds = @()
foreach ($item in $domMenu) {
    $resp = Invoke-Api -Method POST -Url "$API/menu" -Body @{
        name        = $item.name
        description = $item.description
        price       = $item.price
        category    = $item.category
    } -Token $domToken
    if ($resp) {
        $domItemIds += $resp.id
        Write-Host "  Created: $($item.name) - Rs.$($item.price)" -ForegroundColor Green
    }
}

# ── Step 9: Set today's stock for both companies ────────────────────
Write-Host "`n=== Step 9: Set Today's Stock ===" -ForegroundColor Cyan
$today = (Get-Date).ToString("yyyy-MM-dd")

# McDonalds stock
$mcdStockBatch = @()
foreach ($id in $mcdItemIds) {
    $mcdStockBatch += @{ menuItemId = $id; date = $today; quantityAvailable = 50 }
}
if ($mcdStockBatch.Count -gt 0) {
    $headers = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $mcdToken" }
    $json = $mcdStockBatch | ConvertTo-Json -Depth 5
    # Wrap in array if single item
    if ($mcdStockBatch.Count -eq 1) { $json = "[$json]" }
    try {
        Invoke-RestMethod -Method POST -Uri "$API/stock/batch" -Headers $headers -Body $json -ErrorAction Stop | Out-Null
        Write-Host "  McDonalds: stock set for $($mcdStockBatch.Count) items (50 each)" -ForegroundColor Green
    } catch {
        Write-Host "  McDonalds stock FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Dominos stock
$domStockBatch = @()
foreach ($id in $domItemIds) {
    $domStockBatch += @{ menuItemId = $id; date = $today; quantityAvailable = 50 }
}
if ($domStockBatch.Count -gt 0) {
    $headers = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $domToken" }
    $json = $domStockBatch | ConvertTo-Json -Depth 5
    if ($domStockBatch.Count -eq 1) { $json = "[$json]" }
    try {
        Invoke-RestMethod -Method POST -Uri "$API/stock/batch" -Headers $headers -Body $json -ErrorAction Stop | Out-Null
        Write-Host "  Dominos: stock set for $($domStockBatch.Count) items (50 each)" -ForegroundColor Green
    } catch {
        Write-Host "  Dominos stock FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ── Summary ─────────────────────────────────────────────────────────
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SEED COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Companies:" -ForegroundColor White
Write-Host "    McDonalds (ID: $mcdId)" -ForegroundColor Gray
Write-Host "    Dominos   (ID: $domId)" -ForegroundColor Gray
Write-Host ""
Write-Host "  SuperAdmin:" -ForegroundColor White
Write-Host "    super@admin.com / super123  (existing seed)" -ForegroundColor Gray
Write-Host "    rvk@gmail.com   / rvk123   (promoted via DB)" -ForegroundColor Gray
Write-Host ""
Write-Host "  CompanyAdmins:" -ForegroundColor White
Write-Host "    $($firstMcd.email) / pass123  (McDonalds)" -ForegroundColor Gray
Write-Host "    $($firstDom.email) / pass123  (Dominos)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Employees: 9 per company (pass123)" -ForegroundColor White
Write-Host "    McDonalds: raj@mcd.com .. meera@mcd.com" -ForegroundColor Gray
Write-Host "    Dominos:   arjun@dom.com .. nisha@dom.com" -ForegroundColor Gray
Write-Host ""
Write-Host "  Menu: 10 items per company with stock set to 50" -ForegroundColor White
Write-Host ""
