package service

import (
	"context"
	"fmt"
	"time"

	"github.com/firewall-manager/backend/internal/firewall"
	"github.com/firewall-manager/backend/internal/models"
	"github.com/firewall-manager/backend/internal/repository"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

// CreateRuleDTO is the input for creating a rule — no raw iptables exposed.
type CreateRuleDTO struct {
	Chain    models.Chain    `json:"chain" binding:"required"`
	Protocol models.Protocol `json:"protocol" binding:"required"`
	Src      string          `json:"src"`
	Dst      string          `json:"dst"`
	SrcPort  string          `json:"srcPort"`
	DstPort  string          `json:"dstPort"`
	Action   models.Action   `json:"action" binding:"required"`
	Enabled  bool            `json:"enabled"`
	Comment  string          `json:"comment"`
	Position int             `json:"position"`
}

// UpdateRuleDTO is the input for updating a rule.
type UpdateRuleDTO struct {
	Chain    models.Chain    `json:"chain" binding:"required"`
	Protocol models.Protocol `json:"protocol" binding:"required"`
	Src      string          `json:"src"`
	Dst      string          `json:"dst"`
	SrcPort  string          `json:"srcPort"`
	DstPort  string          `json:"dstPort"`
	Action   models.Action   `json:"action" binding:"required"`
	Enabled  bool            `json:"enabled"`
	Comment  string          `json:"comment"`
	Position int             `json:"position"`
}

type FirewallService interface {
	ListRules(ctx context.Context) ([]*models.Rule, error)
	CreateRule(ctx context.Context, dto CreateRuleDTO) (*models.Rule, error)
	UpdateRule(ctx context.Context, id string, dto UpdateRuleDTO) (*models.Rule, error)
	DeleteRule(ctx context.Context, id string) error
	ApplyRules(ctx context.Context) error
	Rollback(ctx context.Context) error
	GetCounters(ctx context.Context) ([]*models.Counter, error)
}

type firewallService struct {
	rules    repository.RuleRepository
	history  repository.HistoryRepository
	config   repository.ConfigRepository
	natRules repository.NATRuleRepository
	driver   firewall.FirewallDriver
	log      *logrus.Logger
}

func NewFirewallService(
	rules repository.RuleRepository,
	history repository.HistoryRepository,
	driver firewall.FirewallDriver,
	log *logrus.Logger,
) FirewallService {
	return &firewallService{
		rules:   rules,
		history: history,
		driver:  driver,
		log:     log,
	}
}

func NewFirewallServiceWithConfig(
	rules repository.RuleRepository,
	history repository.HistoryRepository,
	config repository.ConfigRepository,
	natRules repository.NATRuleRepository,
	driver firewall.FirewallDriver,
	log *logrus.Logger,
) FirewallService {
	return &firewallService{
		rules:    rules,
		history:  history,
		config:   config,
		natRules: natRules,
		driver:   driver,
		log:      log,
	}
}

func (s *firewallService) ListRules(_ context.Context) ([]*models.Rule, error) {
	return s.rules.List()
}

func (s *firewallService) CreateRule(_ context.Context, dto CreateRuleDTO) (*models.Rule, error) {
	if err := validateDTO(dto.Chain, dto.Protocol, dto.Action, dto.Src, dto.Dst, dto.SrcPort, dto.DstPort); err != nil {
		return nil, err
	}

	now := time.Now()
	rule := &models.Rule{
		ID:        uuid.New().String(),
		Chain:     dto.Chain,
		Protocol:  dto.Protocol,
		Src:       dto.Src,
		Dst:       dto.Dst,
		SrcPort:   dto.SrcPort,
		DstPort:   dto.DstPort,
		Action:    dto.Action,
		Enabled:   dto.Enabled,
		Comment:   dto.Comment,
		Position:  dto.Position,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.rules.Create(rule); err != nil {
		return nil, fmt.Errorf("create rule: %w", err)
	}

	s.log.WithField("rule_id", rule.ID).Info("rule created")
	return rule, nil
}

func (s *firewallService) UpdateRule(_ context.Context, id string, dto UpdateRuleDTO) (*models.Rule, error) {
	if err := validateDTO(dto.Chain, dto.Protocol, dto.Action, dto.Src, dto.Dst, dto.SrcPort, dto.DstPort); err != nil {
		return nil, err
	}

	existing, err := s.rules.GetByID(id)
	if err != nil {
		return nil, err
	}

	existing.Chain = dto.Chain
	existing.Protocol = dto.Protocol
	existing.Src = dto.Src
	existing.Dst = dto.Dst
	existing.SrcPort = dto.SrcPort
	existing.DstPort = dto.DstPort
	existing.Action = dto.Action
	existing.Enabled = dto.Enabled
	existing.Comment = dto.Comment
	existing.Position = dto.Position

	if err := s.rules.Update(existing); err != nil {
		return nil, fmt.Errorf("update rule: %w", err)
	}

	s.log.WithField("rule_id", id).Info("rule updated")
	return existing, nil
}

func (s *firewallService) DeleteRule(_ context.Context, id string) error {
	if err := s.rules.Delete(id); err != nil {
		return fmt.Errorf("delete rule: %w", err)
	}
	s.log.WithField("rule_id", id).Info("rule deleted")
	return nil
}

func (s *firewallService) ApplyRules(_ context.Context) error {
	// Snapshot current live state before applying (for rollback).
	snapshot, err := s.driver.Load()
	if err != nil {
		s.log.WithError(err).Warn("could not snapshot current ruleset before apply")
		snapshot = ""
	}

	rules, err := s.rules.List()
	if err != nil {
		return fmt.Errorf("load rules from db: %w", err)
	}

	if err := s.driver.Apply(rules); err != nil {
		return fmt.Errorf("apply rules to kernel: %w", err)
	}

	// Apply firewall configuration (IP forwarding, etc.)
	if s.config != nil {
		cfg, err := s.config.Get()
		if err != nil {
			s.log.WithError(err).Warn("could not load firewall config")
		} else if err := s.driver.ApplyConfig(cfg); err != nil {
			s.log.WithError(err).Warn("failed to apply firewall config")
		}
	}

	// Apply NAT rules if enabled
	if s.natRules != nil {
		natRules, err := s.natRules.List()
		if err != nil {
			s.log.WithError(err).Warn("could not load NAT rules")
		} else if err := s.driver.ApplyNAT(natRules); err != nil {
			s.log.WithError(err).Warn("failed to apply NAT rules")
		}
	}

	// Persist snapshot to history after successful apply.
	if snapshot != "" {
		entry := &models.HistoryEntry{
			ID:          uuid.New().String(),
			Snapshot:    snapshot,
			Description: fmt.Sprintf("snapshot before apply at %s", time.Now().Format(time.RFC3339)),
			AppliedAt:   time.Now(),
		}
		if err := s.history.Save(entry); err != nil {
			s.log.WithError(err).Warn("could not save history entry")
		}
	}

	s.log.WithField("rule_count", len(rules)).Info("ruleset applied to kernel")
	return nil
}

func (s *firewallService) Rollback(_ context.Context) error {
	entry, err := s.history.Latest()
	if err != nil {
		return fmt.Errorf("no snapshot to rollback to: %w", err)
	}

	cmd := rollbackFromSnapshot(entry.Snapshot)
	if err := cmd(); err != nil {
		return fmt.Errorf("rollback failed: %w", err)
	}

	s.log.WithField("history_id", entry.ID).Info("rolled back to previous snapshot")
	return nil
}

func (s *firewallService) GetCounters(_ context.Context) ([]*models.Counter, error) {
	return s.driver.GetCounters()
}

// rollbackFromSnapshot delegates to restoreSnapshot (defined in rollback.go).
func rollbackFromSnapshot(snapshot string) func() error {
	return restoreSnapshot(snapshot)
}

// validateDTO checks all field values against allowlists.
func validateDTO(chain models.Chain, proto models.Protocol, action models.Action, src, dst, srcPort, dstPort string) error {
	validChains := map[models.Chain]bool{
		models.ChainINPUT: true, models.ChainOUTPUT: true, models.ChainFORWARD: true,
	}
	if !validChains[chain] {
		return fmt.Errorf("invalid chain: %s", chain)
	}

	validProtos := map[models.Protocol]bool{
		models.ProtocolTCP: true, models.ProtocolUDP: true,
		models.ProtocolICMP: true, models.ProtocolAll: true,
	}
	if !validProtos[proto] {
		return fmt.Errorf("invalid protocol: %s", proto)
	}

	validActions := map[models.Action]bool{
		models.ActionACCEPT: true, models.ActionDROP: true,
		models.ActionREJECT: true, models.ActionLOG: true,
	}
	if !validActions[action] {
		return fmt.Errorf("invalid action: %s", action)
	}

	return nil
}
