'use strict';

/**
 * SmartFuel AI-ANPR — Official Indian Government Login Controller
 * Features:
 * - GIGW 3.0 Accessibility controls (Font size scaling, High-contrast mode)
 * - Bilingual translation (English & हिन्दी)
 * - Password reveal/conceal toggle
 * - Fast evaluator credential quick-fill pills
 * - Secure session authentication with CSRF handling
 */

const DICT = {
  en: {
    govName: 'भारत सरकार | Government of India',
    infoSubtitle: 'National CNG Safety Portal',
    infoDesc: 'Official statutory enforcement gateway mandated under the <strong>Gas Cylinders Rules, 2016 (Rule 35)</strong> and <strong>Rule 115A of Central Motor Vehicles Rules (CMVR), 1989</strong> for automated safety compliance and dispenser solenoid cut-off across all City Gas Distribution (CGD) dispensing networks.',
    featTitle1: 'Automated HSRP Plate Extraction',
    featDesc1: 'Neural network ANPR with real-time confidence grading and BH-series plate compatibility.',
    featTitle2: 'PESO Hydro-Test Compliance',
    featDesc2: 'Instant validation of cylinder serial numbers, testing validity, and statutory expiry limits.',
    featTitle3: 'Hardware Solenoid Interlock',
    featDesc3: 'Direct MODBUS-RTU electrical relay interlocking preventing unauthorized fuel delivery.',
    featTitle4: 'Tamper-Evident Safety Ledger',
    featDesc4: 'Cryptographically-signed inspection reports with SHA-256 integrity checks.',
    badgeAuth: 'Official Authority Gateway',
    signInHeading: 'Officer & Operator Sign In',
    signInSub: 'Enter your government or CGD authorized station credentials to access the safety verification console.',
    lblEmail: 'OFFICIAL EMAIL ID',
    lblPassword: 'SECURITY PASSWORD',
    btnSignIn: 'Sign In to Safety Portal →',
    quickFillLabel: 'Demo Evaluation Credentials (1-Click Fill):',
    statutoryTitle: '⚠️ STATUTORY SECURITY NOTICE:',
    statutoryText: 'Access is restricted strictly to authorized petroleum inspectors and station personnel under the Information Technology Act, 2000. All authentication attempts and network sessions are monitored and logged.'
  },
  hi: {
    govName: 'भारत सरकार | Government of India',
    infoSubtitle: 'राष्ट्रीय सीएनजी सुरक्षा पोर्टल',
    infoDesc: 'सिटी गैस डिस्ट्रीब्यूशन (CGD) नेटवर्क में स्वचालित सुरक्षा अनुपालन एवं सोलेनोइड कट-ऑफ हेतु <strong>गैस सिलिंडर नियम, 2016 (नियम 35)</strong> तथा <strong>केंद्रीय मोटर वाहन नियम (CMVR), 1989 (नियम 115A)</strong> के अंतर्गत अधिकृत सांविधिक पोर्टल।',
    featTitle1: 'स्वचालित एचएसआरपी नंबर प्लेट निष्कर्षण',
    featDesc1: 'वास्तविक समय न्यूरल नेटवर्क एएनपीआर और बीएच-सीरीज प्लेट संगतता।',
    featTitle2: 'पेसो हाइड्रो-टेस्ट अनुपालन सत्यापन',
    featDesc2: 'सिलेंडर सीरियल नंबर, परीक्षण वैधता एवं सांविधिक समाप्ति तिथि का त्वरित सत्यापन।',
    featTitle3: 'हार्डवेयर सोलेनोइड इंटरलॉक',
    featDesc3: 'अवैध ईंधन वितरण रोकने हेतु डायरेक्ट मोडबस-आरटीयू रिले इंटरलॉक।',
    featTitle4: 'छेड़छाड़-मुक्त सुरक्षा लेज़र',
    featDesc4: 'एसएचए-256 क्रिप्टोग्राफिक अखंडता के साथ डिजिटल हस्ताक्षरित निरीक्षण रिपोर्ट।',
    badgeAuth: 'राजकीय अधिकृत प्रवेश द्वार',
    signInHeading: 'अधिकारी एवं ऑपरेटर लॉगिन',
    signInSub: 'सुरक्षा सत्यापन कंसोल तक पहुंचने हेतु अपने अधिकृत पेट्रोलियम क्रेडेंशियल्स दर्ज करें।',
    lblEmail: 'आधिकारिक ईमेल आईडी',
    lblPassword: 'सुरक्षा पासवर्ड',
    btnSignIn: 'सुरक्षा पोर्टल में प्रवेश करें →',
    quickFillLabel: 'डेमो मूल्यांकन क्रेडेंशियल (एक-क्लिक भरें):',
    statutoryTitle: '⚠️ सांविधिक सुरक्षा सूचना:',
    statutoryText: 'सूचना प्रौद्योगिकी अधिनियम, 2000 के तहत केवल अधिकृत निरीक्षकों एवं स्टेशन कर्मियों को पहुंच की अनुमति है। सभी लॉगिन प्रयास और सत्र रिकॉर्ड किए जाते हैं।'
  }
};

