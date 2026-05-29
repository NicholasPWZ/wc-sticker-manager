#!/bin/bash
# Run as root on the Rocky Linux server
set -e

APP_DIR=/opt/album
APP_USER=album

echo "==> Installing system packages"
dnf install -y python3 python3-pip nginx git

echo "==> Creating app user"
useradd -r -s /bin/false $APP_USER || true

echo "==> Copying app files"
mkdir -p $APP_DIR
cp -r ./* $APP_DIR/
chown -R $APP_USER:$APP_USER $APP_DIR

echo "==> Setting up Python virtual environment"
python3 -m venv $APP_DIR/venv
$APP_DIR/venv/bin/pip install --upgrade pip -q
$APP_DIR/venv/bin/pip install -r $APP_DIR/requirements.txt -q

echo "==> Installing systemd service"
cp $APP_DIR/deploy/album.service /etc/systemd/system/album.service
echo ""
echo "  !! Edit SECRET_KEY in /etc/systemd/system/album.service before starting !!"
echo ""

echo "==> Installing nginx config"
cp $APP_DIR/deploy/nginx.conf /etc/nginx/conf.d/album.conf
echo "  !! Edit server_name in /etc/nginx/conf.d/album.conf !!"

echo "==> Opening firewall"
firewall-cmd --permanent --add-service=http
firewall-cmd --reload

echo "==> Enabling services"
systemctl daemon-reload
systemctl enable album
systemctl enable --now nginx

echo ""
echo "Done! Next steps:"
echo "  1. Edit SECRET_KEY: nano /etc/systemd/system/album.service"
echo "  2. Edit server_name: nano /etc/nginx/conf.d/album.conf"
echo "  3. Start the app:   systemctl start album"
echo "  4. Check status:    systemctl status album"
echo "  5. View logs:       journalctl -u album -f"
