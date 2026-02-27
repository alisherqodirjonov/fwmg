package repository

import (
	"database/sql"
	"time"

	"github.com/firewall-manager/backend/internal/models"
	"github.com/google/uuid"
)

type ConfigRepository interface {
	Get() (*models.FirewallConfig, error)
	Update(cfg *models.FirewallConfig) error
}

type configRepository struct {
	db *sql.DB
}

func NewConfigRepository(db *sql.DB) ConfigRepository {
	return &configRepository{db: db}
}

func (r *configRepository) Get() (*models.FirewallConfig, error) {
	row := r.db.QueryRow(`
		SELECT id, ip_forwarding, nat_enabled, created_at, updated_at
		FROM firewall_config
		LIMIT 1
	`)

	cfg := &models.FirewallConfig{}
	err := row.Scan(&cfg.ID, &cfg.IPForwarding, &cfg.NATEnabled, &cfg.CreatedAt, &cfg.UpdatedAt)
	if err == sql.ErrNoRows {
		// Create default config
		cfg = &models.FirewallConfig{
			ID:           uuid.New().String(),
			IPForwarding: false,
			NATEnabled:   false,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}
		if err := r.Update(cfg); err != nil {
			return nil, err
		}
		return cfg, nil
	}
	return cfg, err
}

func (r *configRepository) Update(cfg *models.FirewallConfig) error {
	cfg.UpdatedAt = time.Now()
	_, err := r.db.Exec(`
		INSERT INTO firewall_config (id, ip_forwarding, nat_enabled, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			ip_forwarding = excluded.ip_forwarding,
			nat_enabled = excluded.nat_enabled,
			updated_at = excluded.updated_at
	`, cfg.ID, cfg.IPForwarding, cfg.NATEnabled, cfg.CreatedAt, cfg.UpdatedAt)
	return err
}

// InterfaceRepository manages network interfaces
type InterfaceRepository interface {
	List() ([]*models.NetworkInterface, error)
	Get(id string) (*models.NetworkInterface, error)
	Create(iface *models.NetworkInterface) error
	Update(iface *models.NetworkInterface) error
	Delete(id string) error
}

type interfaceRepository struct {
	db *sql.DB
}

func NewInterfaceRepository(db *sql.DB) InterfaceRepository {
	return &interfaceRepository{db: db}
}

