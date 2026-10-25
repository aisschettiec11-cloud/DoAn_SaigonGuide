-- phpMyAdmin account for the application database.
CREATE USER IF NOT EXISTS 'admin'@'%' IDENTIFIED BY 'Admin!';
ALTER USER 'admin'@'%' IDENTIFIED BY 'Admin!';
GRANT ALL PRIVILEGES ON saigon_audio_guide.* TO 'admin'@'%';
