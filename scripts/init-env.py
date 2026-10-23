#!/usr/bin/env python3
"""Generate local credentials once. Never overwrite an existing .env."""
from pathlib import Path
import secrets
p = Path(__file__).resolve().parents[1] / '.env'
if p.exists():
    print('.env đã tồn tại, giữ nguyên cấu hình.')
else:
    with p.open('x') as f:
        f.write('\n'.join(f'{k}={v}' for k,v in {
            'MYSQL_ROOT_PASSWORD': secrets.token_hex(24),
            'MYSQL_PASSWORD': secrets.token_hex(24),
            'JWT_SECRET': secrets.token_hex(48),
            'ADMIN_USERNAME': 'admin',
            'ADMIN_PASSWORD': secrets.token_urlsafe(20),
        }.items())+'\n')
    p.chmod(0o600)
    print('Đã tạo .env với mật khẩu ngẫu nhiên. Xem ADMIN_PASSWORD tại máy của bạn để đăng nhập.')
