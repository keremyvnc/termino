# Termino

Proje tabanli test terminali (Windows, Electron + React + TypeScript).
Bir proje: hazir komutlar + ag profili (adaptor/IP/subnet) + tek tikla acilan terminal oturumlari.

## Komutlar

```
npm run dev        # electron-vite dev (HMR)
npm run build      # out/ altina derler
npm run typecheck  # main + renderer tip kontrolu
npm run dist       # NSIS kurulum paketi (release/)
```

Uygulamayi bu ortamdan (Claude Code / VS Code terminali) elle acarken
`ELECTRON_RUN_AS_NODE=1` set edilmis olabilir; o durumda Electron duz Node gibi
davranir ve `electron.app` undefined olur. Su sekilde calistir:

```
env -u ELECTRON_RUN_AS_NODE npx electron .
```

## Yapi

- `src/main/` Electron main: pencere, IPC, `projectStore.ts` (JSON dosyalari, `%APPDATA%/termino/projects`), `network.ts` (Get-NetAdapter ile adaptor listesi + periyodik izleme).
- `src/preload/` `window.api` koprusu (contextIsolation + sandbox acik).
- `src/renderer/` React UI. Durum: zustand (`store/useAppStore.ts`). Stil: Tailwind v4, tema tokenlari `index.css` icinde.
- `src/shared/` Ortak tipler (`types.ts`) ve IPC kanal adlari (`ipc.ts`).

## Ag islemleri (Asama 3)

- `src/main/netApply.ts`: `applyProfile`, `setDhcp`, `restoreBackup`. Yukseltme `Start-Process -Verb RunAs` ile tek seferlik;
  betik `%TEMP%/termino/net-*.ps1`, sonuc JSON'u BOM'suz UTF-8 yazilir ve okunur okunmaz silinir.
- Ilk uygulamadan once adaptorun mevcut durumu `%APPDATA%/termino/netbackups/<mac>.json` dosyasina alinir; geri yukleme bu dosyayi kullanir ve siler.
- `src/main/autoApply.ts`: adaptor Up olunca autoApply acik projenin profilini uygular, renderer'a `net:autoApplied` gonderir.
- Tani logu: `%APPDATA%/termino/termino.log` (renderer yuklemeleri, ag islemleri).
- Testte VirtualBox Host-Only adaptoru (Ethernet 8, 192.168.56.1) kullanildi; gercek karta dokunma.

## Kurallar

- Sifreler asla proje JSON'una yazilmaz; `credentialRef` ile safeStorage kasasina isaret edilir.
- Adaptor eslemesi MAC ile yapilir, adaptor adiyla degil (adlar degisir).
- IP atama yonetici hakki ister; uygulamanin tamami degil, sadece o islem UAC ile yukseltilir (Asama 3).
- Terminal turleri saglayici (provider) arayuzu uzerinden eklenir: local, ssh, ileride serial/telnet (Asama 4).
- UI metinleri Turkce.

## Asamalar

1. Iskelet, proje CRUD, temel UI, adaptor listesi (tamamlandi)
2. xterm.js + node-pty ile yerel terminal sekmeleri, komut calistirma, `{{ip}}` degiskenleri (tamamlandi)
3. Canli adaptor izleme, UAC ile IP/subnet atama, DHCP'ye donus, otomatik uygulama (tamamlandi)
4. SSH (ssh2), sifre kasasi, senaryo motoru (send/expect/wait), provider arayuzu
5. Cila: kisayollar, dis/ic aktarma, kurulum paketi