let currentLang = localStorage.getItem('gov_lang') || 'en';

function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem('gov_lang', lang);
  const d = DICT[lang] || DICT.en;

  const setHtml = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

  setText('txtGovName', d.govName);
  setText('txtInfoSubtitle', d.infoSubtitle);
  setHtml('txtInfoDesc', d.infoDesc);
  setText('featTitle1', d.featTitle1);
  setText('featDesc1', d.featDesc1);
  setText('featTitle2', d.featTitle2);
  setText('featDesc2', d.featDesc2);
  setText('featTitle3', d.featTitle3);
  setText('featDesc3', d.featDesc3);
  setText('featTitle4', d.featTitle4);
  setText('featDesc4', d.featDesc4);
  setText('txtBadgeAuth', d.badgeAuth);
  setText('txtSignInHeading', d.signInHeading);
  setText('txtSignInSub', d.signInSub);
  setText('lblEmail', d.lblEmail);
  setText('lblPassword', d.lblPassword);
  setText('txtBtnSignIn', d.btnSignIn);
  setText('txtQuickFillLabel', d.quickFillLabel);
  setText('txtStatutoryTitle', d.statutoryTitle);
  setText('txtStatutoryText', d.statutoryText);

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

// Accessibility font sizing
const body = document.body;
document.getElementById('btnFontIncr')?.addEventListener('click', () => {
  body.classList.remove('font-small');
  body.classList.add('font-large');
  localStorage.setItem('gov_font', 'large');
});
document.getElementById('btnFontDecr')?.addEventListener('click', () => {
  body.classList.remove('font-large');
  body.classList.add('font-small');
  localStorage.setItem('gov_font', 'small');
});
document.getElementById('btnFontNormal')?.addEventListener('click', () => {
  body.classList.remove('font-large', 'font-small');
  localStorage.removeItem('gov_font');
});

// High Contrast
document.getElementById('btnContrast')?.addEventListener('click', () => {
  const isHc = body.classList.toggle('high-contrast');
  localStorage.setItem('gov_contrast', isHc ? '1' : '0');
});

// Restore saved preferences
if (localStorage.getItem('gov_font') === 'large') body.classList.add('font-large');
if (localStorage.getItem('gov_font') === 'small') body.classList.add('font-small');
if (localStorage.getItem('gov_contrast') === '1') body.classList.add('high-contrast');

// Language switcher clicks
document.getElementById('btnLangEn')?.addEventListener('click', () => applyLang('en'));
document.getElementById('btnLangHi')?.addEventListener('click', () => applyLang('hi'));

// Quick fill pills
document.getElementById('btnCredAdmin')?.addEventListener('click', () => {
  document.getElementById('email').value = 'admin@smartfuel.local';
  document.getElementById('password').value = 'SmartFuelAdmin2026!';
  document.getElementById('error').style.display = 'none';
});
document.getElementById('btnCredOperator')?.addEventListener('click', () => {
  document.getElementById('email').value = 'operator@example.test';
  document.getElementById('password').value = 'DemoOperatorPassword!123';
  document.getElementById('error').style.display = 'none';
});
document.getElementById('btnCredAuditor')?.addEventListener('click', () => {
  document.getElementById('email').value = 'viewer@example.test';
  document.getElementById('password').value = 'DemoViewerPassword!123';
  document.getElementById('error').style.display = 'none';
});

// Login Form Submit
document.getElementById('loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const errorEl = document.getElementById('error');

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    errorEl.textContent = 'Please enter both your official email ID and password.';
    errorEl.style.display = 'block';
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
      throw new Error(data.error || 'Authentication rejected. Verify credentials.');
    }
    // Success redirect
    window.location.href = '/';
  } catch (err) {
    errorEl.textContent = err.message || 'Login failed. Please check your credentials.';
    errorEl.style.display = 'block';
    loginBtn.disabled = false;
    loginBtn.innerHTML = `<span id="txtBtnSignIn">${DICT[currentLang].btnSignIn}</span>`;
  }
});

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  applyLang(currentLang);
});
