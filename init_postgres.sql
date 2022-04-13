CREATE TABLE IF NOT EXISTS config (
    name TEXT PRIMARY KEY,
    val TEXT
);

CREATE TABLE IF NOT EXISTS cached_stream_info (
    video_link TEXT PRIMARY KEY,
    status INT,
    title TEXT,
    thumbnail TEXT,
    start_time DOUBLE PRECISION,
    members_only BOOLEAN,
    type INT,
    last_check_time DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS vod (
    video_link TEXT PRIMARY KEY,
    title TEXT,
    thumbnail TEXT,
    uploaded_date DOUBLE PRECISION,
    length_seconds INT,
    members_only BOOLEAN,
    _last_valid DOUBLE PRECISION,
    _seq INT
);
