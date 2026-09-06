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

Her klasor tek bir konudan sorumlu; bagimliliklar disaridan verilir (`services.ts` tek kurulum yeri).

```
src/main/
  index.ts        yalnizca yasam dongusu (pencere ac/kapat, quit)
  services.ts     nesne grafigi: hangi sinif neyi alir (composition root)
  window.ts       BrowserWindow kurulumu, tani loglari, dis baglantilar
  logger.ts       Logger arayuzu + FileLogger + logged() sarmali
  credentials.ts  CredentialVault (DPAPI) ve dar SecretReader arayuzu
  autoApply.ts    adaptor takilinca profili uygulatir (NetworkApplier'a devreder)
  ipc/            kanal kayitlari alan alan: project / network / terminal / credential / app
                  context.ts = servis paketi, terminalEventSink.ts = olaylari renderer'a tasir
  network/        powershell.ts (surec), elevated.ts (UAC), profileScripts.ts (PS metinleri),
                  validation.ts, backupStore.ts, adapters.ts (liste + AdapterWatcher),
                  diagnostics.ts, NetworkConfigurator.ts (politika)
  project/        projectStore.ts (YAML disk), projectSerialization.ts (saf donusum),
                  projectTransfer.ts (dosya secme diyaloglari)
  terminal/       TerminalSession.ts (arayuzler), LocalPtySession, SshSession,
                  sessionFactories.ts (tur kaydi), TerminalManager, ScriptQueue,
                  ScriptRunner, variableResolver.ts, ansi.ts
src/preload/      `window.api` koprusu (contextIsolation + sandbox acik)
src/renderer/src/
  store/          useAppStore, useTerminalStore (yalnizca durum),
                  terminalTabs.ts (sekme uretimi), commandTargets.ts (komut hangi sekmede calisir),
                  projectVariables.ts ({{degisken}} onizlemesi), useEditorStore
  components/     sidebar/ (agac), editor/ (CodeMirror + SecretsBar), terminalArea/ (sekmeler),
                  network/ (ag profili paneli), palette/ (Ctrl+K)
src/shared/       types.ts, ipc.ts (kanal adlari), projectYaml.ts (YAML donusumu),
                  net.ts (IPv4 yardimcilari: main ve renderer ayni kurallari kullanir)
```

## Ag islemleri (Asama 3)

- `network/NetworkConfigurator.ts`: `applyProfile`, `setDhcp`, `restoreBackup` (politika). PS metinleri `profileScripts.ts`,
  yukseltme `elevated.ts` icinde: `Start-Process -Verb RunAs` ile tek seferlik; betik `%TEMP%/termino/net-*.ps1`,
  sonuc JSON'u BOM'suz UTF-8 yazilir ve okunur okunmaz silinir.
- Ilk uygulamadan once adaptorun mevcut durumu `%APPDATA%/termino/netbackups/<mac>.json` dosyasina alinir (`backupStore.ts`);
  geri yukleme bu dosyayi kullanir ve siler.
- `src/main/autoApply.ts`: adaptor Up olunca autoApply acik projenin profilini uygular, renderer'a `net:autoApplied` gonderir.
  Somut yapilandiriciya degil `NetworkApplier` arayuzune bagimlidir.
- Tani logu: `%APPDATA%/termino/termino.log` (renderer yuklemeleri, ag islemleri).
- Testte VirtualBox Host-Only adaptoru (Ethernet 8, 192.168.56.1) kullanildi; gercek karta dokunma.

## SSH, kasa ve senaryo (Asama 4)

- `terminal/TerminalSession.ts`: `TerminalSession` arayuzu; `LocalPtySession` (node-pty) ve `SshSession` (ssh2).
  Yeni tur eklemek icin `TerminalManager` degistirilmez: ayni arayuzu uygula ve `sessionFactories.ts` icine
  (ya da calisma aninda `TerminalManager.register`) bir uretici ekle.
- `src/main/credentials.ts`: safeStorage (DPAPI) kasasi, `%APPDATA%/termino/vault.json`. Anahtar: `term:<oturumId>`. Sifre yalnizca main'de cozulur.
  Oturumlar kasanin tamamini degil yalnizca `SecretReader` (get) arayuzunu alir.
- `terminal/ScriptRunner.ts`: senaryo motoru (`send` / `expect` / `wait`). Adimlarin YAML bicimi
  `src/shared/projectYaml.ts` icindedir (Asama 6; eski satir tabanli `shared/script.ts` kaldirildi).
  `{{ip}}` gibi degiskenler proje profilinden, `{{secret:ref}}` kasadan doldurulur (`terminal/variableResolver.ts`,
  yalnizca main). Yerel ve SSH oturumlarinda calisir.
- Ek sifreler: oturum tanimindaki `secrets` yalnizca adlari tutar; degerler kasada `term:<oturumId>:<ad>`.
  Senaryoda `{{secret:ad}}` once bu anahtarda, sonra ham ad olarak aranir. Oturum silinince `removePrefix` ile hepsi gider.
- Zincirleme baglanti (atlama sunucusu -> ssh -i ... -> su -) ayri bir mekanizma degil, senaryodur; editordeki
  "Zincir sablonu" butonu ornek doldurur. `expect:` deseninde `(?i)` oneki desteklenir (i bayragina cevrilir).
- Test: `ssh2.Server` ile sahte sunucu yazip 127.0.0.1:2222'de calistirmak yeterli; sisteme sshd kurmaya gerek yok.

## Kisayollar ve cila (Asama 5)

