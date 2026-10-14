'use strict';

/**
 * SmartFuel — Commercial Enterprise Portal Authentication Controller
 * Specs:
 * - Private commercial enterprise project branding (Zero government text)
 * - Auto-slidable professional full-screen background carousel
 * - Dynamic security CAPTCHA generator & validator
 * - GIGW/Enterprise accessibility font scaling & high-contrast mode
 * - 1-Click fast evaluation credential autofill
 */

const DICT = {
  en: {
    govName: 'SmartFuel Technologies',
    ministryTop: 'Enterprise CNG Station Automation & Safety Platform',
    branch: 'SMARTFUEL TECHNOLOGIES • ENTERPRISE SAFETY SOLUTIONS',
    portalTitle: 'SmartFuel | CNG Station Automation & Safety Portal',
    portalSub: 'Automated Vehicle Inspection, Hardware Solenoid Interlock & Station Management Platform',
    mottoHindi: 'सुरक्षा एवं स्वचालन',
    mottoSub: 'ISO 27001 CERTIFIED • HIGH-AVAILABILITY CLOUD',
    ticker: 'Real-time camera optical scanning verifies vehicle registration and cylinder authorization before nozzle release.',
    directivesHeader: 'ऑपरेटर निर्देश एवं सुरक्षा मानक | OPERATIONAL DIRECTIVES',
    mandateBanner: '<strong>SAFETY DIRECTIVE & OPERATING MANDATE:</strong> Automated vehicle validation is mandatory across all CGD dispensing points to prevent high-pressure onboard cylinder incidents. The smart dispenser interlock automatically blocks fueling for unverified, missing, or expired cylinder certificates.',
    dirTitle1: 'Optical Plate Recognition & Vehicle Verification',
    dirDesc1: 'Sub-second optical plate capture validates vehicle credentials against authorized databases before fuel nozzle unlocking.',
    dirTitle2: 'Cylinder Hydro-Test Validity Interlock',
    dirDesc2: 'Zero-tolerance automated interlock: immediate dispensing lockout if cylinder hydro-test certificate exceeds the standard 3-year cycle.',
    dirTitle3: 'MODBUS-RTU Hardware Dispenser Interlock',
    dirDesc3: 'Sub-100ms hardware electrical relay cut-off switch wired directly into dispenser solenoid valves for instantaneous fuel cutoff.',
    dirTitle4: 'Cryptographic Electronic Safety Ledger (SHA-256)',
    dirDesc4: 'Immutable audit logs of all fueling sessions, safety decisions, administrator timestamps, and dispenser telemetry.',
    authBadge: 'ENTERPRISE SECURE CONSOLE',
    signInHeading: 'व्यवस्थापक लॉगिन | Administrator Sign In',
    signInSub: 'Enter your administrator credentials to access the station safety management console.',
    lblEmail: 'OFFICIAL SERVICE EMAIL ID / उपयोगकर्ता आईडी',
    lblPassword: 'SECURITY PASSWORD / सुरक्षा पासवर्ड',
    captchaTitle: 'SECURITY CAPTCHA VERIFICATION / सुरक्षा कोड',
    btnSignIn: 'सुरक्षित लॉगिन करें | SECURE SIGN IN →',
    quickCreds: 'मूल्यांकन हेतु त्वरित क्रेडेंशियल (Demo Fill):',
    secTitle: '⚠️ गोपनीय सूचना / SECURITY POLICY NOTICE:',
    secText: 'This is a protected enterprise safety console. Authorized administrator access only. All user sessions, activities, and network IP addresses are monitored and logged for security compliance.'
  },
  hi: {
    govName: 'स्मार्टफ्यूल टेक्नोलॉजीज',
    ministryTop: 'एंटरप्राइज सीएनजी स्टेशन ऑटोमेशन एवं सुरक्षा प्लेटफॉर्म',
    branch: 'स्मार्टफ्यूल टेक्नोलॉजीज • एंटरप्राइज सुरक्षा समाधान',
    portalTitle: 'स्मार्टफ्यूल | सीएनजी स्टेशन ऑटोमेशन एवं सुरक्षा पोर्टल',
    portalSub: 'स्वचालित वाहन निरीक्षण, हार्डवेयर सोलेनोइड इंटरलॉक एवं स्टेशन प्रबंधन प्लेटफॉर्म',
    mottoHindi: 'सुरक्षा एवं स्वचालन',
    mottoSub: 'आईएसओ 27001 प्रमाणित • उच्च उपलब्धता क्लाउड',
    ticker: 'ऑप्टिकल कैमरा स्कैनिंग द्वारा नोजल रिलीज से पूर्व वाहन पंजीकरण एवं सिलेंडर वैधता का त्वरित सत्यापन।',
    directivesHeader: 'ऑपरेटर निर्देश एवं सुरक्षा मानक | OPERATIONAL DIRECTIVES',
    mandateBanner: '<strong>सुरक्षा निर्देश एवं परिचालन अधिदेश:</strong> ऑनबोर्ड उच्च दबाव सिलेंडर दुर्घटनाओं की रोकथाम हेतु सभी सीजीडी वितरण बिंदुओं पर स्वचालित सत्यापन अनिवार्य है। गैर-सत्यापित अथवा एक्सपायर्ड सिलेंडरों के लिए ईंधन वितरण तुरंत बंद हो जाता है।',
    dirTitle1: 'ऑप्टिकल प्लेट पहचान एवं वाहन सत्यापन',
    dirDesc1: 'ईंधन वितरण नोजल अनलॉक से पूर्व वाहन पहचान पत्र एवं पंजीकरण का तीव्र ऑप्टिकल सत्यापन।',
    dirTitle2: 'सिलेंडर हाइड्रो-परीक्षण वैधता इंटरलॉक',
    dirDesc2: 'शून्य-सहनशीलता इंटरलॉक: यदि सिलेंडर हाइड्रो-परीक्षण 3 वर्ष से अधिक पुराना है तो तत्काल ईंधन लॉक।',
    dirTitle3: 'मोडबस-आरटीयू हार्डवेयर सोलेनोइड इंटरलॉक',
    dirDesc3: 'डिस्पेंसर सोलेनोइड वाल्व में सीधे जुड़े सब-100 मिलीसेकंड रिले कट-ऑफ स्विच द्वारा आपातकालीन शट-ऑफ।',
    dirTitle4: 'क्रिप्टोग्राफिक इलेक्ट्रॉनिक सुरक्षा लेज़र (एसएचए-256)',
    dirDesc4: 'सभी ईंधन वितरण सत्रों, सुरक्षा निर्णयों और व्यवस्थापक समय का अपरिवर्तनीय डिजिटल ऑडिट रिकॉर्ड।',
    authBadge: 'एंटरप्राइज सुरक्षित कंसोल',
    signInHeading: 'व्यवस्थापक लॉगिन | Administrator Sign In',
    signInSub: 'स्टेशन सुरक्षा प्रबंधन कंसोल तक पहुंचने हेतु अपना व्यवस्थापक आईडी एवं पासवर्ड दर्ज करें।',
    lblEmail: 'आधिकारिक सेवा ईमेल आईडी / उपयोगकर्ता आईडी',
    lblPassword: 'सुरक्षा पासवर्ड / पासवर्ड',
    captchaTitle: 'सुरक्षा कैप्चा सत्यापन / सुरक्षा कोड',
    btnSignIn: 'सुरक्षित लॉगिन करें | SECURE SIGN IN →',
    quickCreds: 'मूल्यांकन हेतु त्वरित क्रेडेंशियल (Demo Fill):',
    secTitle: '⚠️ गोपनीय सूचना / SECURITY POLICY NOTICE:',
    secText: 'यह एक संरक्षित एंटरप्राइज सुरक्षा कंसोल है। केवल अधिकृत व्यवस्थापक हेतु। सुरक्षा अनुपालन के तहत सभी उपयोगकर्ता सत्र, गतिविधियां और आईपी लॉग की जाती हैं।'
  }
};

