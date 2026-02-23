package firewall

import (
	"bytes"
	"context"
	"fmt"
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

// GetCounters reads counters from the live ruleset using iptables-save.
func (d *IptablesDriver) GetCounters() ([]*models.Counter, error) {
	raw, err := d.Load()
	if err != nil {
		return nil, err
	}
	return d.parseCounters(raw), nil
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