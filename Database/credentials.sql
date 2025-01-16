CREATE TABLE credentials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    password_hash VARCHAR(220) NOT NULL,
    file_path VARCHAR(300) NOT NULL, 
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
