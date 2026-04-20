# Rileva l'IP LAN "migliore" del PC per uso con Metro / Expo.
# Criteri:
#   - IPv4, assegnato da DHCP o manuale (esclude 169.254.* link-local)
#   - interfaccia non loopback, non virtuale (Hyper-V, VirtualBox, VMware,
#     WSL, Bluetooth, Tailscale, WireGuard, OpenVPN, TAP)
#   - ordina per InterfaceMetric (priorita' Windows: lower = meglio;
#     solitamente Wi-Fi/Ethernet prima di VPN/virtuali)
#   - stampa solo l'IP (nessun output se non trova nulla)

$ErrorActionPreference = 'SilentlyContinue'

$ip = Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp, Manual |
    Where-Object {
        $_.InterfaceAlias -notmatch 'Loopback|vEthernet|Virtual|Bluetooth|Tailscale|WireGuard|OpenVPN|TAP|Hyper-V' -and
        $_.IPAddress -notlike '169.*' -and
        $_.IPAddress -ne '0.0.0.0'
    } |
    Sort-Object InterfaceMetric |
    Select-Object -First 1 -ExpandProperty IPAddress

if ($ip) { Write-Output $ip.Trim() }