let currentLang = localStorage.getItem('navy_lang') || 'en';
let currentCaptcha = '';

// Generate alphanumeric CAPTCHA code (e.g. SF782K)
function generateCaptcha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SF';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  currentCaptcha = code;
  const display = document.getElementById('captchaDisplay');
  if (display) display.textContent = currentCaptcha;
}

function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem('navy_lang', lang);
  const d = DICT[lang] || DICT.en;

  const setHtml = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

  setText('txtGovName', d.govName);
  setText('txtMinistryTop', d.ministryTop);
  setText('txtHeaderBranch', d.branch);
  setText('txtPortalTitle', d.portalTitle);
  setText('txtPortalSub', d.portalSub);
  setText('txtTickerMessage', d.ticker);
  setText('txtDirectivesHeader', d.directivesHeader);
  setHtml('txtMandateBanner', d.mandateBanner);
  setText('dirTitle1', d.dirTitle1);
  setText('dirDesc1', d.dirDesc1);
  setText('dirTitle2', d.dirTitle2);
  setText('dirDesc2', d.dirDesc2);
  setText('dirTitle3', d.dirTitle3);
  setText('dirDesc3', d.dirDesc3);
  setText('dirTitle4', d.dirTitle4);
  setText('dirDesc4', d.dirDesc4);
  setText('txtAuthBadge', d.authBadge);
  setText('txtSignInHeading', d.signInHeading);
  setText('txtSignInSub', d.signInSub);
  setText('lblEmail', d.lblEmail);
  setText('lblPassword', d.lblPassword);
  setText('lblCaptchaTitle', d.captchaTitle);
  setText('txtBtnSignIn', d.btnSignIn);
  setText('txtQuickCreds', d.quickCreds);
  setText('txtSecNoticeTitle', d.secTitle);
  setText('txtSecNoticeText', d.secText);

  const btnEn = document.getElementById('btnLangEn');
  const btnHi = document.getElementById('btnLangHi');
  if (btnEn) btnEn.classList.toggle('active', lang === 'en');
  if (btnHi) btnHi.classList.toggle('active', lang === 'hi');
}