- Ctrl+K komut paleti (`palette/CommandPalette.tsx`, liste `palette/paletteItems.tsx`): komutlar, oturum tanimlari, hizli eylemler.
- Ctrl+F terminalde arama (`TerminalSearch.tsx`, @xterm/addon-search). Ctrl+Shift+C/V kopyala-yapistir.
- Ctrl+Shift+T yeni sekme, Ctrl+Shift+W kapat, Alt+1..9 sekme sec. Uygulama kisayollari xterm'in
  `attachCustomKeyEventHandler` icinde `false` dondurulerek pencereye kabartilir.
- Disa aktarma (proje basligi, indirme ikonu): JSON, `credentialRef` cikarilir. Ice aktarma (sol panel):
  yeni id'ler, adaptor ve autoApply sifirlanir.
- Kurulum: `npm run dist` -> `release/Termino-Setup-<surum>.exe` (NSIS, kullanici bazli, dizin secilebilir).
  Ikon `resources/icon.ico` (PIL ile uretildi). `node-pty` asar disinda birakilir.

## YAML dosya agaci (Asama 6)

- Projeler artik dizin: `%APPDATA%/termino/projects/<id>/project.yaml`, `sessions/<ad>.yaml`, `commands/<ad>.yaml`.
  Eski `<id>.json` ilk okumada tasinir (`ProjectStore.migrateLegacy`). Dosya adi = `toSlug(name)`; ad degisince dosya da degisir.
- Donusumler `src/shared/projectYaml.ts` icinde; main (disk) ve renderer (editor) ayni fonksiyonu kullanir,
  editordeki metin diskteki dosyayla birebirdir. `ProjectStore.save` klasoru tanim listesiyle esler (fazla dosya silinir).
- Dizin `fs.watch` ile izlenir; disaridan duzenleme `projects:changed` ile renderer'a gelir (`setProjects`).
- Komut dosyasi = adim surusu (`steps: send/expect/wait`, duz metin `send` sayilir). `target:` oturum adi;
  bos ise `shell`e gore yerel terminal / aktif SSH. Calistirma: `useTerminalStore.runCommand` ->
  `term:runScript` -> `ScriptQueue` (baglanti senaryosu bittikten sonra sirayla calisir).
- Sol panel VS Code Explorer gibi agac (`components/sidebar/`); dosyaya tik `editor/FileEditor` acar, ▶/cift tik calistirir.
  Editor sekmeleri terminal sekmeleriyle ayni cubukta (`useEditorStore`).
- **Kullanici YAML gormek istemiyor.** Varsayilan gorunum form: `editor/CommandForm` / `editor/SessionForm` +
  `editor/StepsEditor` (adim ekle/sil/tasi, insan dilinde ozet `editor/stepText.ts`). Form degisiklikleri dogrudan
  projeye yazilir (`TextField` blur/Enter'da kaydeder). "YAML" dugmesi ham dosyayi `editor/YamlView` (CodeMirror,
  Ctrl+S; `useYamlEditor.ts`, `fileDocument.ts`) ile gosterir. Agac ve sekmeler dosya adini degil `name`i gosterir.
- Komut komutu cagirabilir: `- run: <komut adi>` adimi. Calistirmadan once `shared/steps.ts` `flattenSteps`
  ile ic ice acilir (dongu hata). Senaryo motoru `run` gormez; gorurse hata firlatir.
- SSH sifresi ve ek sifreler editorun ustundeki `editor/SecretsBar`dan kasaya yazilir (kasa islemleri `useSessionSecrets.ts`);
  YAML'da yalnizca `credentialRef`/`secrets` adlari.
- Sag panel yalnizca ag profili. Kullanici "projeyi baslat" tarzi toplu tetikleyici istemiyor.

## Yapisal duzen (Asama 7)

SOLID'e gore ayristirma. Yeni kod yazarken bu sinirlari koru:

- **Tek sorumluluk:** surec calistirma / metin uretme / karar verme / diske yazma ayri dosyalarda.
  Ornek: `powershell.ts` calistirir, `profileScripts.ts` metni uretir, `NetworkConfigurator` karar verir.
- **Acik-kapali:** yeni terminal turu icin `TerminalManager` degismez, `sessionFactories.ts`'e satir eklenir.
  Yeni IPC alani icin `ipc/index.ts`'e tek satir eklenir.
- **Arayuz ayrimi:** bir modul ihtiyaci kadarini alir (`SecretReader`, `AdapterSource`, `TerminalEventSink`,
  `ScriptTarget`, `Logger`). Sinifin tamami gecirilmez.
- **Bagimlilik tersine cevrimi:** `new` cagrilari `services.ts` icinde toplanir; siniflar bagimliligini
  yapicidan alir (varsayilanlarla, boylece testte sahtesi verilebilir).
- **Renderer:** bilesenler gorunumden sorumludur. Yan etki ve kural hook/modul icine tasinir
  (`useNetworkOperations`, `useSessionSecrets`, `useYamlEditor`, `commandTargets.ts`, `terminalTabs.ts`).
- Ayni kural iki yerde yazilmaz: IPv4/maske hesabi `src/shared/net.ts`, dosya adi/slug `src/shared/projectYaml.ts`.

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
6. YAML dosya agaci: proje dizinleri, sessions/commands dosyalari, CodeMirror editor, komut surusu calistirma (tamamlandi)
7. Yapisal duzen: main ve renderer'in SOLID'e gore ayristirilmasi, ortak yardimcilarin `shared` altina alinmasi (tamamlandi)
