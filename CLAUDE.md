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

## SSH, kasa ve senaryo (Asama 4)

- `src/main/terminals.ts`: `TerminalSession` arayuzu; `LocalPtySession` (node-pty) ve `SshSession` (ssh2). Yeni tur eklemek icin ayni arayuzu uygula ve `TerminalManager.create` icinde sec.
- `src/main/credentials.ts`: safeStorage (DPAPI) kasasi, `%APPDATA%/termino/vault.json`. Anahtar: `term:<oturumId>`. Sifre yalnizca main'de cozulur.
- `src/main/scriptRunner.ts` + `src/shared/script.ts`: satir tabanli senaryo (`send:`, `expect: regex @ms`, `wait: ms`, `#` yorum). `{{ip}}` gibi degiskenler proje profilinden, `{{secret:ref}}` kasadan (sadece main) doldurulur. Yerel ve SSH oturumlarinda calisir.
- Ek sifreler: oturum tanimindaki `secrets` yalnizca adlari tutar; degerler kasada `term:<oturumId>:<ad>`.
  Senaryoda `{{secret:ad}}` once bu anahtarda, sonra ham ad olarak aranir. Oturum silinince `removePrefix` ile hepsi gider.
- Zincirleme baglanti (atlama sunucusu -> ssh -i ... -> su -) ayri bir mekanizma degil, senaryodur; editordeki
  "Zincir sablonu" butonu ornek doldurur. `expect:` deseninde `(?i)` oneki desteklenir (i bayragina cevrilir).
- Test: `ssh2.Server` ile sahte sunucu yazip 127.0.0.1:2222'de calistirmak yeterli; sisteme sshd kurmaya gerek yok.

## Kisayollar ve cila (Asama 5)

- Ctrl+K komut paleti (`CommandPalette.tsx`): komutlar, oturum tanimlari, hizli eylemler.
- Ctrl+F terminalde arama (`TerminalSearch.tsx`, @xterm/addon-search). Ctrl+Shift+C/V kopyala-yapistir.
- Ctrl+Shift+T yeni sekme, Ctrl+Shift+W kapat, Alt+1..9 sekme sec. Uygulama kisayollari xterm'in
  `attachCustomKeyEventHandler` icinde `false` dondurulerek pencereye kabartilir.
- Disa aktarma (proje basligi, indirme ikonu): JSON, `credentialRef` cikarilir. Ice aktarma (sol panel):
  yeni id'ler, adaptor ve autoApply sifirlanir.
- Kurulum: `npm run dist` -> `release/Termino-Setup-<surum>.exe` (NSIS, kullanici bazli, dizin secilebilir).
  Ikon `resources/icon.ico` (PIL ile uretildi). `node-pty` asar disinda birakilir.

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
4. SSH (ssh2), sifre kasasi, senaryo motoru (send/expect/wait), provider arayuzu (tamamlandi)
5. Cila: kisayollar, dis/ic aktarma, kurulum paketi (tamamlandi)
