package firewall

import (
	"bytes"
	"context"
	"fmt"
	"net"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/firewall-manager/backend/internal/models"
	"github.com/sirupsen/logrus"
)

// IptablesDriver implements FirewallDriver using iptables-save and iptables-restore.
// It never constructs shell commands from user input.
type IptablesDriver struct {
	log *logrus.Logger
}

func NewIptablesDriver(log *logrus.Logger) *IptablesDriver {
	return &IptablesDriver{log: log}
}

// Load runs iptables-save and returns the current ruleset as a string.
func (d *IptablesDriver) Load() (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// exec.CommandContext with a fixed binary path — no shell interpolation.
	cmd := exec.CommandContext(ctx, "/sbin/iptables-save")
	var out, stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("iptables-save failed: %w — stderr: %s", err, stderr.String())
	}

	return out.String(), nil
}

// Apply translates rules to iptables-save format and pipes through iptables-restore.
// This is the ONLY way rules reach the kernel — atomically, with no shell.
func (d *IptablesDriver) Apply(rules []*models.Rule) error {
	ruleset := d.buildRuleset(rules)
	d.log.WithField("ruleset_lines", strings.Count(ruleset, "\n")).Debug("applying ruleset")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "/sbin/iptables-restore", "--counters")
	cmd.Stdin = strings.NewReader(ruleset)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("iptables-restore failed: %w — stderr: %s", err, stderr.String())
	}

	return nil
}

// ApplyConfig applies firewall configuration like IP forwarding
func (d *IptablesDriver) ApplyConfig(config *models.FirewallConfig) error {
	if config == nil {
		return nil
	}

	// Set IP forwarding via sysctl
	ipForwardVal := "0"
	if config.IPForwarding {
		ipForwardVal = "1"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "/sbin/sysctl", "-w", "net.ipv4.ip_forward="+ipForwardVal)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		d.log.WithError(err).WithField("value", ipForwardVal).Error("failed to set ip_forward via sysctl")
		return fmt.Errorf("failed to apply IP forwarding config: %w", err)
	}

	// Verify the setting was actually applied
	cmd = exec.CommandContext(ctx, "/sbin/sysctl", "-n", "net.ipv4.ip_forward")
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		d.log.WithError(err).Warn("failed to verify IP forwarding setting")
	} else {
		actualVal := strings.TrimSpace(out.String())
		if actualVal != ipForwardVal {
			d.log.WithFields(logrus.Fields{
				"expected": ipForwardVal,
				"actual":   actualVal,
			}).Warn("IP forwarding value mismatch after sysctl set")
		}
	}

	d.log.WithField("ip_forwarding", config.IPForwarding).Info("IP forwarding configuration applied successfully")
	return nil
}

// ApplyNAT applies NAT rules to the nat table
func (d *IptablesDriver) ApplyNAT(natRules []*models.NATRule) error {
	if len(natRules) == 0 {
		// Flush NAT rules if no rules to apply
		d.log.Debug("no NAT rules to apply, flushing nat table")
		return d.flushNATTable()
	}

	ruleset := d.buildNATRuleset(natRules)
	d.log.WithField("ruleset_lines", strings.Count(ruleset, "\n")).Debug("applying NAT ruleset")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "/sbin/iptables-restore", "--counters")
	cmd.Stdin = strings.NewReader(ruleset)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("iptables-restore for NAT failed: %w — stderr: %s", err, stderr.String())
	}

	return nil
}

// flushNATTable flushes all rules from the nat table
func (d *IptablesDriver) flushNATTable() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "/sbin/iptables", "-t", "nat", "-F")
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		d.log.WithError(err).Warn("failed to flush nat table")
		// Don't fail completely, continue
	}
	return nil
}