// Background Auto-Slider (Every 5 seconds crossfade)
function initBackgroundSlider() {
  const slides = document.querySelectorAll('.bg-slide');
  if (!slides || slides.length === 0) return;
  let currentSlide = 0;
  setInterval(() => {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
  }, 5000);
}

// Password toggle
const pwdField = document.getElementById('password');
const btnTogglePw = document.getElementById('btnTogglePassword');
if (btnTogglePw && pwdField) {
  btnTogglePw.addEventListener('click', () => {
    const isPw = pwdField.type === 'password';
    pwdField.type = isPw ? 'text' : 'password';
    btnTogglePw.textContent = isPw ? '🔒' : '👁️';
  });
}

// Refresh CAPTCHA
document.getElementById('btnRefreshCaptcha')?.addEventListener('click', () => {
  generateCaptcha();
  const cInp = document.getElementById('captchaInput');
  if (cInp) cInp.value = '';
});

// Role buttons toggle
document.querySelectorAll('.gov-role-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.gov-role-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('btnCredAdmin')?.click();
  });
});

// Accessibility font sizing
const body = document.body;
document.getElementById('btnFontIncr')?.addEventListener('click', () => {
  body.classList.remove('font-small');
  body.classList.add('font-large');
  localStorage.setItem('navy_font', 'large');
});
document.getElementById('btnFontDecr')?.addEventListener('click', () => {
  body.classList.remove('font-large');
  body.classList.add('font-small');
  localStorage.setItem('navy_font', 'small');
});
document.getElementById('btnFontNormal')?.addEventListener('click', () => {
  body.classList.remove('font-large', 'font-small');
  localStorage.removeItem('navy_font');
});

// High Contrast
document.getElementById('btnContrast')?.addEventListener('click', () => {
  const isHc = body.classList.toggle('high-contrast');
  localStorage.setItem('navy_contrast', isHc ? '1' : '0');
});

