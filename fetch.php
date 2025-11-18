<?php
/** proxy.php — Minimal CORS relay (GET/POST) with auth, allowlist, SSRF guard, rate limit **/

// ========= CONFIG =========
const APP_ORIGINS = [ 'https://cdr2.com', 'http://localhost:3000' ];

// Per-host security policy
const HOST_RULES = [
  // Greenhouse examples
  '/(^|\.)greenhouse\.io$/i' => [
    'methods' => ['GET'],
    'paths'   => ['~^/.*$~'],
  ],
  // Lever examples
  '/(^|\.)lever\.co$/i' => [
    'methods' => ['GET'],
    'paths'   => ['~^/.*$~'],
  ],
  // Indeed public endpoints (adjust as needed)
  '/(^|\.)indeed\.com$/i' => [
    'methods' => ['GET','POST'],
    'paths'   => ['~^/jobs.*$~','~^/rpc/.*$~'],
  ],
  // LinkedIn strictly limited — most useful endpoints require auth & CSRF
  '/(^|\.)linkedin\.com$/i' => [
    'methods' => ['GET','POST'],
    'paths'   => ['~^/jobs/.*$~','~^/voyager/api/.*$~'], // many will still reject w/o auth
  ],
];

const STATIC_BEARER = 'replace-with-long-random-token'; // or '' to disable
const HMAC_SECRET  = 'replace-with-32b-secret';         // or '' to disable
const MAX_BODY_BYTES = 2_000_000;   // ~2MB
const REQ_TIMEOUT    = 15;          // seconds
const PER_MIN_LIMIT  = 60;          // req/IP/min
const CORS_MAX_AGE   = 600;         // seconds

// Only these outgoing headers can be forwarded from client (via X-Fwd-*)
const SAFE_FWD_HEADERS = [
  'accept', 'accept-language', 'content-type'
];

// ========= CORS preflight =========
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  if (in_array($origin, APP_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: '.$origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, X-TS, X-Sign, X-Fwd-Accept, X-Fwd-Accept-Language, X-Fwd-Content-Type');
    header('Access-Control-Max-Age: '.CORS_MAX_AGE);
  }
  http_response_code(204); exit;
}

// ========= Helpers =========
function fail(int $code, string $msg) {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['error'=>$msg], JSON_UNESCAPED_SLASHES); exit;
}
function allow_cors($origin) {
  if (in_array($origin, APP_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: '.$origin);
    header('Vary: Origin');
  }
}
function match_host_rules(string $host) {
  foreach (HOST_RULES as $re => $rule) {
    if (preg_match($re, $host)) return $rule;
  }
  return null;
}
function is_private_ip(string $host): bool {
  $records = @dns_get_record($host, DNS_A + DNS_AAAA) ?: [];
  if (!$records) { $ip = @gethostbyname($host); $records = $ip ? [['ip'=>$ip]] : []; }
  foreach ($records as $r) {
    $ip = $r['ip'] ?? $r['ipv6'] ?? null; if (!$ip) continue;
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) return true;
  }
  return false;
}
function rate_limit_check(): void {
  $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
  $bucket = sys_get_temp_dir().'/pxrl_'.md5($ip.'_'.date('Y-m-d-H-i'));
  $n = is_file($bucket) ? (int)file_get_contents($bucket) : 0;
  if ($n >= PER_MIN_LIMIT) fail(429, 'rate_limited');
  @file_put_contents($bucket, (string)($n+1), LOCK_EX);
}
function read_limited_body(int $max): string {
  $in = fopen('php://input', 'rb');
  $buf = '';
  while (!feof($in)) {
    $chunk = fread($in, 65536);
    $buf .= $chunk;
    if (strlen($buf) > $max) fail(413, 'request_entity_too_large');
  }
  return $buf;
}
function build_forward_headers(): array {
  $out = [
    'User-Agent: JobWiz-Proxy/1.0 (+contact: you@example)',
    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
    'Accept-Language: en-US,en;q=0.8'
  ];
  foreach (SAFE_FWD_HEADERS as $h) {
    $key = 'HTTP_X_FWD_'.strtoupper(str_replace('-', '_', $h));
    if (!empty($_SERVER[$key])) $out[] = ucfirst($h).': '.$_SERVER[$key];
  }
  return $out;
}

// ========= Auth =========
$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$xts  = $_SERVER['HTTP_X_TS'] ?? '';
$xsg  = $_SERVER['HTTP_X_SIGN'] ?? '';