// buildNATRuleset produces iptables rules for the nat table
// It handles both SNAT (Source NAT - modifies source IP) and DNAT (Destination NAT - modifies dest IP):
// - SNAT rules are applied in POSTROUTING chain (outgoing packets): changes source IP before sending
// - DNAT rules are applied in PREROUTING chain (incoming packets): changes destination IP upon arrival
func (d *IptablesDriver) buildNATRuleset(natRules []*models.NATRule) string {
	var sb strings.Builder
	var snatCount, dnatCount int

	// Start nat table section
	sb.WriteString("*nat\n")
	sb.WriteString(":PREROUTING ACCEPT [0:0]\n")
	sb.WriteString(":INPUT ACCEPT [0:0]\n")
	sb.WriteString(":OUTPUT ACCEPT [0:0]\n")
	sb.WriteString(":POSTROUTING ACCEPT [0:0]\n")

	for _, nr := range natRules {
		if !nr.Enabled {
			d.log.WithFields(logrus.Fields{
				"rule_id": nr.ID,
				"name":    nr.Name,
			}).Debug("NAT rule disabled, skipping")
			continue
		}

		var chain string
		var target string

		// Determine chain and target based on NAT type
		if nr.Type == "SNAT" {
			// SNAT: Change source IP of outgoing packets in POSTROUTING
			chain = "POSTROUTING"
			target = "SNAT"
			snatCount++
		} else if nr.Type == "DNAT" {
			// DNAT: Change destination IP of incoming packets in PREROUTING
			chain = "PREROUTING"
			target = "DNAT"
			dnatCount++
		} else {
			d.log.WithFields(logrus.Fields{
				"rule_id": nr.ID,
				"name":    nr.Name,
				"type":    nr.Type,
			}).Error("invalid NAT type, must be SNAT or DNAT")
			continue
		}

		line := d.natRuleToLine(nr, chain, target)
		if line != "" {
			sb.WriteString(line)
			sb.WriteString("\n")
		} else {
			d.log.WithFields(logrus.Fields{
				"rule_id": nr.ID,
				"name":    nr.Name,
				"type":    nr.Type,
			}).Warn("failed to generate iptables rule, rule will be skipped")
		}
	}

	sb.WriteString("COMMIT\n")
	d.log.WithFields(logrus.Fields{
		"snat_rules": snatCount,
		"dnat_rules": dnatCount,
		"total":      snatCount + dnatCount,
	}).Info("NAT ruleset built successfully")
	return sb.String()
}

// natRuleToLine converts a NATRule to an iptables rule line
// Routes to specialized methods for SNAT vs DNAT
func (d *IptablesDriver) natRuleToLine(nr *models.NATRule, chain, target string) string {
	switch target {
	case "SNAT":
		return d.buildSNATRule(nr, chain)
	case "DNAT":
		return d.buildDNATRule(nr, chain)
	default:
		return ""
	}
}

// buildSNATRule creates an SNAT rule for source IP translation
// SNAT modifies the source IP of outgoing packets (POSTROUTING chain)
func (d *IptablesDriver) buildSNATRule(nr *models.NATRule, chain string) string {
	var parts []string

	parts = append(parts, "-A", chain)

	// Outgoing interface (where packets leave)
	if nr.OutInterface != "" && sanitizeInterface(nr.OutInterface) != "" {
		parts = append(parts, "-o", sanitizeInterface(nr.OutInterface))
	}

	// Protocol
	proto := sanitizeProtocol(nr.Protocol)
	if proto != "" && proto != "all" {
		parts = append(parts, "-p", proto)
	}

	// Match packets FROM this source IP
	if src := sanitizeCIDR(nr.SourceIP); src != "" {
		parts = append(parts, "-s", src)
	}

	// Match packets FROM this source port (only for TCP/UDP)
	if nr.SourcePort != "" && proto != "" && proto != "icmp" && proto != "all" {
		if port := sanitizePort(nr.SourcePort); port != "" {
			parts = append(parts, "--sport", port)
		}
	}

	// Comment
	if nr.Comment != "" {
		comment := sanitizeComment(nr.Comment)
		if comment != "" {
			parts = append(parts, "-m", "comment", "--comment", comment)
		}
	}

	// Build SNAT target (translate to new source IP)
	snatTarget := d.buildSNATTarget(nr)
	if snatTarget == "" {
		d.log.WithFields(logrus.Fields{
			"rule_id": nr.ID,
			"name":    nr.Name,
		}).Warn("SNAT rule missing target IP, skipping")
		return ""
	}

	parts = append(parts, "-j", "SNAT", "--to-source="+snatTarget)
	return strings.Join(parts, " ")
}