// Restore preferences
if (localStorage.getItem('navy_font') === 'large') body.classList.add('font-large');
if (localStorage.getItem('navy_font') === 'small') body.classList.add('font-small');
if (localStorage.getItem('navy_contrast') === '1') body.classList.add('high-contrast');

// Language switcher clicks
document.getElementById('btnLangEn')?.addEventListener('click', () => applyLang('en'));
document.getElementById('btnLangHi')?.addEventListener('click', () => applyLang('hi'));

// Quick fill helper pills (also autofills CAPTCHA for instantaneous evaluator sign-in)
document.getElementById('btnCredAdmin')?.addEventListener('click', () => {
  document.getElementById('email').value = 'admin@smartfuel.local';
  document.getElementById('password').value = 'SmartFuelAdmin2026!';
  document.getElementById('captchaInput').value = currentCaptcha;
  const err = document.getElementById('error');
  if (err) err.style.display = 'none';
  document.querySelectorAll('.gov-role-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('roleBtnAdmin')?.classList.add('active');
});

// Login Form Submit with CAPTCHA verification
document.getElementById('loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const captchaInput = document.getElementById('captchaInput');
  const loginBtn = document.getElementById('loginBtn');
  const errorEl = document.getElementById('error');

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const captcha = captchaInput ? captchaInput.value.trim().toUpperCase() : '';

  if (!email || !password) {
    errorEl.textContent = 'Please enter both your official service email ID and password.';
    errorEl.style.display = 'block';
    return;
  }

  // Validate CAPTCHA
  if (captcha !== currentCaptcha) {
    errorEl.textContent = 'Security CAPTCHA verification failed. Please enter the code shown in the box.';
    errorEl.style.display = 'block';
    generateCaptcha();
    if (captchaInput) captchaInput.value = '';
    return;
  }

  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span>Verifying Credentials...</span>';
  errorEl.style.display = 'none';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Authentication rejected by security server.');
    }
    // Redirect to main command dashboard
    window.location.href = '/';
  } catch (err) {
    errorEl.textContent = err.message || 'Login failed. Please check your credentials.';
    errorEl.style.display = 'block';
    loginBtn.disabled = false;
    loginBtn.innerHTML = `<span aria-hidden="true">🔒</span> <span id="txtBtnSignIn">${DICT[currentLang].btnSignIn}</span>`;
    generateCaptcha();
    if (captchaInput) captchaInput.value = '';
  }
});

// Station Showcase Carousel Logic (Auto-slide + Clickable Dots & Arrows)
function initShowcaseCarousel() {
  const slides = document.querySelectorAll('.showcase-slide');
  const dots = document.querySelectorAll('.showcase-dot');
  const prevBtn = document.getElementById('showcasePrev');
  const nextBtn = document.getElementById('showcaseNext');
  const wrap = document.querySelector('.station-showcase-wrap');
  if (!slides || slides.length === 0) return;

  let currentIdx = 0;
  let timer = null;

  function goToSlide(idx) {
    slides[currentIdx].classList.remove('active');
    if (dots[currentIdx]) dots[currentIdx].classList.remove('active');
    currentIdx = (idx + slides.length) % slides.length;
    slides[currentIdx].classList.add('active');
    if (dots[currentIdx]) dots[currentIdx].classList.add('active');
  }

  function startTimer() {
    stopTimer();
    timer = setInterval(() => {
      goToSlide(currentIdx + 1);
    }, 4500);
  }

  function stopTimer() {
    if (timer) clearInterval(timer);
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      goToSlide(i);
      startTimer();
    });
  });

  prevBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    goToSlide(currentIdx - 1);
    startTimer();
  });

  nextBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    goToSlide(currentIdx + 1);
    startTimer();
  });

  wrap?.addEventListener('mouseenter', stopTimer);
  wrap?.addEventListener('mouseleave', startTimer);

  startTimer();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  generateCaptcha();
  applyLang(currentLang);
  initBackgroundSlider();
  initShowcaseCarousel();
});