func (r *interfaceRepository) List() ([]*models.NetworkInterface, error) {
	rows, err := r.db.Query(`
		SELECT id, name, zone, enabled, notes, created_at, updated_at
		FROM network_interfaces
		ORDER BY name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var interfaces []*models.NetworkInterface
	for rows.Next() {
		iface := &models.NetworkInterface{}
		if err := rows.Scan(&iface.ID, &iface.Name, &iface.Zone, &iface.Enabled, &iface.Notes, &iface.CreatedAt, &iface.UpdatedAt); err != nil {
			return nil, err
		}
		interfaces = append(interfaces, iface)
	}
	return interfaces, rows.Err()
}

func (r *interfaceRepository) Get(id string) (*models.NetworkInterface, error) {
	row := r.db.QueryRow(`
		SELECT id, name, zone, enabled, notes, created_at, updated_at
		FROM network_interfaces
		WHERE id = ?
	`, id)

	iface := &models.NetworkInterface{}
	err := row.Scan(&iface.ID, &iface.Name, &iface.Zone, &iface.Enabled, &iface.Notes, &iface.CreatedAt, &iface.UpdatedAt)
	return iface, err
}

func (r *interfaceRepository) Create(iface *models.NetworkInterface) error {
	_, err := r.db.Exec(`
		INSERT INTO network_interfaces (id, name, zone, enabled, notes, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, iface.ID, iface.Name, iface.Zone, iface.Enabled, iface.Notes, iface.CreatedAt, iface.UpdatedAt)
	return err
}

func (r *interfaceRepository) Update(iface *models.NetworkInterface) error {
	iface.UpdatedAt = time.Now()
	_, err := r.db.Exec(`
		UPDATE network_interfaces
		SET name = ?, zone = ?, enabled = ?, notes = ?, updated_at = ?
		WHERE id = ?
	`, iface.Name, iface.Zone, iface.Enabled, iface.Notes, iface.UpdatedAt, iface.ID)
	return err
}

func (r *interfaceRepository) Delete(id string) error {
	_, err := r.db.Exec(`DELETE FROM network_interfaces WHERE id = ?`, id)
	return err
}

// ZoneRepository manages firewall zones
type ZoneRepository interface {
	List() ([]*models.Zone, error)
	Get(id string) (*models.Zone, error)
	Create(zone *models.Zone) error
	Update(zone *models.Zone) error
	Delete(id string) error
}

type zoneRepository struct {
	db *sql.DB
}

func NewZoneRepository(db *sql.DB) ZoneRepository {
	return &zoneRepository{db: db}
}

func (r *zoneRepository) List() ([]*models.Zone, error) {
	rows, err := r.db.Query(`
		SELECT id, name, description, target, in_policy, out_policy, created_at, updated_at
		FROM zones
		ORDER BY name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var zones []*models.Zone
	for rows.Next() {
		zone := &models.Zone{}
		if err := rows.Scan(&zone.ID, &zone.Name, &zone.Description, &zone.Target, &zone.InPolicy, &zone.OutPolicy, &zone.CreatedAt, &zone.UpdatedAt); err != nil {
			return nil, err
		}
		zones = append(zones, zone)
	}
	return zones, rows.Err()
}

func (r *zoneRepository) Get(id string) (*models.Zone, error) {
	row := r.db.QueryRow(`
		SELECT id, name, description, target, in_policy, out_policy, created_at, updated_at
		FROM zones
		WHERE id = ?
	`, id)

	zone := &models.Zone{}
	err := row.Scan(&zone.ID, &zone.Name, &zone.Description, &zone.Target, &zone.InPolicy, &zone.OutPolicy, &zone.CreatedAt, &zone.UpdatedAt)
	return zone, err
}

func (r *zoneRepository) Create(zone *models.Zone) error {
	_, err := r.db.Exec(`
		INSERT INTO zones (id, name, description, target, in_policy, out_policy, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, zone.ID, zone.Name, zone.Description, zone.Target, zone.InPolicy, zone.OutPolicy, zone.CreatedAt, zone.UpdatedAt)
	return err
}

func (r *zoneRepository) Update(zone *models.Zone) error {
	zone.UpdatedAt = time.Now()
	_, err := r.db.Exec(`
		UPDATE zones
		SET name = ?, description = ?, target = ?, in_policy = ?, out_policy = ?, updated_at = ?
		WHERE id = ?
	`, zone.Name, zone.Description, zone.Target, zone.InPolicy, zone.OutPolicy, zone.UpdatedAt, zone.ID)
	return err
}

func (r *zoneRepository) Delete(id string) error {
	_, err := r.db.Exec(`DELETE FROM zones WHERE id = ?`, id)
	return err
}

// NATRuleRepository manages NAT rules
type NATRuleRepository interface {
	List() ([]*models.NATRule, error)
	Get(id string) (*models.NATRule, error)
	Create(rule *models.NATRule) error
	Update(rule *models.NATRule) error
	Delete(id string) error
}

type natRuleRepository struct {
	db *sql.DB
}

func NewNATRuleRepository(db *sql.DB) NATRuleRepository {
	return &natRuleRepository{db: db}
}

func (r *natRuleRepository) List() ([]*models.NATRule, error) {
	rows, err := r.db.Query(`
		SELECT id, name, type, protocol, in_interface, out_interface, source_ip, source_port,
		       dest_ip, dest_port, natto_ip, natto_port, comment, enabled, position,
		       created_at, updated_at
		FROM nat_rules
		ORDER BY position
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []*models.NATRule
	for rows.Next() {
		rule := &models.NATRule{}
		if err := rows.Scan(&rule.ID, &rule.Name, &rule.Type, &rule.Protocol, &rule.InInterface,
			&rule.OutInterface, &rule.SourceIP, &rule.SourcePort, &rule.DestIP, &rule.DestPort,
			&rule.NATtoIP, &rule.NATtoPort, &rule.Comment, &rule.Enabled, &rule.Position,
			&rule.CreatedAt, &rule.UpdatedAt); err != nil {
			return nil, err
		}
		rules = append(rules, rule)
	}
	return rules, rows.Err()
}

func (r *natRuleRepository) Get(id string) (*models.NATRule, error) {
	row := r.db.QueryRow(`
		SELECT id, name, type, protocol, in_interface, out_interface, source_ip, source_port,
		       dest_ip, dest_port, natto_ip, natto_port, comment, enabled, position,
		       created_at, updated_at
		FROM nat_rules
		WHERE id = ?
	`, id)

	rule := &models.NATRule{}
	err := row.Scan(&rule.ID, &rule.Name, &rule.Type, &rule.Protocol, &rule.InInterface,
		&rule.OutInterface, &rule.SourceIP, &rule.SourcePort, &rule.DestIP, &rule.DestPort,
		&rule.NATtoIP, &rule.NATtoPort, &rule.Comment, &rule.Enabled, &rule.Position,
		&rule.CreatedAt, &rule.UpdatedAt)
	return rule, err
}

func (r *natRuleRepository) Create(rule *models.NATRule) error {
	_, err := r.db.Exec(`
		INSERT INTO nat_rules (id, name, type, protocol, in_interface, out_interface, source_ip, source_port,
			dest_ip, dest_port, natto_ip, natto_port, comment, enabled, position, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, rule.ID, rule.Name, rule.Type, rule.Protocol, rule.InInterface, rule.OutInterface,
		rule.SourceIP, rule.SourcePort, rule.DestIP, rule.DestPort, rule.NATtoIP, rule.NATtoPort,
		rule.Comment, rule.Enabled, rule.Position, rule.CreatedAt, rule.UpdatedAt)
	return err
}

func (r *natRuleRepository) Update(rule *models.NATRule) error {
	rule.UpdatedAt = time.Now()
	_, err := r.db.Exec(`
		UPDATE nat_rules
		SET name = ?, type = ?, protocol = ?, in_interface = ?, out_interface = ?,
		    source_ip = ?, source_port = ?, dest_ip = ?, dest_port = ?, natto_ip = ?,
		    natto_port = ?, comment = ?, enabled = ?, position = ?, updated_at = ?
		WHERE id = ?
	`, rule.Name, rule.Type, rule.Protocol, rule.InInterface, rule.OutInterface,
		rule.SourceIP, rule.SourcePort, rule.DestIP, rule.DestPort, rule.NATtoIP,
		rule.NATtoPort, rule.Comment, rule.Enabled, rule.Position, rule.UpdatedAt, rule.ID)
	return err
}

func (r *natRuleRepository) Delete(id string) error {
	_, err := r.db.Exec(`DELETE FROM nat_rules WHERE id = ?`, id)
	return err
}