// buildDNATRule creates a DNAT rule for destination IP translation
// DNAT modifies the destination IP of incoming packets (PREROUTING chain)
func (d *IptablesDriver) buildDNATRule(nr *models.NATRule, chain string) string {
	var parts []string

	parts = append(parts, "-A", chain)

	// Incoming interface (where packets arrive)
	if nr.InInterface != "" && sanitizeInterface(nr.InInterface) != "" {
		parts = append(parts, "-i", sanitizeInterface(nr.InInterface))
	}

	// Protocol
	proto := sanitizeProtocol(nr.Protocol)
	if proto != "" && proto != "all" {
		parts = append(parts, "-p", proto)
	}

	// Match packets TO this destination IP
	if dst := sanitizeCIDR(nr.DestIP); dst != "" {
		parts = append(parts, "-d", dst)
	}

	// Match packets TO this destination port (only for TCP/UDP)
	if nr.DestPort != "" && proto != "" && proto != "icmp" && proto != "all" {
		if port := sanitizePort(nr.DestPort); port != "" {
			parts = append(parts, "--dport", port)
		}
	}

	// Comment
	if nr.Comment != "" {
		comment := sanitizeComment(nr.Comment)
		if comment != "" {
			parts = append(parts, "-m", "comment", "--comment", comment)
		}
	}

	// Build DNAT target (redirect to internal IP)
	dnatTarget := d.buildDNATTarget(nr)
	if dnatTarget == "" {
		d.log.WithFields(logrus.Fields{
			"rule_id": nr.ID,
			"name":    nr.Name,
		}).Warn("DNAT rule missing target IP, skipping")
		return ""
	}

	parts = append(parts, "-j", "DNAT", "--to-destination="+dnatTarget)
	return strings.Join(parts, " ")
}

// buildSNATTarget constructs the target IP:port for SNAT rules
// Returns IP[:port] for use with --to-source flag
func (d *IptablesDriver) buildSNATTarget(nr *models.NATRule) string {
	ntIP := sanitizeCIDR(nr.NATtoIP)
	if ntIP == "" {
		return ""
	}

	// Build target with optional port
	if nr.NATtoPort != "" {
		if port := sanitizePort(nr.NATtoPort); port != "" {
			return ntIP + ":" + port
		}
	}
	return ntIP
}

// buildDNATTarget constructs the target IP:port for DNAT rules
// Returns IP[:port] for use with --to-destination flag
func (d *IptablesDriver) buildDNATTarget(nr *models.NATRule) string {
	ntIP := sanitizeCIDR(nr.NATtoIP)
	if ntIP == "" {
		return ""
	}

	// Build target with optional port
	if nr.NATtoPort != "" {
		if port := sanitizePort(nr.NATtoPort); port != "" {
			return ntIP + ":" + port
		}
	}
	return ntIP
}

// GetCounters reads counters from the live ruleset using iptables-save.
func (d *IptablesDriver) GetCounters() ([]*models.Counter, error) {
	raw, err := d.Load()
	if err != nil {
		return nil, err
	}
	return d.parseCounters(raw), nil
}

// GetInterfaces returns a list of network interfaces on the system.
func (d *IptablesDriver) GetInterfaces() ([]*models.Interface, error) {
	ifaces, err := net.Interfaces()
	if err != nil {
		return nil, fmt.Errorf("failed to get system network interfaces: %w", err)
	}

	var out []*models.Interface
	for _, i := range ifaces {
		out = append(out, &models.Interface{Name: i.Name})
	}

	return out, nil
}

// GetInterfaceCounters returns counters for a specific interface.
func (d *IptablesDriver) GetInterfaceCounters(iface string) (*models.InterfaceCounters, error) {
	sIface := sanitizeInterface(iface)
	if sIface == "" {
		return nil, fmt.Errorf("invalid interface name provided")
	}

	counters := &models.InterfaceCounters{}

	// Get INPUT chain counters
	inCounters, err := d.getChainCounters("INPUT", "in", sIface)
	if err != nil {
		return nil, fmt.Errorf("failed to get INPUT counters for %s: %w", sIface, err)
	}
	counters.In = inCounters

	// Get OUTPUT chain counters
	outCounters, err := d.getChainCounters("OUTPUT", "out", sIface)
	if err != nil {
		return nil, fmt.Errorf("failed to get OUTPUT counters for %s: %w", sIface, err)
	}
	counters.Out = outCounters
	
	// Get FORWARD chain drop counters
	dropCounters, err := d.getChainCounters("FORWARD", "any", sIface)
	if err != nil {
		return nil, fmt.Errorf("failed to get FORWARD counters for %s: %w", sIface, err)
	}
	counters.Drop = dropCounters

	return counters, nil
}