$authed = false;
if ($auth && str_starts_with($auth, 'Bearer ') && STATIC_BEARER !== '') {
  $authed = hash_equals(STATIC_BEARER, substr($auth, 7));
} elseif ($xts && $xsg && HMAC_SECRET !== '') {
  $url = $_GET['u'] ?? '';
  $msg = $_SERVER['REQUEST_METHOD'].'|'.$url.'|'.$xts;
  $calc = base64_encode(hash_hmac('sha256', $msg, HMAC_SECRET, true));
  $fresh = abs(time() - (int)$xts) <= 300; // ±5 min
  $authed = $fresh && hash_equals($calc, $xsg);
}
if (!$authed) fail(401, 'unauthorized');

// ========= Validate target =========
$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET','POST'], true)) fail(405, 'method_not_allowed');

$u = $_GET['u'] ?? '';
if (!$u) fail(400, 'missing_u');
$parts = parse_url($u);
if (!$parts || !isset($parts['scheme'],$parts['host'])) fail(400, 'bad_url');

$scheme = strtolower($parts['scheme']);
$host   = strtolower($parts['host']);
$path   = ($parts['path'] ?? '/');

if (!in_array($scheme, ['http','https'], true)) fail(400, 'bad_scheme');
if (is_private_ip($host)) fail(403, 'private_address_blocked');

$rule = match_host_rules($host);
if (!$rule) fail(403, 'host_not_allowed');
if (!in_array($method, $rule['methods'], true)) fail(405, 'method_not_allowed_for_host');

$path_ok = false;
foreach ($rule['paths'] as $re) { if (preg_match($re, $path)) { $path_ok = true; break; } }
if (!$path_ok) fail(403, 'path_not_allowed');

// ========= Rate limit =========
rate_limit_check();

// ========= Build request =========
$ch = curl_init($u);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => false,
  CURLOPT_FOLLOWLOCATION => false,
  CURLOPT_TIMEOUT        => REQ_TIMEOUT,
  CURLOPT_CONNECTTIMEOUT => 8,
  CURLOPT_USERAGENT      => 'JobWiz-Proxy/1.0 (+contact: you@example)',
  CURLOPT_HTTPHEADER     => build_forward_headers(),
  CURLOPT_HEADERFUNCTION => function($ch, $hdr) use (&$respCT, &$respCC) {
    $h = strtolower($hdr);
    if (str_starts_with($h, 'content-type:')) $respCT = trim(substr($hdr,13));
    if (str_starts_with($h, 'cache-control:')) $respCC = trim(substr($hdr,13));
    return strlen($hdr); // drop Set-Cookie implicitly
  },
  CURLOPT_SSL_VERIFYPEER => true,
  CURLOPT_SSL_VERIFYHOST => 2,
]);

if ($method === 'POST') {
  $ctype = $_SERVER['HTTP_X_FWD_CONTENT_TYPE'] ?? ($_SERVER['CONTENT_TYPE'] ?? '');
  $ctype = strtolower(trim(explode(';',$ctype)[0]));
  if (!in_array($ctype, ['application/json','application/x-www-form-urlencoded'], true)) {
    fail(415, 'unsupported_media_type');
  }
  $body = read_limited_body(MAX_BODY_BYTES);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
  // Ensure Content-Type is set in outgoing headers
  $hdrs = build_forward_headers();
  $hdrs[] = 'Content-Type: '.$ctype;
  curl_setopt($ch, CURLOPT_HTTPHEADER, $hdrs);
}

$buf = fopen('php://temp', 'w+');
$bytes = 0;
curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($ch, $chunk) use ($buf, &$bytes) {
  $len = strlen($chunk);
  $bytes += $len;
  if ($bytes > MAX_BODY_BYTES) return 0; // abort large
  return fwrite($buf, $chunk);
});

$ok = curl_exec($ch);
$errno = curl_errno($ch);
$http  = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// ========= Respond =========
allow_cors($origin);

if ($errno !== 0) fail(502, 'upstream_error');
if ($http >= 400) {
  // Surface upstream code but sanitize body size/type
  header('Content-Type: application/json; charset=utf-8');
  http_response_code($http);
  rewind($buf);
  $snippet = stream_get_contents($buf, 4096);
  echo json_encode(['upstream_status'=>$http,'snippet'=>substr($snippet,0,4000)]);
  exit;
}

$ct = $respCT ?? 'text/plain; charset=utf-8';
$allowedCT = ['text/html','application/json','text/plain','application/xml','text/xml'];
$ctMain = strtolower(trim(explode(';',$ct)[0]));
if (!in_array($ctMain, $allowedCT, true)) { $ct = 'text/plain; charset=utf-8'; }

header('Content-Type: '.$ct);
header('Cache-Control: '.($respCC ?? 'private, max-age=120'));
header('X-Bytes: '.$bytes);

rewind($buf);
fpassthru($buf);
