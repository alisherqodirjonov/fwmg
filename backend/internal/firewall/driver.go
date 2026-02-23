package firewall

import "github.com/firewall-manager/backend/internal/models"

// FirewallDriver is the abstraction over the underlying firewall engine.
// Implementations must be atomic — partial application must not occur.
type FirewallDriver interface {
	// Load reads the current live ruleset from the kernel.
	Load() (string, error)

	// Apply atomically replaces the kernel ruleset with the provided rules.
	// It translates the Rule slice to iptables format and uses iptables-restore.
	Apply(rules []*models.Rule) error

	// GetCounters returns per-chain/rule packet and byte counters.
	GetCounters() ([]*models.Counter, error)
}