// getChainCounters executes `iptables -L <chain> -v -n` and parses the byte/packet counts.
func (d *IptablesDriver) getChainCounters(chain, direction, iface string) (models.CounterStats, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	args := []string{"-L", chain, "-v", "-n"}
	if direction == "in" {
		args = append(args, "-i", iface)
	} else if direction == "out" {
		args = append(args, "-o", iface)
	}

	cmd := exec.CommandContext(ctx, "/sbin/iptables", args...)
	var out, stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		// some old iptables versions complain if you filter by interface on a chain that doesn't have any rules for it.
		// we can ignore this error and return zero counters.
		if strings.Contains(stderr.String(), "No such file or directory") {
			return models.CounterStats{}, nil
		}
		return models.CounterStats{}, fmt.Errorf("iptables -L failed for %s on %s: %w — %s", chain, iface, err, stderr.String())
	}

	return d.parseInterfaceCounters(out.String()), nil
}

// parseInterfaceCounters parses the verbose output of `iptables -L -v -n`.
func (d *IptablesDriver) parseInterfaceCounters(raw string) models.CounterStats {
	lines := strings.Split(raw, "\n")
	var totalPkts, totalBytes uint64

	// Skip header lines
	for _, line := range lines[2:] {
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}

		pkts, err := strconv.ParseUint(fields[0], 10, 64)
		if err != nil {
			d.log.WithError(err).WithField("line", line).Warn("failed to parse packet count")
			continue
		}
		totalPkts += pkts

		bytes, err := strconv.ParseUint(fields[1], 10, 64)
		if err != nil {
			d.log.WithError(err).WithField("line", line).Warn("failed to parse byte count")
			continue
		}
		totalBytes += bytes
	}

	return models.CounterStats{
		Packets: totalPkts,
		Bytes:   totalBytes,
	}
}

// buildRuleset produces an iptables-save-compatible text block from abstract rules.
// All values are sanitized before being written — no raw user input ever enters a command.
func (d *IptablesDriver) buildRuleset(rules []*models.Rule) string {
	var sb strings.Builder

	sb.WriteString("*filter\n")
	sb.WriteString(":INPUT ACCEPT [0:0]\n")
	sb.WriteString(":FORWARD DROP [0:0]\n")
	sb.WriteString(":OUTPUT ACCEPT [0:0]\n")

	for _, r := range rules {
		if !r.Enabled {
			continue
		}
		line := d.ruleToIptablesLine(r)
		if line != "" {
			sb.WriteString(line)
			sb.WriteString("\n")
		}
	}

	sb.WriteString("COMMIT\n")
	return sb.String()
}

// ruleToIptablesLine converts a Rule to an iptables-restore rule line.
// Each field is written via explicit format functions — never interpolated from raw input.
func (d *IptablesDriver) ruleToIptablesLine(r *models.Rule) string {
	var parts []string

	parts = append(parts, "-A", string(r.Chain))

	proto := sanitizeProtocol(r.Protocol)
	if proto != "" && proto != "all" {
		parts = append(parts, "-p", proto)
	}

	if src := sanitizeCIDR(r.Src); src != "" {
		parts = append(parts, "-s", src)
	}

	if dst := sanitizeCIDR(r.Dst); dst != "" {
		parts = append(parts, "-d", dst)
	}

	if r.SrcPort != "" && proto != "" && proto != "icmp" && proto != "all" {
		if port := sanitizePort(r.SrcPort); port != "" {
			parts = append(parts, "--sport", port)
		}
	}

	if r.DstPort != "" && proto != "" && proto != "icmp" && proto != "all" {
		if port := sanitizePort(r.DstPort); port != "" {
			parts = append(parts, "--dport", port)
		}
	}

	if r.Comment != "" {
		comment := sanitizeComment(r.Comment)
		if comment != "" {
			parts = append(parts, "-m", "comment", "--comment", comment)
		}
	}

	action := sanitizeAction(r.Action)
	if action == "" {
		d.log.WithField("rule_id", r.ID).Warn("rule has invalid action, skipping")
		return ""
	}
	parts = append(parts, "-j", action)

	return strings.Join(parts, " ")
}

