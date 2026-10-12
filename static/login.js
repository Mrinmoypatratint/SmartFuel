'use strict';

/**
 * SmartFuel AI-ANPR — Official Government Portal Authentication Controller
 * Specs:
 * - High-trust Navy & Gold color structure (Indian Navy layout standard)
 * - Dynamic security CAPTCHA generator & validator
 * - Pure Petroleum & PESO statutory compliance terminology (Zero defence text)
 * - GIGW 3.0 accessibility font scaling & high-contrast mode
 * - 1-Click fast evaluation credential autofill
 */

const DICT = {
  en: {
    govName: 'भारत सरकार | Government of India',
    branch: 'पेट्रोलियम एवं प्राकृतिक गैस मंत्रालय • PESO | MINISTRY OF PETROLEUM & NATURAL GAS',
    portalTitle: 'SmartFuel AI-ANPR',
    portalSub: 'National Automated CNG Safety Verification & Solenoid Hardware Interlock Gateway',
    mottoHindi: 'सत्यमेव जयते',
    mottoSub: 'GAS CYLINDERS RULES, 2016 • CMVR 1989 COMPLIANT',
    ticker: 'Mandatory HSRP ANPR verification & solenoid fuel-lock enforced under Rule 35, Gas Cylinders Rules 2016 and CMVR 1989 Rule 115A across all dispensing islands.',
    directivesHeader: 'महत्वपूर्ण निर्देश एवं सुरक्षा मानक | OFFICIAL DIRECTIVES',
    mandateBanner: '<strong>STATUTORY MANDATE (PESO / MoRTH / CGD NETWORKS):</strong> Automated verification is legally mandated to prevent catastrophic onboard high-pressure cylinder ruptures. Fuel dispensing is automatically locked for unauthorized or expired vehicles.',
    dirTitle1: 'Neural HSRP Computer Vision ANPR',
    dirDesc1: 'Sub-second optical plate recognition compatible with standard state plates and BH-series Bharat registration numbers.',
    dirTitle2: 'PESO Hydro-Test Compliance Lock',
    dirDesc2: 'Zero-tolerance automated interlock: immediate dispensing lockout if cylinder hydro-test certificate exceeds 3-year statutory limit.',
    dirTitle3: 'MODBUS-RTU Hardware Interlock',
    dirDesc3: 'Sub-100ms hardware electrical relay cut-off switch wired directly into dispenser solenoid valves.',
    dirTitle4: 'Cryptographic SHA-256 Safety Ledger',
    dirDesc4: 'Immutable cryptographic audit records of all inspection decisions, timestamps, and operator actions.',
    authBadge: 'STATUTORY SAFETY GATEWAY',
    signInHeading: 'अधिकारी / ऑपरेटर लॉगिन | Officer Sign In',
    signInSub: 'Enter your official registered credentials to access the safety verification console.',
    lblEmail: 'OFFICIAL SERVICE EMAIL ID',
    lblPassword: 'SECURITY PASSWORD',
    captchaTitle: 'SECURITY CAPTCHA VERIFICATION',
    btnSignIn: 'सुरक्षित लॉगिन करें | SECURE SIGN IN →',
    quickCreds: 'Demo Evaluation Credentials (1-Click Fill):',
    secTitle: '⚠️ STATUTORY REGULATORY NOTICE:',
    secText: 'This is a protected Government of India safety console. Authorized operator access only under the Gas Cylinders Rules 2016 (Rule 35) and Sections 43 & 66 of the Information Technology Act, 2000. All activities and network IPs are monitored and logged.'
  },
  hi: {
    govName: 'भारत सरकार | Government of India',
    branch: 'पेट्रोलियम एवं प्राकृतिक गैस मंत्रालय • PESO | MINISTRY OF PETROLEUM & NATURAL GAS',
    portalTitle: 'SmartFuel AI-ANPR',
    portalSub: 'राष्ट्रीय स्वचालित सीएनजी सुरक्षा सत्यापन एवं सोलेनोइड हार्डवेयर इंटरलॉक गेटवे',
    mottoHindi: 'सत्यमेव जयते',
    mottoSub: 'गैस सिलिंडर नियम 2016 • सीएमवीआर 1989 अनुपालन',
    ticker: 'गैस सिलिंडर नियम 2016 (नियम 35) एवं सीएमवीआर 1989 (नियम 115A) के तहत सभी सीएनजी आइलैंड्स पर एचएसआरपी एएनपीआर सत्यापन एवं सोलेनोइड कट-ऑफ अनिवार्य है।',
    directivesHeader: 'महत्वपूर्ण निर्देश एवं सुरक्षा मानक | OFFICIAL DIRECTIVES',
    mandateBanner: '<strong>सांविधिक अधिदेश (पेसो / सड़क परिवहन मंत्रालय / सीजीडी नेटवर्क):</strong> ऑनबोर्ड उच्च दबाव सिलेंडर विस्फोट को रोकने हेतु स्वचालित सत्यापन अनिवार्य है। गैर-अनुपालन वाले वाहनों के लिए ईंधन वितरण तुरंत बंद हो जाता है।',
    dirTitle1: 'न्यूरल एचएसआरपी कंप्यूटर विजन एएनपीआर',
    dirDesc1: 'मानक राज्य नंबर प्लेट एवं बीएच-श्रृंखला भारत पंजीकरण हेतु तीव्र ऑप्टिकल पहचान।',
    dirTitle2: 'पेसो हाइड्रो-टेस्ट अनुपालन इंटरलॉक',
    dirDesc2: 'शून्य-सहनशीलता स्वचालित इंटरलॉक: यदि सिलेंडर परीक्षण 3 वर्ष से पुराना है तो त्वरित वितरण निषेध।',
    dirTitle3: 'मोडबस-आरटीयू हार्डवेयर इंटरलॉक',
    dirDesc3: 'डिस्पेंसर सोलेनोइड वाल्व में सीधे जुड़े सब-100 मिलीसेकंड हार्डवेयर रिले कट-ऑफ स्विच।',
    dirTitle4: 'क्रिप्टोग्राफिक एसएचए-256 सुरक्षा लेज़र',
    dirDesc4: 'सभी निरीक्षण निर्णयों, समय और ऑपरेटर कार्रवाइयों का अपरिवर्तनीय डिजिटल रिकॉर्ड।',
    authBadge: 'सांविधिक सुरक्षा अधिकृत प्रवेश द्वार',
    signInHeading: 'अधिकारी / ऑपरेटर लॉगिन | Officer Sign In',
    signInSub: 'सुरक्षा कंसोल तक पहुंचने हेतु अपना आधिकारिक सेवा पहचान पत्र एवं पासवर्ड दर्ज करें।',
    lblEmail: 'आधिकारिक सेवा ईमेल आईडी',
    lblPassword: 'सुरक्षा पासवर्ड',
    captchaTitle: 'सुरक्षा कैप्चा सत्यापन',
    btnSignIn: 'सुरक्षित लॉगिन करें | SECURE SIGN IN →',
    quickCreds: 'डेमो मूल्यांकन क्रेडेंशियल (एक-क्लिक भरें):',
    secTitle: '⚠️ सांविधिक सुरक्षा चेतावनी:',
    secText: 'यह भारत सरकार का संरक्षित सुरक्षा कंसोल है। गैस सिलिंडर नियम 2016 (नियम 35) तथा आईटी अधिनियम 2000 के तहत अनाधिकृत पहुंच दंडनीय अपराध है। सभी गतिविधियां और आईपी लॉग की जाती हैं।'
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
});
document.getElementById('btnCredOperator')?.addEventListener('click', () => {
  document.getElementById('email').value = 'operator@example.test';
  document.getElementById('password').value = 'DemoOperatorPassword!123';
  document.getElementById('captchaInput').value = currentCaptcha;
  const err = document.getElementById('error');
  if (err) err.style.display = 'none';
});
document.getElementById('btnCredAuditor')?.addEventListener('click', () => {
  document.getElementById('email').value = 'viewer@example.test';
  document.getElementById('password').value = 'DemoViewerPassword!123';
  document.getElementById('captchaInput').value = currentCaptcha;
  const err = document.getElementById('error');
  if (err) err.style.display = 'none';
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

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  generateCaptcha();
  applyLang(currentLang);
});
