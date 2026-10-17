#!/usr/bin/env node
// Repository source is data: never import it, install dependencies, or run project commands.
import {readdir, readFile, realpath, stat, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const SKIP = new Set(['node_modules', '.git', '.next', '.expo', '.gradle', '.build', '.secrets', 'pods', 'build', 'dist', 'out', 'coverage', 'vendor', 'generated', 'docs', 'documentation', 'test', 'tests', '__tests__', '__mocks__', 'fixtures', 'examples', 'samples', 'demo', 'demos', 'integrations', 'automation']);
const LIMITS = {files: 5000, bytesPerFile: 1048576, totalBytes: 16777216, depth: 12};
const SOURCE = /\.(?:[cm]?[jt]sx?|html?|swift|kt|kts|java|gradle|dart|json|plist|pbxproj|resolved|ya?ml)$|(?:^|\/)(?:Podfile|Package\.swift)$/i;
const SECRET = /(?:^|\/)(?:\.env(?:\..*)?|credentials[^/]*|service[-_]?account[^/]*|.*\.(?:p8|p12|pem|key|keystore))$/i;
const GENERATED = /(?:\.(?:test|spec)\.[^/]+$|\.min\.[jt]s$|(?:^|\/)analytics-preflight\.mjs$|(?:^|\/)(?:gameHtml|.*\.generated|.*\.g)\.[^.]+$|(?:^|\/)(?:package-lock|pnpm-lock|yarn\.lock)|(?:^|\/)(?:README|CHANGELOG|LICENSE))/i;
const slash = value => value.split(path.sep).join('/');
const inside = (file, dir) => dir === '.' || file.startsWith(`${dir}/`);
const base = file => path.posix.dirname(file);
const unique = values => [...new Set(values)].sort();

// Preserve string literals (IDs and import specifiers), removing prose in code comments.
function uncomment(source) {
  source = source.replace(/<!--[\s\S]*?-->/g, '');
  let output = '', quote = '', escaped = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i], n = source[i + 1];
    if (quote) { output += c; if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === quote) quote = ''; continue; }
    if ('"\'`'.includes(c)) { quote = c; output += c; continue; }
    if (c === '/' && n === '/') { while (i < source.length && source[i] !== '\n') i++; output += '\n'; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++; i++; output += ' '; continue; }
    output += c;
  }
  return output;
}

async function inventory(root) {
  const files = [], skipped = [], errors = []; let count = 0, bytes = 0, truncated = false;
  async function walk(dir, depth) {
    if (depth > LIMITS.depth) { truncated = true; return; }
    for (const entry of (await readdir(path.join(root, dir), {withFileTypes: true})).sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = slash(path.join(dir, entry.name));
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) { if (!SKIP.has(entry.name.toLowerCase()) && !entry.name.startsWith('.')) await walk(rel, depth + 1); continue; }
      if (!entry.isFile() || !SOURCE.test(rel) || SECRET.test(rel) || GENERATED.test(rel) || path.resolve(root, rel) === fileURLToPath(import.meta.url)) continue;
      if (count++ >= LIMITS.files) { truncated = true; return; }
      const info = await stat(path.join(root, rel));
      if (info.size > LIMITS.bytesPerFile || bytes + info.size > LIMITS.totalBytes) { skipped.push(rel); truncated = true; continue; }
      bytes += info.size;
      const raw = await readFile(path.join(root, rel), 'utf8');
      if (raw.includes('\0')) continue;
      const record = {path: rel, text: uncomment(raw)};
      if (/\/(?:package|app|google-services)\.json$|^(?:package|app|google-services)\.json$/.test(rel)) {
        try { record.json = JSON.parse(raw); } catch { errors.push({path: rel, code: 'invalid_json'}); }
      }
      files.push(record);
    }
  }
  await walk('.', 0);
  return {files, scope: {filesRead: files.length, bytesRead: bytes, truncated, skippedPaths: skipped, limits: LIMITS}, errors};
}

