package repository

import (
	"database/sql"
	"fmt"

	"github.com/firewall-manager/backend/internal/models"
)

type HistoryRepository interface {
	Save(entry *models.HistoryEntry) error
	Latest() (*models.HistoryEntry, error)
	List(limit int) ([]*models.HistoryEntry, error)
}

type sqliteHistoryRepository struct {
	db *sql.DB
}

func NewHistoryRepository(db *sql.DB) HistoryRepository {
	return &sqliteHistoryRepository{db: db}
}

func (r *sqliteHistoryRepository) Save(entry *models.HistoryEntry) error {
	_, err := r.db.Exec(`
		INSERT INTO history (id, snapshot, description, applied_at)
		VALUES (?, ?, ?, ?)
	`, entry.ID, entry.Snapshot, entry.Description, entry.AppliedAt)
	return err
}

func (r *sqliteHistoryRepository) Latest() (*models.HistoryEntry, error) {
	entry := &models.HistoryEntry{}
	err := r.db.QueryRow(`
		SELECT id, snapshot, description, applied_at
		FROM history
		ORDER BY applied_at DESC
		LIMIT 1
	`).Scan(&entry.ID, &entry.Snapshot, &entry.Description, &entry.AppliedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("no history entries found")
	}
	return entry, err
}

func (r *sqliteHistoryRepository) List(limit int) ([]*models.HistoryEntry, error) {
	rows, err := r.db.Query(`
		SELECT id, snapshot, description, applied_at
		FROM history
		ORDER BY applied_at DESC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*models.HistoryEntry
	for rows.Next() {
		e := &models.HistoryEntry{}
		if err := rows.Scan(&e.ID, &e.Snapshot, &e.Description, &e.AppliedAt); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}