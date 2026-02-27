package repository

import (
	"database/sql"
	"fmt"

	_ "github.com/mattn/go-sqlite3"
)

func NewSQLiteDB(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", fmt.Sprintf("%s?_journal_mode=WAL&_foreign_keys=on", path))
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1) // SQLite is single-writer
	return db, nil
}

func Migrate(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS rules (
			id          TEXT PRIMARY KEY,
			chain       TEXT NOT NULL,
			protocol    TEXT NOT NULL DEFAULT 'all',
			src         TEXT NOT NULL DEFAULT '',
			dst         TEXT NOT NULL DEFAULT '',
			src_port    TEXT NOT NULL DEFAULT '',
			dst_port    TEXT NOT NULL DEFAULT '',
			action      TEXT NOT NULL,
			enabled     INTEGER NOT NULL DEFAULT 1,
			comment     TEXT NOT NULL DEFAULT '',
			position    INTEGER NOT NULL DEFAULT 0,
			created_at  DATETIME NOT NULL,
			updated_at  DATETIME NOT NULL
		);

		CREATE TABLE IF NOT EXISTS history (
			id          TEXT PRIMARY KEY,
			snapshot    TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			applied_at  DATETIME NOT NULL
		);

		CREATE TABLE IF NOT EXISTS firewall_config (
			id              TEXT PRIMARY KEY,
			ip_forwarding   INTEGER NOT NULL DEFAULT 0,
			nat_enabled     INTEGER NOT NULL DEFAULT 0,
			created_at      DATETIME NOT NULL,
			updated_at      DATETIME NOT NULL
		);

		CREATE TABLE IF NOT EXISTS network_interfaces (
			id          TEXT PRIMARY KEY,
			name        TEXT NOT NULL UNIQUE,
			zone        TEXT NOT NULL DEFAULT 'public',
			enabled     INTEGER NOT NULL DEFAULT 1,
			notes       TEXT NOT NULL DEFAULT '',
			created_at  DATETIME NOT NULL,
			updated_at  DATETIME NOT NULL
		);

		CREATE TABLE IF NOT EXISTS zones (
			id          TEXT PRIMARY KEY,
			name        TEXT NOT NULL UNIQUE,
			description TEXT NOT NULL DEFAULT '',
			target      TEXT NOT NULL DEFAULT 'REJECT',
			in_policy   TEXT NOT NULL DEFAULT 'REJECT',
			out_policy  TEXT NOT NULL DEFAULT 'ACCEPT',
			created_at  DATETIME NOT NULL,
			updated_at  DATETIME NOT NULL
		);

		CREATE TABLE IF NOT EXISTS nat_rules (
			id              TEXT PRIMARY KEY,
			name            TEXT NOT NULL,
			type            TEXT NOT NULL,
			protocol        TEXT NOT NULL DEFAULT 'all',
			in_interface    TEXT NOT NULL DEFAULT '',
			out_interface   TEXT NOT NULL DEFAULT '',
			source_ip       TEXT NOT NULL DEFAULT '',
			source_port     TEXT NOT NULL DEFAULT '',
			dest_ip         TEXT NOT NULL DEFAULT '',
			dest_port       TEXT NOT NULL DEFAULT '',
			natto_ip        TEXT NOT NULL DEFAULT '',
			natto_port      TEXT NOT NULL DEFAULT '',
			comment         TEXT NOT NULL DEFAULT '',
			enabled         INTEGER NOT NULL DEFAULT 1,
			position        INTEGER NOT NULL DEFAULT 0,
			created_at      DATETIME NOT NULL,
			updated_at      DATETIME NOT NULL
		);
	`)
	return err
}
