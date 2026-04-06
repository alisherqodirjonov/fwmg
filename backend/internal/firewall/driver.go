package firewall

import "github.com/firewall-manager/backend/internal/models"

// FirewallDriver is the abstraction over the underlying firewall engine.
// Implementations must be atomic — partial application must not occur.
type FirewallDriver interface {
	// Load reads the current live ruleset from the kernel.
	Load() (string, error)

	// Apply atomically replaces the kernel ruleset with the provided rules.
	// It translates the Rule slice to iptables format and uses iptables-restore.
	// zones and interfaces are used to generate zone-based per-interface policies.
	// cfg and natRules are included so NAT forwarding rules and the nat table are
	// written in the same iptables-restore call as the filter table.
	Apply(rules []*models.Rule, zones []*models.Zone, interfaces []*models.NetworkInterface, cfg *models.FirewallConfig, natRules []*models.NATRule) error

	// GetCounters returns per-chain/rule packet and byte counters.
	GetCounters() ([]*models.Counter, error)

	// GetInterfaces returns a list of network interfaces.
	GetInterfaces() ([]*models.Interface, error)

	// GetInterfaceCounters returns counters for a specific interface.
	GetInterfaceCounters(iface string) (*models.InterfaceCounters, error)

	// GetChainPolicyCounters returns the global chain policy counters (INPUT, OUTPUT, FORWARD).
	GetChainPolicyCounters() (*models.InterfaceCounters, error)

	// ApplyConfig applies firewall configuration (IP forwarding, etc)
	ApplyConfig(config *models.FirewallConfig) error

	// ApplyNAT applies NAT rules
	ApplyNAT(natRules []*models.NATRule) error
}
