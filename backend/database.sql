-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  username VARCHAR(100) UNIQUE NOT NULL,
  steam_id VARCHAR(100),
  profile_picture VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create maps table
CREATE TABLE maps (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  image_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create utility_points table
CREATE TABLE utility_points (
  id SERIAL PRIMARY KEY,
  map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  utility_type VARCHAR(50),
  team VARCHAR(10) DEFAULT 't',
  x FLOAT,
  y FLOAT,
  description TEXT,
  video_url VARCHAR(255),
  image_url VARCHAR(255),
  zoom_in_image_url TEXT,
  zoom_out_image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create suggestions table
CREATE TABLE suggestions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  map_id INTEGER REFERENCES maps(id),
  utility_type VARCHAR(50),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create clips table
CREATE TABLE clips (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  map_id INTEGER REFERENCES maps(id),
  utility_type VARCHAR(50),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  file_path VARCHAR(255) NOT NULL,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create comments table
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  clip_id INTEGER REFERENCES clips(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample maps
INSERT INTO maps (name, image_url) VALUES ('dust II', '/images/dust2.jpg');
INSERT INTO maps (name, image_url) VALUES ('Mirage', '/images/mirage.jpg');
INSERT INTO maps (name, image_url) VALUES ('Inferno', '/images/inferno.jpg');
INSERT INTO maps (name, image_url) VALUES ('Ancient', '/images/ancient.jpg');
INSERT INTO maps (name, image_url) VALUES ('Nuke', '/images/nuke.jpg');
INSERT INTO maps (name, image_url) VALUES ('Train', '/images/train.jpg');
INSERT INTO maps (name, image_url) VALUES ('Overpass', '/images/overpass.jpg');
INSERT INTO maps (name, image_url) VALUES ('Anubis', '/images/anubis.jpg');
INSERT INTO maps (name, image_url) VALUES ('Vertigo', '/images/vertigo.jpg');
INSERT INTO maps (name, image_url) VALUES ('Office', '/images/office.jpg');
INSERT INTO maps (name, image_url) VALUES ('Italy', '/images/italy.jpg');
INSERT INTO maps (name, image_url) VALUES ('Cache', '/images/cache.jpg');
INSERT INTO maps (name, image_url) VALUES ('Cobblestone', '/images/cobblestone.jpg');
-- Added new maps (competitive + wingman)
INSERT INTO maps (name) SELECT 'Boulder' WHERE NOT EXISTS (SELECT 1 FROM maps WHERE lower(name) = lower('Boulder'));
INSERT INTO maps (name) SELECT 'Fachwerk' WHERE NOT EXISTS (SELECT 1 FROM maps WHERE lower(name) = lower('Fachwerk'));
INSERT INTO maps (name) SELECT 'Shelter' WHERE NOT EXISTS (SELECT 1 FROM maps WHERE lower(name) = lower('Shelter'));
INSERT INTO maps (name) SELECT 'El Dorado Wingman' WHERE NOT EXISTS (SELECT 1 FROM maps WHERE lower(name) = lower('El Dorado Wingman'));
INSERT INTO maps (name) SELECT 'Debris Wingman' WHERE NOT EXISTS (SELECT 1 FROM maps WHERE lower(name) = lower('Debris Wingman'));
-- Set category 'Mode Competitive' for specific maps if column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='maps' AND column_name='category') THEN
    UPDATE maps SET category = 'Mode Competitive' WHERE lower(name) IN ('fachwerk','shelter','boulder');
  END IF;
END
$$;
