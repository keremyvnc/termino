<div align="center">

<img src="resources/icon.png" alt="Termino" width="96" />

# Termino

**Proje tabanlı test terminali — Windows için**

Hazır komutlar · Ağ profilleri · Tek tıkla SSH oturumları

![Electron](https://img.shields.io/badge/Electron-44-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D4?logo=windows&logoColor=white)

</div>

---

## Nedir?

Termino, saha ve laboratuvar testlerinde her gün tekrarlanan şu akışı tek pencereye toplar:

1. Projeyi seç
2. Bilgisayarın IP / alt ağını cihaza göre ayarla
3. SSH ile bağlan, gerekirse atlama sunucusundan geç, `su -` ol
4. Hazır komutları çalıştır

Her proje bir klasördür: YAML dosyalarında tanımlı **oturumlar**, **komutlar** ve bir **ağ profili**. Sol paneldeki ağaçtan bir dosyaya tıklarsın, ▶ ile çalıştırırsın. YAML görmek zorunda değilsin; her şey form olarak da düzenlenir.

## Öne çıkanlar

| | |
|---|---|
| 🖥️ **Yerel terminal** | xterm.js + node-pty ile PowerShell / CMD sekmeleri, Ctrl+F arama, kopyala-yapıştır |
| 🔐 **SSH oturumları** | ssh2 tabanlı; parola Windows DPAPI kasasında tutulur, YAML'a asla yazılmaz |
| 🌐 **Ağ profili** | Adaptöre IP / maske / ağ geçidi ata, DHCP'ye dön, eski ayarı geri yükle. Yalnızca o işlem UAC ile yükseltilir |
| 🔌 **Otomatik uygulama** | Adaptör takılınca projenin profili kendiliğinden uygulanır (MAC ile eşleşir, ad değişse de bulur) |
| 📜 **Senaryo motoru** | `send` / `expect` / `wait` adımları; `{{ip}}` değişkenleri profilden, `{{secret:ad}}` kasadan gelir |
| 🔗 **Zincirleme bağlantı** | Jump host → `ssh -i` → `su -` gibi çok adımlı girişler bir senaryodur, hazır şablonu vardır |
| ⌨️ **Komut paleti** | Ctrl+K ile komut, oturum ve hızlı eylemlere anında eriş |
| 📁 **Düz dosyalar** | Projeler `%APPDATA%/termino/projects/<id>/` altında YAML; dışarıdan düzenle, uygulama canlı izler |
| 📤 **Dışa / içe aktarma** | Projeyi JSON olarak paylaş; parolalar dışarı çıkmaz |

## Ekran düzeni

```
┌──────────────┬──────────────────────────────────┬──────────────┐
│  Projeler    │  [ Terminal 1 ] [ SSH: cihaz ]   │  Ağ profili  │
│  ├ proje.yaml│                                  │  Adaptör     │
│  ├ sessions/ │   $ ping {{ip}}                  │  IP / Maske  │
│  │  └ cihaz  │   Reply from 192.168.56.10 ...   │  [ Uygula ]  │
│  └ commands/ │                                  │  [ DHCP ]    │
│     ├ ▶ ping │                                  │              │
│     └ ▶ log  │                                  │              │
└──────────────┴──────────────────────────────────┴──────────────┘
```

## Bir proje neye benzer?

```
%APPDATA%/termino/projects/<id>/
├── project.yaml          # ad, ağ profili, autoApply
├── sessions/
│   └── cihaz.yaml        # SSH hedefi + bağlantı senaryosu
└── commands/
    └── loglari-cek.yaml  # adım sürüsü, hangi oturumda çalışacağı
```

**sessions/cihaz.yaml**

```yaml
name: cihaz
type: ssh
host: "{{ip}}"
username: root
credentialRef: term:cihaz
steps:
  - expect: "(?i)password:"
  - send: "{{secret:term:cihaz}}"
  - expect: "\$ $"
  - send: "su -"
```

**commands/loglari-cek.yaml**

```yaml
name: Logları çek
target: cihaz
steps:
  - send: "tail -n 200 /var/log/app.log"
  - wait: 500
  - run: "Servisi yeniden başlat"   # başka bir komutu çağır
```

## Kısayollar

| Kısayol | İşlev |
|---|---|
| `Ctrl+K` | Komut paleti |
| `Ctrl+F` | Terminalde ara |
| `Ctrl+Shift+T` / `Ctrl+Shift+W` | Sekme aç / kapat |
| `Alt+1..9` | Sekme seç |
| `Ctrl+Shift+C` / `Ctrl+Shift+V` | Kopyala / yapıştır |
| `Ctrl+S` | YAML görünümünde kaydet |

## Kurulum

Hazır paket: `release/Termino-Setup-<sürüm>.exe` (kullanıcı bazlı NSIS kurulumu, dizin seçilebilir).

Kaynaktan çalıştırmak için:

```bash
npm install
npm run dev        # geliştirme (HMR)
npm run build      # out/ altına derler
npm run typecheck  # main + renderer tip kontrolü
npm run dist       # kurulum paketi üretir (release/)
```

> Windows gerektirir: ağ işlemleri PowerShell + UAC, parola kasası DPAPI kullanır.

## Mimari

Electron ana süreç ve React arayüzü birbirinden `contextIsolation` + `sandbox` ile ayrılmıştır; arayüz yalnızca `window.api` köprüsünü görür.

```
src/main/       ana süreç
  services.ts     nesne grafiği (tek kurulum yeri)
  network/        PowerShell, UAC yükseltme, yedek/geri yükleme, adaptör izleme
  terminal/       TerminalSession arayüzü, LocalPtySession, SshSession, ScriptRunner
  project/        YAML disk deposu, fs.watch
  ipc/            kanal kayıtları (project / network / terminal / credential / app)
src/preload/    window.api köprüsü
src/renderer/   React + zustand; sidebar, editor (CodeMirror), terminalArea, network, palette
src/shared/     tipler, IPC kanal adları, YAML dönüşümü, IPv4 yardımcıları
```

Tasarım ilkeleri:

- **Parolalar** yalnızca ana süreçte çözülür; YAML'da sadece `credentialRef` adı bulunur.
- **Adaptör eşlemesi** MAC adresiyle yapılır, adla değil.
- **Yükseltme** uygulamanın tamamına değil, yalnızca IP değiştiren PowerShell betiğine verilir.
- **Yeni terminal türü** (serial, telnet…) eklemek için `TerminalSession` arayüzünü uygulayıp `sessionFactories.ts` içine bir satır eklemek yeter.

## Teknolojiler

Electron · React · TypeScript · electron-vite · zustand · xterm.js · node-pty · ssh2 · CodeMirror · yaml

## Lisans

Bu depo kişisel bir projedir; lisans henüz belirlenmemiştir.
