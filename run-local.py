"""Local demo launcher; prompts for credentials. Binds to loopback only."""
import os, secrets, getpass
from pathlib import Path
from urllib.parse import quote
ROOT=Path(__file__).resolve().parent
print('SMARTFUEL ANPR v2 — LOCAL DEMO (not public hosting)')
print('This is a simulated hydrotesting system. No official vehicle records are accessed.\n')
email=(os.getenv('ADMIN_EMAIL') or input('Admin email (first launch: choose one): ')).strip().lower()
password=os.getenv('ADMIN_PASSWORD') or getpass.getpass('Admin password (12+ characters): ')
if len(password)<12 or '@' not in email:
    raise SystemExit('A valid email and a password of at least 12 characters are required.')
os.environ.setdefault('DATABASE_URL','sqlite:///'+str(ROOT/'storage'/'local-demo.sqlite3'))
os.environ.setdefault('DATA_DIR',str(ROOT/'storage'))
os.environ['SESSION_SECRET']=secrets.token_urlsafe(48)
os.environ['ADMIN_EMAIL']=email
os.environ['ADMIN_PASSWORD']=password
os.environ['COOKIE_SECURE']='0'
os.environ['DEMO_MODE']='1'
os.environ['SEED_DEMO']='1'
# If a local database already exists, a newly supplied bootstrap password does not reset accounts.
from app.database import Base,engine,SessionLocal,User
from app.security import check_password
Base.metadata.create_all(engine)
with SessionLocal() as db:
    existing=db.query(User).filter_by(email=email).first()
    if existing and not check_password(password,existing.password_hash):
        raise SystemExit('This email already exists. Use the password you chose on the first launch or an admin-created user.')
import uvicorn
print('\nOpen http://127.0.0.1:8765 and sign in with your chosen credentials.')
uvicorn.run('app.main:app',host='127.0.0.1',port=8765,workers=1)
