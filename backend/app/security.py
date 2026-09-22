import os
import base64
import hashlib
import secrets
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from .config import settings

def get_encryption_key() -> bytes:
    # Derive a 32-byte key from ENCRYPTION_KEY env var
    password = settings.encryption_key.encode()
    salt = b'philip-linkedin-agent-salt'  # Fixed salt for MVP, use random per token in production
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(password))
    return key

def encrypt_token(token: str) -> str:
    try:
        f = Fernet(get_encryption_key())
        encrypted = f.encrypt(token.encode())
        return encrypted.decode()
    except Exception as e:
        print(f"Encryption error: {e}")
        return token  # Fallback, should not happen in prod

def decrypt_token(encrypted_token: str) -> str:
    try:
        f = Fernet(get_encryption_key())
        decrypted = f.decrypt(encrypted_token.encode())
        return decrypted.decode()
    except Exception as e:
        print(f"Decryption error: {e}")
        return encrypted_token

def generate_state() -> str:
    return secrets.token_urlsafe(32)

def hash_draft(draft_text: str, recipient: str, purpose: str) -> str:
    # Bind approval to exact draft text + recipient + purpose
    data = f"{draft_text}|{recipient}|{purpose}"
    return hashlib.sha256(data.encode()).hexdigest()

def is_safe_redirect_uri(uri: str, allowed_uris: list) -> bool:
    return uri in allowed_uris
