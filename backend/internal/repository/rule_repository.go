package repository

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/firewall-manager/backend/internal/models"
)

type RuleRepository interface {
	List() ([]*models.Rule, error)
	GetByID(id string) (*models.Rule, error)
	Create(rule *models.Rule) error
	Update(rule *models.Rule) error
	Delete(id string) error
}

type sqliteRuleRepository struct {
	db *sql.DB
}

func NewRuleRepository(db *sql.DB) RuleRepository {
	return &sqliteRuleRepository{db: db}
}

func (r *sqliteRuleRepository) List() ([]*models.Rule, error) {
	rows, err := r.db.Query(`
		SELECT id, chain, protocol, src, dst, src_port, dst_port,
		       action, enabled, comment, position, created_at, updated_at
		FROM rules
		ORDER BY position ASC, created_at ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []*models.Rule
	for rows.Next() {
		rule := &models.Rule{}
		var enabled int
		err := rows.Scan(
			&rule.ID, &rule.Chain, &rule.Protocol,
			&rule.Src, &rule.Dst, &rule.SrcPort, &rule.DstPort,
			&rule.Action, &enabled, &rule.Comment,
			&rule.Position, &rule.CreatedAt, &rule.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		rule.Enabled = enabled == 1
		rules = append(rules, rule)
	}
	return rules, rows.Err()
}

func (r *sqliteRuleRepository) GetByID(id string) (*models.Rule, error) {
	rule := &models.Rule{}
	var enabled int
	err := r.db.QueryRow(`
		SELECT id, chain, protocol, src, dst, src_port, dst_port,
		       action, enabled, comment, position, created_at, updated_at
		FROM rules WHERE id = ?
	`, id).Scan(
		&rule.ID, &rule.Chain, &rule.Protocol,
		&rule.Src, &rule.Dst, &rule.SrcPort, &rule.DstPort,
		&rule.Action, &enabled, &rule.Comment,
		&rule.Position, &rule.CreatedAt, &rule.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("rule not found: %s", id)
	}
	if err != nil {
		return nil, err
	}
	rule.Enabled = enabled == 1
	return rule, nil
}

func (r *sqliteRuleRepository) Create(rule *models.Rule) error {
	enabled := 0
	if rule.Enabled {
		enabled = 1
	}
	_, err := r.db.Exec(`
		INSERT INTO rules (id, chain, protocol, src, dst, src_port, dst_port,
		                   action, enabled, comment, position, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		rule.ID, rule.Chain, rule.Protocol,
		rule.Src, rule.Dst, rule.SrcPort, rule.DstPort,
		rule.Action, enabled, rule.Comment,
		rule.Position, rule.CreatedAt, rule.UpdatedAt,
	)
	return err
}

func (r *sqliteRuleRepository) Update(rule *models.Rule) error {
	enabled := 0
	if rule.Enabled {
		enabled = 1
	}
	rule.UpdatedAt = time.Now()
	result, err := r.db.Exec(`
		UPDATE rules
		SET chain=?, protocol=?, src=?, dst=?, src_port=?, dst_port=?,
		    action=?, enabled=?, comment=?, position=?, updated_at=?
		WHERE id=?
	`,
		rule.Chain, rule.Protocol,
		rule.Src, rule.Dst, rule.SrcPort, rule.DstPort,
		rule.Action, enabled, rule.Comment,
		rule.Position, rule.UpdatedAt, rule.ID,
	)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("rule not found: %s", rule.ID)
	}
	return nil
}

func (r *sqliteRuleRepository) Delete(id string) error {
	result, err := r.db.Exec(`DELETE FROM rules WHERE id = ?`, id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("rule not found: %s", id)
	}
	return nil
}