function discover(files) {
  const candidates = new Map();
  const add = (root, type, evidence) => { if (!candidates.has(root)) candidates.set(root, {root, type, discoveryPaths: []}); candidates.get(root).discoveryPaths.push(evidence); };
  for (const file of files) {
    if (path.posix.basename(file.path) === 'package.json' && file.json) {
      const deps = {...file.json.dependencies, ...file.json.devDependencies};
      const scripts = Object.values(file.json.scripts || {}).filter(v => typeof v === 'string').join(' ');
      if (deps.expo || deps['react-native']) add(base(file.path), 'react_native', file.path);
      else if (deps.next || deps.vite || /(?:^|\s)(?:next|vite)(?:\s|$)/.test(scripts)) add(base(file.path), 'web', file.path);
    }
    if (file.path.endsWith('pubspec.yaml') && /^\s*flutter\s*:\s*$/m.test(file.text)) add(base(file.path), 'flutter', file.path);
    if (/^(?:.*\/)?project\.ya?ml$/.test(file.path) && /^targets:\s*$/m.test(file.text) && /^\s+type:\s*["']?application["']?\s*(?:#.*)?$/m.test(file.text) && /^\s+platform:\s*["']?iOS["']?\s*(?:#.*)?$/m.test(file.text)) add(base(file.path), 'ios', file.path);
  }
  for (const file of files) {
    const native = file.path.match(/^(?:(.*)\/)?[^/]+\.xcodeproj\/project\.pbxproj$/);
    if (native && ![...candidates.values()].some(c => ['react_native', 'flutter'].includes(c.type) && inside(file.path, c.root))) add(native[1] || '.', 'ios', file.path);
    if (/^(?:.*\/)?(?:build\.gradle(?:\.kts)?)$/.test(file.path) && /(?:id\s*\(?\s*["']com\.android\.application["']|apply\s+plugin:\s*["']com\.android\.application)/.test(file.text)) {
      if (![...candidates.values()].some(c => ['react_native', 'flutter'].includes(c.type) && inside(file.path, c.root))) add(base(file.path), 'android', file.path);
    }
  }
  for (const file of files.filter(f => f.path.endsWith('.swift') && /(?:@main\s+(?:(?:public|internal|final|private)\s+)*(?:struct|class)\s+\w+\s*:\s*[^{}\n]*(?:\bApp\b|\bUIApplicationDelegate\b)|@UIApplicationMain\b)/.test(f.text))) {
    if (![...candidates.values()].some(c => ['ios', 'react_native', 'flutter'].includes(c.type) && inside(file.path, c.root))) add(base(file.path), 'ios', file.path);
  }
  // Discover parent sites first so nested company/product pages do not become apps.
  for (const file of files.filter(f => path.posix.basename(f.path) === 'index.html').sort((a, b) => a.path.split('/').length - b.path.split('/').length || a.path.localeCompare(b.path))) {
    if (![...candidates.values()].some(c => inside(file.path, c.root))) add(base(file.path), 'web', file.path);
  }
  return [...candidates.values()].sort((a, b) => a.root.localeCompare(b.root));
}

function auditApp(app, files, apps) {
  const own = files.filter(f => inside(f.path, app.root) && !apps.some(other => other !== app && inside(other.root, app.root) && inside(f.path, other.root)));
  const source = own.filter(f => /\.(?:[cm]?[jt]sx?|html?|swift|kt|java|dart)$/.test(f.path));
  const paths = (pattern, entries = source) => entries.filter(f => pattern.test(f.text)).map(f => f.path);
  const depPaths = name => own.filter(f => path.posix.basename(f.path) === 'package.json' && f.json && (Object.hasOwn(f.json.dependencies || {}, name) || Object.hasOwn(f.json.devDependencies || {}, name))).map(f => f.path);
  const manifestPaths = pattern => paths(pattern, own.filter(f => /(?:Package\.swift|Podfile|\.pbxproj|\.resolved|\.gradle(?:\.kts)?|pubspec\.yaml)$/.test(f.path)));
  const sdk = unique([...depPaths('firebase'), ...depPaths('@react-native-firebase/analytics'), ...manifestPaths(/(?:FirebaseAnalytics(?:Core|WithoutAdIdSupport)?|firebase-analytics|firebase_analytics\s*:)/)]);
  const imported = paths(/(?:from\s*["']firebase\/analytics["']|from\s*["']@react-native-firebase\/analytics["']|import\s+FirebaseAnalytics\b|import\s+com\.google\.firebase\.analytics\b|package:firebase_analytics\/)/);
  const directWeb = paths(/gtag\s*\(\s*["']config["']\s*,\s*(?:["'`]G-[A-Z0-9]{6,}["'`]|(?:process\.env\.|import\.meta\.env\.)?(?:[A-Z_]*(?:GA4|GA_MEASUREMENT|GOOGLE_ANALYTICS|GA_ID)[A-Z_]*|measurementId|gaId|ga4Id|googleAnalyticsId)\b)/);
  const tagLoader = paths(/(?:googletagmanager\.com\/gtag\/js|from\s*["']@next\/third-parties\/google["'][\s\S]*<GoogleAnalytics\b[^>]*\bgaId\s*=)/);
  const initialized = unique([...paths(/(?:\b(?:getAnalytics|initializeAnalytics)\s*\(|FirebaseApp\.configure\s*\(|FirebaseAnalytics\.(?:getInstance|instance)|\banalytics\s*\(\s*\)\s*\.\s*(?:logEvent|logScreenView|setAnalyticsCollectionEnabled)|\blogEvent\s*\(\s*getAnalytics\s*\()/), ...directWeb]);
  const configured = unique([
    ...own.filter(f => f.path.endsWith('GoogleService-Info.plist') && ['GOOGLE_APP_ID', 'PROJECT_ID', 'BUNDLE_ID', 'API_KEY'].every(key => f.text.includes(`<key>${key}</key>`))).map(f => f.path),
    ...own.filter(f => f.path.endsWith('google-services.json') && f.json?.project_info?.project_id && Array.isArray(f.json?.client) && f.json.client.some(c => c.client_info?.mobilesdk_app_id && c.client_info?.android_client_info?.package_name)).map(f => f.path),
    ...paths(/(?:["'`]G-[A-Z0-9]{6,}["'`]|measurementId\s*:\s*["'`]G-[A-Z0-9]{6,}["'`])/),
    ...paths(/Firebase\.initializeApp\s*\([\s\S]{0,300}options\s*:\s*DefaultFirebaseOptions/),
  ]);
  const references = unique(paths(/(?:NEXT_PUBLIC_(?:GA|GOOGLE_ANALYTICS)|VITE_(?:GA|GOOGLE_ANALYTICS)|(?:GA4|GA_MEASUREMENT|GOOGLE_ANALYTICS)_ID|googleServicesFile|GoogleService-Info\.plist|google-services\.json|firebaseConfig)/, own));
  const nextTag = paths(/from\s*["']@next\/third-parties\/google["'][\s\S]*<GoogleAnalytics\b[^>]*\bgaId\s*=/);
  const gaPresent = sdk.length > 0 || imported.length > 0 || directWeb.length > 0 || nextTag.length > 0;
  const gaReady = (sdk.length > 0 && imported.length > 0 && initialized.length > 0 || directWeb.length > 0 && tagLoader.length > 0 || nextTag.length > 0 && depPaths('@next/third-parties').length > 0) && configured.length > 0;
  const ga = {status: gaReady ? 'detected_static' : gaPresent ? (initialized.length || nextTag.length ? 'needs_configuration' : 'needs_initialization') : 'missing', sdkPaths: unique([...sdk, ...tagLoader]), importPaths: imported, initializationPaths: unique([...initialized, ...nextTag]), configurationPaths: configured, configurationReferencePaths: references, runtimeVerified: false};
  function service(name, packages, manifests, imports, usage, automatic = false) {
    const dependencyPaths = unique([...packages.flatMap(depPaths), ...manifestPaths(manifests)]), importPaths = paths(imports), usagePaths = paths(usage);
    const automaticReady = automatic && configured.length > 0 && (initialized.length > 0 || app.type === 'react_native');
    return {name, status: dependencyPaths.length ? ((importPaths.length && usagePaths.length || automaticReady) ? 'detected_static' : automatic ? 'needs_configuration' : 'needs_initialization') : importPaths.length || usagePaths.length ? 'source_hint' : 'missing', dependencyPaths, importPaths, usagePaths, runtimeVerified: false};
  }
  const crashes = [
    service('Firebase Crashlytics', ['@react-native-firebase/crashlytics'], /(?:FirebaseCrashlytics|firebase-crashlytics|firebase_crashlytics\s*:)/, /(?:FirebaseCrashlytics|@react-native-firebase\/crashlytics|firebase_crashlytics\/|com\.google\.firebase\.crashlytics)/, /(?:Crashlytics\.crashlytics\s*\(|crashlytics\s*\(\s*\)|FirebaseCrashlytics\.instance)/, true),
    service('Sentry', ['@sentry/nextjs', '@sentry/react', '@sentry/react-native', '@sentry/browser', '@sentry/vue'], /(?:Sentry|sentry_flutter\s*:|sentry-android)/, /(?:from\s*["']@sentry\/|import\s+Sentry|package:sentry_flutter\/|import\s+io\.sentry)/, /(?:Sentry\.init\s*\(|SentrySDK\.start\s*\(|SentryFlutter\.init\s*\()/),
  ];
  const adMob = service('AdMob', ['react-native-google-mobile-ads'], /(?:GoogleMobileAds|Google-Mobile-Ads-SDK|play-services-ads|google_mobile_ads\s*:)/, /(?:react-native-google-mobile-ads|import\s+GoogleMobileAds|com\.google\.android\.gms\.ads|package:google_mobile_ads\/)/, /(?:mobileAds\s*\(\s*\)\s*\.initialize|GADMobileAds\.sharedInstance\s*\(\s*\)\.start|MobileAds\.(?:initialize|instance\.initialize)|(?:BannerAd|InterstitialAd|RewardedAd)\.(?:createForAdRequest|load)|BannerAd\s*\()/);
  const adSensePaths = paths(/(?:pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js|\badsbygoogle\s*\.push\s*\()/);
  const conversionPaths = paths(/(?:gtag\s*\(\s*["'](?:config["']\s*,\s*["']AW-|event["']\s*,\s*["']conversion)|\bfbq\s*\(\s*["'](?:init|track)|connect\.facebook\.net\/[^\s"']*fbevents\.js)/);
  const otherAnalytics = [service('Mixpanel', ['mixpanel-browser', 'mixpanel-react-native'], /(?:Mixpanel|mixpanel_flutter\s*:)/, /(?:mixpanel-browser|mixpanel-react-native|api\.mixpanel\.com\/track|import\s+Mixpanel|package:mixpanel_flutter\/)/, /(?:mixpanel\.init\s*\(|Mixpanel\.initialize\s*\(|Mixpanel\.init\s*\(|api\.mixpanel\.com\/track)/)];
  const recommendations = [];
  if (!gaReady) recommendations.push({code: 'ga4_setup', priority: 'recommended', message: app.type === 'web' ? 'このアプリ専用のGA4プロパティ・Webストリームを対応付け、GoogleタグまたはFirebase Analyticsの設定と初期化を整えてください。' : 'このアプリ専用のFirebaseプロジェクト・GA4プロパティと正式なBundle ID／パッケージ名を対応付け、対象プラットフォームのAnalytics SDK・設定・初期化を整えてください。'});
  recommendations.push({code: 'verify_events', priority: 'verify', message: '静的検出だけでは計測成功を判断できません。画面表示・主要操作・初回説明完了などの実装箇所と重複送信を確認し、DebugViewと実機で受信を検証してください。'});
  if (crashes.every(s => s.status === 'missing')) recommendations.push({code: 'crash_reporting', priority: 'consider', message: 'クラッシュ・例外の把握が必要なら、CrashlyticsまたはSentryなどから用途に合うものを一つ検討してください。全サービスの導入は不要です。'});
  recommendations.push({code: 'monetization_choice', priority: 'consider', message: app.type === 'web' ? '広告で収益化する場合はAdSense等の広告枠、広告出稿する場合はGoogle Ads／Meta等の成果計測を別々に検討してください。' : '広告で収益化する場合はAdMob等の広告枠・テスト広告・同意状態と広告収益イベント、課金する場合は購入・復元と売上連携を検討してください。'});
  if (otherAnalytics.some(s => s.status !== 'missing')) recommendations.push({code: 'existing_analytics', priority: 'verify', message: '既存の分析実装があります。GA4追加時は役割・イベント定義・二重送信を確認してください。'});
  if (gaPresent || otherAnalytics.some(s => s.status !== 'missing') || adMob.status !== 'missing' || adSensePaths.length || conversionPaths.length) {
    recommendations.push({code: 'privacy_and_consent', priority: 'verify', message: '採用する分析・広告の実際の収集内容に合わせてプライバシーポリシー、必要な同意設定、ストアの申告を公開前に照合してください。'});
    recommendations.push({code: 'development_and_production', priority: 'verify', message: '開発・検証と本番の設定を分け、テスト操作が本番の分析値や広告成果に混ざらないことを確認してください。'});
  }
  if (adMob.status !== 'missing' || adSensePaths.length) recommendations.push({code: 'advertising_publisher_file', priority: 'verify', message: adSensePaths.length ? '採用するWeb広告サービスの案内に従い、公開サイトのads.txtとパブリッシャーIDを確認してください。' : 'AdMobのapp-ads.txt、開発者サイトURL、アプリ所有確認・配信準備状況を確認してください。'});
  return {...app, discoveryPaths: unique(app.discoveryPaths), analytics: {ga4: ga, other: otherAnalytics}, crashReporting: crashes, advertising: {monetization: [adMob, {name: 'AdSense', status: adSensePaths.length ? 'source_hint' : 'missing', usagePaths: adSensePaths, runtimeVerified: false}], conversion: {status: conversionPaths.length ? 'source_hint' : 'missing', usagePaths: conversionPaths, runtimeVerified: false}}, recommendations};
}

export async function audit(root = process.cwd()) {
  const absolute = await realpath(path.resolve(root)), data = await inventory(absolute), apps = discover(data.files);
  return {schemaVersion: 1, auditStatus: data.errors.length ? 'invalid_configuration' : data.scope.truncated ? 'incomplete' : 'completed', applicationStatus: apps.length ? 'applications_detected' : 'no_application_detected', staticAnalysisOnly: true, generatedAt: new Date().toISOString(), scope: data.scope, errors: data.errors, policy: {propertyIsolation: '独立したアプリはFirebaseプロジェクトとGA4プロパティを分け、共通のGAアカウントで管理します。同一製品のWeb／iOS／Androidを同じプロパティに置く場合は製品単位で明示し、ストリームを分けます。', excluded: '依存物・ビルド成果物・生成物・文書・テスト・秘密設定・シンボリックリンクを除外。アプリのコード・依存インストール・ネットワーク通信は実行しません。', limitation: '静的な手掛かりです。環境変数の値、外部サービスの登録・権限・広告審査、イベント受信、公開状態は検証していません。'}, apps: apps.map(app => auditApp(app, data.files, apps))};
}

export function markdown(report) {
  const label = value => ({detected_static: '実装の手掛かりあり', source_hint: 'ソースの手掛かりあり', missing: '未検出', needs_configuration: '設定要確認', needs_initialization: '初期化要確認'}[value] || value);
  const safe = value => String(value).replace(/[|<>\r\n]/g, ' ');
  const lines = ['# 分析・広告の公開前確認', '', `監査状態: ${report.auditStatus}。静的分析のみで、実際の受信・配信は未検証です。`, '', report.policy.propertyIsolation, '', report.policy.limitation, ''];
  if (!report.apps.length) lines.push('対応するアプリを検出しませんでした。ライブラリ・サーバーのみのリポジトリ、または今回の検出範囲外の構成の可能性があります。', '');
  for (const app of report.apps) {
    lines.push(`## ${safe(app.root)} (${safe(app.type)})`, '', '| 項目 | 検出結果 |', '| --- | --- |', `| GA4 / Firebase Analytics | ${label(app.analytics.ga4.status)} |`, ...app.crashReporting.map(s => `| ${s.name} | ${label(s.status)} |`), ...app.advertising.monetization.map(s => `| 広告収益: ${s.name} | ${label(s.status)} |`), `| 広告出稿の成果計測 | ${label(app.advertising.conversion.status)} |`, '', ...app.recommendations.map(r => `- ${r.message}`), '', `確認した入口: ${app.discoveryPaths.map(safe).join(', ')}`, '');
  }
  if (report.scope.truncated) lines.push('ファイル数・サイズ・階層の上限に達したため、検出範囲は不完全です。', '');
  if (report.errors.length) lines.push('構文を読めなかった設定ファイル:', ...report.errors.map(e => `- ${safe(e.path)} (${e.code})`), '');
  return lines.join('\n');
}

async function main(args) {
  let root = process.cwd(), output, md, strict = false, rootSet = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--strict') strict = true;
    else if (['--output', '--markdown'].includes(args[i])) { const flag = args[i], value = args[++i]; if (!value || value.startsWith('--')) throw new Error('invalid_arguments'); if (flag === '--output') output = value; else md = value; }
    else if (!args[i].startsWith('-') && !rootSet) { root = args[i]; rootSet = true; }
    else throw new Error('invalid_arguments');
  }
  const report = await audit(root);
  const save = async (file, content) => { await mkdir(path.dirname(path.resolve(file)), {recursive: true}); await writeFile(file, content); };
  if (output) await save(output, `${JSON.stringify(report, null, 2)}\n`);
  if (md) await save(md, markdown(report));
  console.log(`Analytics preflight: ${report.auditStatus}; applications=${report.apps.length}; static analysis only.`);
  if (!output && !md) console.log(JSON.stringify(report, null, 2));
  if (strict && report.errors.length) process.exitCode = 1;
}

if (process.argv[1] && await realpath(process.argv[1]).catch(() => '') === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch(() => { console.error('Analytics preflight failed: invalid arguments, unreadable path, or scanner I/O error. No repository content was printed.'); process.exitCode = 1; });
