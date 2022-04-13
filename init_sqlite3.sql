CREATE TABLE IF NOT EXISTS config (
    name TEXT PRIMARY KEY,
    val TEXT
);

CREATE TABLE IF NOT EXISTS cached_stream_info (
    video_link TEXT PRIMARY KEY,
    status INT,
    title TEXT,
    thumbnail TEXT,
    start_time INT,
    members_only INT,
    type INT,
    last_check_time INT
);

CREATE TABLE IF NOT EXISTS vod (
    video_link TEXT PRIMARY KEY,
    title TEXT,
    thumbnail TEXT,
    uploaded_date INT,
    length_seconds INT,
    members_only INT,
    _last_valid INT
);
