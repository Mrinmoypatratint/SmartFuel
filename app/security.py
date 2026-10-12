"""Password hashing and signed HttpOnly cookie sessions (without external authentication APIs)."""
import os, hashlib, hmac, base64, secrets
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
SESSION_SECRET=os.getenv('SESSION_SECRET','')
_signer = None

def signer():
    global _signer
    if _signer is None:
        if len(SESSION_SECRET) < 32:
            raise RuntimeError('SESSION_SECRET must be 32 or more characters; set it in the deployment .env')
        _signer = URLSafeTimedSerializer(SESSION_SECRET, salt='sf-anpr-v2-cookie')
    return _signer

def hash_password(password):
    if len(password)<12:raise ValueError('Password must be at least 12 characters')
    salt=os.urandom(16)
    derived=hashlib.pbkdf2_hmac('sha256',password.encode('utf8'),salt,310_000)
    return 'pbkdf2_sha256$310000$'+base64.b64encode(salt).decode()+'$'+base64.b64encode(derived).decode()

def check_password(password,stored):
    try:
        _,iterations,salt,expected=stored.split('$',3)
        derived=hashlib.pbkdf2_hmac('sha256',password.encode('utf8'),base64.b64decode(salt),int(iterations))
        return hmac.compare_digest(derived,base64.b64decode(expected))
    except (ValueError,TypeError):return False

def create_token(user):
    csrf=secrets.token_urlsafe(28)
    return signer().dumps({'uid':user.id,'csrf':csrf,'credential_version':hashlib.sha256(user.password_hash.encode('utf8')).hexdigest()[:24]}),csrf

def read_token(token):
    try:return signer().loads(token,max_age=8*3600)
    except (BadSignature,SignatureExpired):return None
