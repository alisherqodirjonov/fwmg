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
	`)
	return err
}