// parseCounters extracts [packets:bytes] counters from iptables-save output.
func (d *IptablesDriver) parseCounters(raw string) []*models.Counter {
	var counters []*models.Counter
	lines := strings.Split(raw, "\n")

	var currentChain models.Chain
	for _, line := range lines {
		line = strings.TrimSpace(line)

		// Chain policy line: ":INPUT ACCEPT [1234:56789]"
		if strings.HasPrefix(line, ":") {
			fields := strings.Fields(line)
			if len(fields) >= 3 {
				chainName := strings.TrimPrefix(fields[0], ":")
				currentChain = models.Chain(chainName)
				pkts, bytes_ := parseCounterBracket(fields[2])
				counters = append(counters, &models.Counter{
					Chain:   currentChain,
					Rule:    "policy",
					Packets: pkts,
					Bytes:   bytes_,
				})
			}
			continue
		}

		// Rule line with counter: "[100:4096] -A INPUT ..."
		if strings.HasPrefix(line, "[") {
			bracket := line[:strings.Index(line, "]")+1]
			rest := strings.TrimSpace(line[len(bracket):])
			pkts, bytes_ := parseCounterBracket(bracket)
			counters = append(counters, &models.Counter{
				Chain:   currentChain,
				Rule:    rest,
				Packets: pkts,
				Bytes:   bytes_,
			})
		}
	}

	return counters
}

func parseCounterBracket(s string) (uint64, uint64) {
	s = strings.Trim(s, "[]")
	parts := strings.Split(s, ":")
	if len(parts) != 2 {
		return 0, 0
	}
	pkts, _ := strconv.ParseUint(strings.TrimSpace(parts[0]), 10, 64)
	bytes_, _ := strconv.ParseUint(strings.TrimSpace(parts[1]), 10, 64)
	return pkts, bytes_
}

// --- Sanitization helpers ---
// These functions ensure only allowlisted values reach the iptables command.

var allowedChains = map[models.Chain]bool{
	models.ChainINPUT:   true,
	models.ChainOUTPUT:  true,
	models.ChainFORWARD: true,
}

func sanitizeProtocol(p models.Protocol) string {
	switch p {
	case models.ProtocolTCP, models.ProtocolUDP, models.ProtocolICMP, models.ProtocolAll:
		return string(p)
	}
	return ""
}

func sanitizeAction(a models.Action) string {
	switch a {
	case models.ActionACCEPT, models.ActionDROP, models.ActionREJECT, models.ActionLOG:
		return string(a)
	}
	return ""
}

// sanitizeCIDR validates that the input looks like a valid CIDR or IP.
// Rejects anything with special characters to prevent injection.
func sanitizeCIDR(s string) string {
	if s == "" {
		return ""
	}
	for _, c := range s {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F') ||
			c == '.' || c == ':' || c == '/') {
			return ""
		}
	}
	return s
}

// sanitizePort validates port numbers and ranges like "80" or "1024:65535".
func sanitizePort(s string) string {
	if s == "" {
		return ""
	}
	parts := strings.SplitN(s, ":", 2)
	for _, p := range parts {
		n, err := strconv.ParseUint(p, 10, 16)
		if err != nil || n == 0 || n > 65535 {
			return ""
		}
	}
	return s
}

// sanitizeComment strips any characters that could escape the iptables comment field.
func sanitizeComment(s string) string {
	var sb strings.Builder
	for _, c := range s {
		if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
			(c >= '0' && c <= '9') || c == ' ' || c == '-' || c == '_' || c == '.' {
			sb.WriteRune(c)
		}
	}
	result := strings.TrimSpace(sb.String())
	if len(result) > 128 {
		result = result[:128]
	}
	return result
}

// sanitizeInterface validates interface names (eth0, wlan0, etc.)
func sanitizeInterface(s string) string {
	if s == "" {
		return ""
	}
	// Allow alphanumeric and some special chars common in interface names
	for _, c := range s {
		if !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
			(c >= '0' && c <= '9') || c == '-' || c == '_' || c == '+') {
			return ""
		}
	}
	if len(s) > 15 { // Max linux interface name length
		return ""
	}
	return s
}
